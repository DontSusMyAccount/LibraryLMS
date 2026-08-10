import { z } from "zod";

const DATABASE_URL_PATTERN = /^postgres(ql)?:\/\//;

const R2_REQUIRED_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.url().optional(),
);

const optionalSecret = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(32, "ต้องยาวอย่างน้อย 32 ตัวอักษร").optional(),
);

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(DATABASE_URL_PATTERN, "DATABASE_URL ต้องเริ่มต้นด้วย postgres:// หรือ postgresql://"),
  PORT: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.number().int().positive().default(3001),
  ),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร"),
  // JWT_SECRET: optional — ใช้ sign/verify Bearer tokens สำหรับ direct/mobile API access
  // ถ้าไม่ตั้ง จะ fallback ไปใช้ AUTH_SECRET (web ใช้ proxy headers ผ่าน INTERNAL_SECRET)
  JWT_SECRET: optionalSecret,
  INTERNAL_SECRET: z.string().min(16, "INTERNAL_SECRET ต้องยาวอย่างน้อย 16 ตัวอักษร"),
  NEXT_PUBLIC_API_URL: optionalUrl,
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET_NAME: optionalString,
  R2_PUBLIC_URL: optionalUrl,
});

export type EnvInput = z.infer<typeof envSchema>;

export interface Env extends Omit<EnvInput, "JWT_SECRET"> {
  JWT_SECRET: string;
}

export function parseEnv(record: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(record);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Invalid environment: ${details}`);
  }
  warnOnPartialR2(result.data);
  return {
    ...result.data,
    JWT_SECRET: result.data.JWT_SECRET ?? result.data.AUTH_SECRET,
  };
}

function warnOnPartialR2(env: EnvInput): void {
  const filled = R2_REQUIRED_KEYS.filter((key) => env[key] !== undefined && env[key] !== "").length;
  if (filled > 0 && filled < R2_REQUIRED_KEYS.length) {
    console.warn(
      "[env] ตั้งค่า R2 ไม่ครบ (ต้องการ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) — storage module จะไม่ทำงานจนกว่าจะครบ",
    );
  }
}
