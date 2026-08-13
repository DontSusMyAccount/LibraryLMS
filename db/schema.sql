-- ============================================================================
-- Library Management System (LMS) — PostgreSQL Schema
-- ============================================================================
-- อ้างอิง: library-system-requirements.md (Section 7)
-- ต่อยอดจาก draft เดิม เพิ่ม:
--   1. borrowing_policies รองรับ (role, member_type) — แยกปริญญาตรี/บัณฑิตศึกษา
--   2. loans เก็บ snapshot loan_period_days + daily_fine_rate ตอนยืม
--      (policy เปลี่ยนทีหลัง ไม่กระทบประวัติการยืมเดิม)
--   3. loans.recalled_at สำหรับกรณี recall (เรียกคืนก่อนกำหนด)
--   4. loans.course_reserve_id โยงการยืมหนังสือสำรองวิชาเรียน
--   5. partial unique index กัน copy ค้างยืมซ้ำ / จองซ้ำเล่มเดียวกัน
--   6. system_settings สำหรับค่าที่ปรับได้โดยไม่แก้โค้ด (วันแจ้งเตือนล่วงหน้า ฯลฯ)
--   7. trigger อัปเดต updated_at อัตโนมัติ + CHECK constraints
--   8. seed ข้อมูลตั้งต้น (borrowing_policies, หมวดหมู่, settings)
--   9. ใช้ pg_trgm GIN index แทน tsvector('simple') เพราะภาษาไทยไม่มี
--      ตัวแบ่งคำ ช่องว่าง — ค้นหาแบบ ILIKE '%คำ%' ได้ผลกับไทยกว่า
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- Thai-friendly search

-- ----------------------------------------------------------------------------
-- Enum types
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'librarian', 'faculty', 'staff', 'student');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'graduated', 'inactive');
CREATE TYPE copy_status AS ENUM ('available', 'borrowed', 'reserved', 'lost', 'damaged', 'withdrawn');
CREATE TYPE loan_status AS ENUM ('active', 'returned', 'overdue', 'lost');
CREATE TYPE reservation_status AS ENUM ('waiting', 'ready', 'fulfilled', 'expired', 'cancelled', 'suspended');
CREATE TYPE fine_reason AS ENUM ('overdue', 'lost', 'damaged');
CREATE TYPE notification_type AS ENUM ('due_reminder', 'overdue', 'reservation_ready');
CREATE TYPE notification_channel AS ENUM ('email', 'line');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

-- ----------------------------------------------------------------------------
-- วิทยาเขต/สาขา
-- ----------------------------------------------------------------------------
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE branches IS 'วิทยาเขต/สาขาห้องสมุด — ผูกกับผู้ใช้ (home branch) และสำเนาหนังสือ (ที่ตั้งจริง)';

-- ----------------------------------------------------------------------------
-- หมวดหมู่หนังสือ (รองรับหมวดหมู่ย่อยผ่าน parent_id)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE categories IS 'หมวดหมู่หนังสือ รองรับ parent-child (เช่น 600 เทคโนโลยี → 600.1 คอมพิวเตอร์)';

-- ----------------------------------------------------------------------------
-- ผู้ใช้งาน (ทุกบทบาท)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  member_type VARCHAR(20) NOT NULL DEFAULT 'general'
    CHECK (member_type IN ('general', 'undergraduate', 'graduate')),
  student_or_staff_id VARCHAR(50) UNIQUE,
  phone VARCHAR(20),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_branch ON users(branch_id);
COMMENT ON TABLE users IS 'ผู้ใช้ทุกบทบาท; member_type ใช้แยกสิทธิ์นักศึกษา ป.ตรี/บัณฑิตศึกษา ตามข้อกำหนด 6';

-- ----------------------------------------------------------------------------
-- นโยบายการยืมแยกตาม (role, member_type) — ปรับค่าได้โดยไม่ต้องแก้โค้ด
-- ----------------------------------------------------------------------------
CREATE TABLE borrowing_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  member_type VARCHAR(20) NOT NULL DEFAULT 'general'
    CHECK (member_type IN ('general', 'undergraduate', 'graduate')),
  max_active_loans INT NOT NULL DEFAULT 5 CHECK (max_active_loans >= 0),
  loan_period_days INT NOT NULL DEFAULT 14 CHECK (loan_period_days > 0),
  max_renewals INT NOT NULL DEFAULT 2 CHECK (max_renewals >= 0),
  grace_period_days INT NOT NULL DEFAULT 3 CHECK (grace_period_days >= 0),
  daily_fine_rate NUMERIC(10,2) NOT NULL DEFAULT 5.00 CHECK (daily_fine_rate >= 0),
  max_unpaid_fine NUMERIC(10,2) NOT NULL DEFAULT 100.00 CHECK (max_unpaid_fine >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, member_type)
);
COMMENT ON TABLE borrowing_policies IS 'สิทธิ์การยืมแยกตามบทบาท+สถานภาพ; UNIQUE(role, member_type) กัน policy ซ้ำ';

-- ----------------------------------------------------------------------------
-- ค่าตั้งค่าระบบ (กัน hardcode ในโค้ด)
-- ----------------------------------------------------------------------------
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE system_settings IS 'ค่าปรับแต่งระบบ เช่น จำนวนวันแจ้งเตือนล่วงหน้า, ระยะเวลามารับหนังสือที่จอง';

-- ----------------------------------------------------------------------------
-- ระเบียนบรรณานุกรม (title) — 1 title มีได้หลายสำเนา
-- ----------------------------------------------------------------------------
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn VARCHAR(20),
  title VARCHAR(300) NOT NULL,
  author VARCHAR(200) NOT NULL,
  publisher VARCHAR(200),
  language VARCHAR(50) DEFAULT 'th',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  cover_url TEXT,
  published_year INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ค้นหาแบบยืดหยุ่น: ใช้ pg_trgm + ILIKE ดีกว่า tsvector('simple') สำหรับภาษาไทย
CREATE INDEX idx_books_title_trgm ON books USING GIN (title gin_trgm_ops);
CREATE INDEX idx_books_author_trgm ON books USING GIN (author gin_trgm_ops);
CREATE INDEX idx_books_category ON books(category_id);
COMMENT ON TABLE books IS 'ระเบียนบรรณานุกรม (title) — แยกจากสำเนาจริงแต่ละเล่ม (book_copies) ตามแนวทาง ILS';

-- ----------------------------------------------------------------------------
-- สำเนาจริงแต่ละเล่ม
-- ----------------------------------------------------------------------------
CREATE TABLE book_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  copy_code VARCHAR(50) NOT NULL UNIQUE,
  status copy_status NOT NULL DEFAULT 'available',
  shelf_location VARCHAR(50),
  acquired_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_book_copies_status ON book_copies(status);
CREATE INDEX idx_book_copies_book ON book_copies(book_id);
CREATE INDEX idx_book_copies_branch ON book_copies(branch_id);
COMMENT ON TABLE book_copies IS 'สำเนาจริงแต่ละเล่ม พร้อมสถานะ (ว่าง/ถูกยืม/สูญหาย/ชำรุด) และตำแหน่งชั้นวาง';

-- ----------------------------------------------------------------------------
-- หนังสือสำรองสำหรับวิชาเรียน (course reserve) — ยืมระยะสั้นเป็นพิเศษ
-- ----------------------------------------------------------------------------
CREATE TABLE course_reserves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id UUID NOT NULL REFERENCES book_copies(id) ON DELETE CASCADE,
  course_code VARCHAR(30) NOT NULL,
  course_name VARCHAR(200),
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  loan_period_hours INT NOT NULL DEFAULT 3 CHECK (loan_period_hours > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX idx_course_reserves_copy ON course_reserves(copy_id);
CREATE INDEX idx_course_reserves_course ON course_reserves(course_code);
COMMENT ON TABLE course_reserves IS 'หนังสือที่อาจารย์ตั้งสำรองสำหรับวิชาเรียน ยืมได้ชั่วโมงเดียว/ไม่กี่วัน';

-- ----------------------------------------------------------------------------
-- ธุรกรรมยืม-คืน
-- ----------------------------------------------------------------------------
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id UUID NOT NULL REFERENCES book_copies(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_reserve_id UUID REFERENCES course_reserves(id) ON DELETE SET NULL,
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  status loan_status NOT NULL DEFAULT 'active',
  renewed_count INT NOT NULL DEFAULT 0 CHECK (renewed_count >= 0),
  recalled_at TIMESTAMPTZ,           -- วันที่ถูกเรียกคืนก่อนกำหนด (recall)
  loan_period_days INT NOT NULL DEFAULT 14 CHECK (loan_period_days > 0),   -- snapshot ตอนยืม
  daily_fine_rate NUMERIC(10,2) NOT NULL DEFAULT 5.00 CHECK (daily_fine_rate >= 0), -- snapshot
  checked_out_by UUID REFERENCES users(id) ON DELETE SET NULL,  -- บรรณารักษ์ผู้ดำเนินการ (ถ้าไม่ใช่เจ้าของ)
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (due_at > borrowed_at),
  CHECK (returned_at IS NULL OR returned_at >= borrowed_at)
);
CREATE INDEX idx_loans_user ON loans(user_id);
CREATE INDEX idx_loans_copy ON loans(copy_id);
CREATE INDEX idx_loans_status_due ON loans(status, due_at);
CREATE INDEX idx_loans_course_reserve ON loans(course_reserve_id);
-- สำเนาเดียวกันห้ามมี loan ที่ยัง active เกิน 1 รายการ (กันยืมซ้ำ)
CREATE UNIQUE INDEX uq_loans_active_copy ON loans(copy_id) WHERE status = 'active';
COMMENT ON TABLE loans IS 'ธุรกรรมยืม-คืน; เก็บ snapshot นโยบายตอนยืมไว้เพื่อความถูกต้องทางประวัติ (NFR: data accuracy)';

-- ----------------------------------------------------------------------------
-- การจอง (hold queue) — FIFO เรียงตาม reserved_at
-- ----------------------------------------------------------------------------
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status reservation_status NOT NULL DEFAULT 'waiting',
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at TIMESTAMPTZ,
  pickup_deadline TIMESTAMPTZ,
  fulfilled_loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ready_at IS NULL OR pickup_deadline IS NULL OR pickup_deadline > ready_at)
);
CREATE INDEX idx_reservations_book_status ON reservations(book_id, status);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_branch ON reservations(branch_id);
-- ผู้ใช้คนหนึ่งจองเล่มเดียวกันซ้ำไม่ได้ ขณะที่ยังอยู่ในคิว (waiting/ready/suspended)
CREATE UNIQUE INDEX uq_reservations_active_user_book
  ON reservations(user_id, book_id) WHERE status IN ('waiting', 'ready', 'suspended');
COMMENT ON TABLE reservations IS 'คิวจองแบบ FIFO; ตำแหน่งคิวคำนวณจาก reserved_at — ไม่ต้องเก็บเลขคิว';

-- ----------------------------------------------------------------------------
-- ค่าปรับ
-- ----------------------------------------------------------------------------
CREATE TABLE fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,   -- กรณี overdue
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  reason fine_reason NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  waived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT paid OR paid_at IS NOT NULL)  -- จ่ายแล้วต้องมีวัน-เวลาที่จ่าย
);
CREATE INDEX idx_fines_user_paid ON fines(user_id, paid);
CREATE INDEX idx_fines_loan ON fines(loan_id);
COMMENT ON TABLE fines IS 'ค่าปรับ; overdue ผูกกับ loan, กรณีสูญหาย/ชำรุดสร้างแยกโดยไม่มี loan_id';

-- ----------------------------------------------------------------------------
-- ประวัติการแจ้งเตือน
-- ----------------------------------------------------------------------------
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  reference_id UUID,                 -- เช่น loan_id / reservation_id
  status notification_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_pending ON notification_logs(status) WHERE status = 'pending';
COMMENT ON TABLE notification_logs IS 'ประวัติการแจ้งเตือน กันส่งซ้ำ (worker อ่าน status=pending) และใช้ตรวจสอบ';

-- ----------------------------------------------------------------------------
-- Audit log (accountability + PDPA)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
COMMENT ON TABLE audit_logs IS 'บันทึกทุก action สำคัญ (ยืม/คืน/แก้ไข/เข้าถึงข้อมูลส่วนบุคคล) — ใช้ตรวจสอบย้อนหลังตาม PDPA';

-- ----------------------------------------------------------------------------
-- Trigger: อัปเดต updated_at อัตโนมัติ
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_books_updated BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_system_settings_updated BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Seed data (ข้อมูลตั้งต้น)
-- ============================================================================

-- นโยบายการยืมเริ่มต้น (อ้างอิงแนวทางห้องสมุดมหาวิทยาลัยจริงจาก requirements)
INSERT INTO borrowing_policies
  (role, member_type, max_active_loans, loan_period_days, max_renewals,
   grace_period_days, daily_fine_rate, max_unpaid_fine) VALUES
  ('admin',     'general',      50, 180, 10, 3, 5.00, 500.00),
  ('librarian', 'general',      30,  90,  6, 3, 5.00, 200.00),
  ('faculty',   'general',      20,  60,  6, 3, 5.00, 200.00),
  ('staff',     'general',      10,  30,  4, 3, 5.00, 200.00),
  ('student',   'undergraduate', 5,  14,  2, 3, 5.00, 100.00),
  ('student',   'graduate',      8,  21,  3, 3, 5.00, 100.00);

-- หมวดหมู่หลัก (Dewey 10 หมวด)
INSERT INTO categories (name) VALUES
  ('คอมพิวเตอร์ วิทยาการสารสนเทศ'),  -- 000
  ('ปรัชญา จิตวิทยา'),              -- 100
  ('ศาสนา'),                        -- 200
  ('สังคมศาสตร์'),                   -- 300
  ('ภาษา'),                         -- 400
  ('วิทยาศาสตร์'),                   -- 500
  ('เทคโนโลยี วิศวกรรม'),           -- 600
  ('ศิลปะ นันทนาการ'),              -- 700
  ('วรรณกรรม'),                     -- 800
  ('ประวัติศาสตร์ ภูมิศาสตร์');      -- 900

-- ค่าตั้งค่าระบบเริ่มต้น
INSERT INTO system_settings (key, value, description) VALUES
  ('reminder_days_before_due',       '2',             'แจ้งเตือนก่อนครบกำหนดคืนกี่วัน'),
  ('overdue_reminder_interval_days', '1',             'แจ้งเตือน overdue ซ้ำทุกกี่วัน'),
  ('reservation_pickup_days',        '3',             'กำหนดมารับหนังสือที่จองภายในกี่วัน'),
  ('max_active_reservations',        '5',             'จองพร้อมกันได้สูงสุดกี่รายการ'),
  ('allow_renew_with_hold',          'false',         'อนุญาตต่ออายุเมื่อมีคนจองคิวอยู่หรือไม่'),
  ('recall_due_shorten_days',        '7',             'recall ย่นวันครบกำหนดเหลืออีกกี่วัน');
