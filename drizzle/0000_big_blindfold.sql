CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."copy_status" AS ENUM('available', 'borrowed', 'reserved', 'lost', 'damaged', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."fine_reason" AS ENUM('overdue', 'lost', 'damaged');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('active', 'returned', 'overdue', 'lost');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'line');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('due_reminder', 'overdue', 'reservation_ready');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('waiting', 'ready', 'fulfilled', 'expired', 'cancelled', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'librarian', 'faculty', 'staff', 'student');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'graduated', 'inactive');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_copies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"branch_id" uuid,
	"copy_code" varchar(50) NOT NULL,
	"status" "copy_status" DEFAULT 'available' NOT NULL,
	"shelf_location" varchar(50),
	"acquired_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_copies_copy_code_unique" UNIQUE("copy_code")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isbn" varchar(20),
	"title" varchar(300) NOT NULL,
	"author" varchar(200) NOT NULL,
	"publisher" varchar(200),
	"language" varchar(50) DEFAULT 'th',
	"category_id" uuid,
	"description" text,
	"cover_url" text,
	"published_year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "borrowing_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"member_type" varchar(20) DEFAULT 'general' NOT NULL,
	"max_active_loans" integer DEFAULT 5 NOT NULL,
	"loan_period_days" integer DEFAULT 14 NOT NULL,
	"max_renewals" integer DEFAULT 2 NOT NULL,
	"grace_period_days" integer DEFAULT 3 NOT NULL,
	"daily_fine_rate" numeric(10, 2) DEFAULT '5.00' NOT NULL,
	"max_unpaid_fine" numeric(10, 2) DEFAULT '100.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_borrowing_policies_role_member_type" UNIQUE("role","member_type"),
	CONSTRAINT "chk_borrowing_policies_member_type" CHECK ("borrowing_policies"."member_type" IN ('general', 'undergraduate', 'graduate')),
	CONSTRAINT "chk_borrowing_policies_max_active_loans" CHECK ("borrowing_policies"."max_active_loans" >= 0),
	CONSTRAINT "chk_borrowing_policies_loan_period_days" CHECK ("borrowing_policies"."loan_period_days" > 0),
	CONSTRAINT "chk_borrowing_policies_max_renewals" CHECK ("borrowing_policies"."max_renewals" >= 0),
	CONSTRAINT "chk_borrowing_policies_grace_period_days" CHECK ("borrowing_policies"."grace_period_days" >= 0),
	CONSTRAINT "chk_borrowing_policies_daily_fine_rate" CHECK ("borrowing_policies"."daily_fine_rate" >= 0),
	CONSTRAINT "chk_borrowing_policies_max_unpaid_fine" CHECK ("borrowing_policies"."max_unpaid_fine" >= 0)
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_reserves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"copy_id" uuid NOT NULL,
	"course_code" varchar(30) NOT NULL,
	"course_name" varchar(200),
	"instructor_id" uuid,
	"loan_period_hours" integer DEFAULT 3 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_course_reserves_loan_period_hours" CHECK ("course_reserves"."loan_period_hours" > 0),
	CONSTRAINT "chk_course_reserves_date_range" CHECK ("course_reserves"."end_date" >= "course_reserves"."start_date")
);
--> statement-breakpoint
CREATE TABLE "fines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid,
	"user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" "fine_reason" NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"waived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_fines_amount" CHECK ("fines"."amount" >= 0),
	CONSTRAINT "chk_fines_paid_has_paid_at" CHECK (NOT "fines"."paid" OR "fines"."paid_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"copy_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"course_reserve_id" uuid,
	"borrowed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"returned_at" timestamp with time zone,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"renewed_count" integer DEFAULT 0 NOT NULL,
	"recalled_at" timestamp with time zone,
	"loan_period_days" integer DEFAULT 14 NOT NULL,
	"daily_fine_rate" numeric(10, 2) DEFAULT '5.00' NOT NULL,
	"checked_out_by" uuid,
	"checked_in_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_loans_renewed_count" CHECK ("loans"."renewed_count" >= 0),
	CONSTRAINT "chk_loans_loan_period_days" CHECK ("loans"."loan_period_days" > 0),
	CONSTRAINT "chk_loans_daily_fine_rate" CHECK ("loans"."daily_fine_rate" >= 0),
	CONSTRAINT "chk_loans_due_after_borrow" CHECK ("loans"."due_at" > "loans"."borrowed_at"),
	CONSTRAINT "chk_loans_returned_after_borrow" CHECK ("loans"."returned_at" IS NULL OR "loans"."returned_at" >= "loans"."borrowed_at")
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"reference_id" uuid,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"branch_id" uuid,
	"status" "reservation_status" DEFAULT 'waiting' NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ready_at" timestamp with time zone,
	"pickup_deadline" timestamp with time zone,
	"fulfilled_loan_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_reservations_pickup_after_ready" CHECK ("reservations"."ready_at" IS NULL OR "reservations"."pickup_deadline" IS NULL OR "reservations"."pickup_deadline" > "reservations"."ready_at")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"member_type" varchar(20) DEFAULT 'general' NOT NULL,
	"student_or_staff_id" varchar(50),
	"phone" varchar(20),
	"branch_id" uuid,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_student_or_staff_id_unique" UNIQUE("student_or_staff_id"),
	CONSTRAINT "chk_users_member_type" CHECK ("users"."member_type" IN ('general', 'undergraduate', 'graduate'))
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reserves" ADD CONSTRAINT "course_reserves_copy_id_book_copies_id_fk" FOREIGN KEY ("copy_id") REFERENCES "public"."book_copies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reserves" ADD CONSTRAINT "course_reserves_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fines" ADD CONSTRAINT "fines_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fines" ADD CONSTRAINT "fines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_copy_id_book_copies_id_fk" FOREIGN KEY ("copy_id") REFERENCES "public"."book_copies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_course_reserve_id_course_reserves_id_fk" FOREIGN KEY ("course_reserve_id") REFERENCES "public"."course_reserves"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_checked_out_by_users_id_fk" FOREIGN KEY ("checked_out_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_fulfilled_loan_id_loans_id_fk" FOREIGN KEY ("fulfilled_loan_id") REFERENCES "public"."loans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_book_copies_status" ON "book_copies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_book_copies_book" ON "book_copies" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "idx_book_copies_branch" ON "book_copies" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_books_title_trgm" ON "books" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_books_author_trgm" ON "books" USING gin ("author" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_books_category" ON "books" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_course_reserves_copy" ON "course_reserves" USING btree ("copy_id");--> statement-breakpoint
CREATE INDEX "idx_course_reserves_course" ON "course_reserves" USING btree ("course_code");--> statement-breakpoint
CREATE INDEX "idx_fines_user_paid" ON "fines" USING btree ("user_id","paid");--> statement-breakpoint
CREATE INDEX "idx_fines_loan" ON "fines" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_loans_user" ON "loans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_loans_copy" ON "loans" USING btree ("copy_id");--> statement-breakpoint
CREATE INDEX "idx_loans_status_due" ON "loans" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "idx_loans_course_reserve" ON "loans" USING btree ("course_reserve_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_loans_active_copy" ON "loans" USING btree ("copy_id") WHERE "loans"."status" = 'active';--> statement-breakpoint
CREATE INDEX "idx_notification_logs_user" ON "notification_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_logs_pending" ON "notification_logs" USING btree ("status") WHERE "notification_logs"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_reservations_book_status" ON "reservations" USING btree ("book_id","status");--> statement-breakpoint
CREATE INDEX "idx_reservations_user" ON "reservations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_branch" ON "reservations" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reservations_active_user_book" ON "reservations" USING btree ("user_id","book_id") WHERE "reservations"."status" IN ('waiting', 'ready', 'suspended');--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_branch" ON "users" USING btree ("branch_id");--> statement-breakpoint
COMMENT ON TABLE "public"."branches" IS 'วิทยาเขต/สาขาห้องสมุด — ผูกกับผู้ใช้ (home branch) และสำเนาหนังสือ (ที่ตั้งจริง)';--> statement-breakpoint
COMMENT ON TABLE "public"."categories" IS 'หมวดหมู่หนังสือ รองรับ parent-child (เช่น 600 เทคโนโลยี → 600.1 คอมพิวเตอร์)';--> statement-breakpoint
COMMENT ON TABLE "public"."users" IS 'ผู้ใช้ทุกบทบาท; member_type ใช้แยกสิทธิ์นักศึกษา ป.ตรี/บัณฑิตศึกษา ตามข้อกำหนด 6';--> statement-breakpoint
COMMENT ON TABLE "public"."borrowing_policies" IS 'สิทธิ์การยืมแยกตามบทบาท+สถานภาพ; UNIQUE(role, member_type) กัน policy ซ้ำ';--> statement-breakpoint
COMMENT ON TABLE "public"."system_settings" IS 'ค่าปรับแต่งระบบ เช่น จำนวนวันแจ้งเตือนล่วงหน้า, ระยะเวลามารับหนังสือที่จอง';--> statement-breakpoint
COMMENT ON TABLE "public"."books" IS 'ระเบียนบรรณานุกรม (title) — แยกจากสำเนาจริงแต่ละเล่ม (book_copies) ตามแนวทาง ILS';--> statement-breakpoint
COMMENT ON TABLE "public"."book_copies" IS 'สำเนาจริงแต่ละเล่ม พร้อมสถานะ (ว่าง/ถูกยืม/สูญหาย/ชำรุด) และตำแหน่งชั้นวาง';--> statement-breakpoint
COMMENT ON TABLE "public"."course_reserves" IS 'หนังสือที่อาจารย์ตั้งสำรองสำหรับวิชาเรียน ยืมได้ชั่วโมงเดียว/ไม่กี่วัน';--> statement-breakpoint
COMMENT ON TABLE "public"."loans" IS 'ธุรกรรมยืม-คืน; เก็บ snapshot นโยบายตอนยืมไว้เพื่อความถูกต้องทางประวัติ (NFR: data accuracy)';--> statement-breakpoint
COMMENT ON TABLE "public"."reservations" IS 'คิวจองแบบ FIFO; ตำแหน่งคิวคำนวณจาก reserved_at — ไม่ต้องเก็บเลขคิว';--> statement-breakpoint
COMMENT ON TABLE "public"."fines" IS 'ค่าปรับ; overdue ผูกกับ loan, กรณีสูญหาย/ชำรุดสร้างแยกโดยไม่มี loan_id';--> statement-breakpoint
COMMENT ON TABLE "public"."notification_logs" IS 'ประวัติการแจ้งเตือน กันส่งซ้ำ (worker อ่าน status=pending) และใช้ตรวจสอบ';--> statement-breakpoint
COMMENT ON TABLE "public"."audit_logs" IS 'บันทึกทุก action สำคัญ (ยืม/คืน/แก้ไข/เข้าถึงข้อมูลส่วนบุคคล) — ใช้ตรวจสอบย้อนหลังตาม PDPA';