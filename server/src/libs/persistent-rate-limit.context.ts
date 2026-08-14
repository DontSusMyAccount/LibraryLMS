import { DefaultContext, type Options } from "elysia-rate-limit";

/**
 * DefaultContext เวอร์ชันสำหรับ Cloudflare Workers ที่ต้อง build app ใหม่ทุก request
 *
 * ปัญหา: elysia-rate-limit เรียก `context.init()` ทุกครั้งที่ `.use(rateLimit(...))`
 * ทำงาน (ทุกครั้งที่ build app) และ `DefaultContext.init()` สร้าง `store` ใหม่เสมอ
 * → ถ้า build app ใหม่ทุก request (ตามคำแนะนำ Cloudflare สำหรับ Hyperdrive —
 * ต้องสร้าง DB client ใหม่ทุก request ห้าม cache เป็น global) store ของ rate-limit
 * จะถูกรีเซ็ตทุก request = rate limit ใช้งานไม่ได้เงียบๆ
 *
 * วิธีแก้: init เฉพาะครั้งแรกเท่านั้น — store อยู่ระดับ module (per isolate)
 * ซึ่งเหมือนพฤติกรรมเดิมตอนที่ cached app อยู่แล้ว (rate limit เป็น per-isolate
 * ไม่เคยแม่นยำข้าม isolate อยู่แล้ว)
 */
export class PersistentDefaultContext extends DefaultContext {
  private initialized = false;

  override init(options: Omit<Options, "context">): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    super.init(options);
  }
}
