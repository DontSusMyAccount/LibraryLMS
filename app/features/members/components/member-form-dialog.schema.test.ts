import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, it } from "vitest";
import type { ResolverOptions } from "react-hook-form";

import type { UserRole } from "@libsys/shared";

import type { MemberFormValues } from "./member-form-dialog";
import { buildMemberFormSchema } from "./member-form-dialog";

const RESOLVER_OPTIONS: ResolverOptions<MemberFormValues> = {
  criteriaMode: "firstError",
  fields: {},
  shouldUseNativeValidation: false,
};

function buildEmptyCreateValues() {
  return {
    email: "",
    fullName: "",
    role: "" as UserRole,
    password: "",
    confirmPassword: "",
  };
}

describe("member-form-dialog schema — สร้างสมาชิก", () => {
  const resolver = zodResolver(buildMemberFormSchema(false));

  it("ค่าเปล่า → errors ครบทุกช่อง (email/fullName/role/password/confirmPassword)", async () => {
    const result = await resolver(buildEmptyCreateValues(), undefined, RESOLVER_OPTIONS);

    expect(result.errors.email?.message).toBe("กรุณากรอกอีเมล");
    expect(result.errors.fullName?.message).toBe("กรุณากรอกชื่อ-นามสกุล");
    expect(result.errors.role?.message).toBe("กรุณาเลือกบทบาท");
    expect(result.errors.password?.message).toBe("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    expect(result.errors.confirmPassword?.message).toBe("กรุณากรอกรหัสผ่านยืนยัน");
  });

  it("password สั้นกว่า 8 ตัวอักษร → ให้ password error 8 ตัวอักษร", async () => {
    const result = await resolver(
      {
        email: "new@x.ac.th",
        fullName: "นิสิตใหม่",
        role: "student",
        password: "short",
        confirmPassword: "short",
      },
      undefined,
      RESOLVER_OPTIONS,
    );

    expect(result.errors.password?.message).toBe("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  });

  it("password+confirm ตรงกันและผ่านเงื่อนไข → ไม่มี password/confirm errors", async () => {
    const result = await resolver(
      {
        email: "new@x.ac.th",
        fullName: "นิสิตใหม่",
        role: "student",
        password: "Test@1234",
        confirmPassword: "Test@1234",
      },
      undefined,
      RESOLVER_OPTIONS,
    );

    expect(result.errors.password).toBeUndefined();
    expect(result.errors.confirmPassword).toBeUndefined();
  });

  it("password กับ confirm ไม่ตรงกัน → confirmPassword error 'รหัสผ่านไม่ตรงกัน'", async () => {
    const result = await resolver(
      {
        email: "new@x.ac.th",
        fullName: "นิสิตใหม่",
        role: "student",
        password: "Test@1234",
        confirmPassword: "Test@9999",
      },
      undefined,
      RESOLVER_OPTIONS,
    );

    expect(result.errors.confirmPassword?.message).toBe("รหัสผ่านไม่ตรงกัน");
  });
});

describe("member-form-dialog schema — แก้ไขสมาชิก", () => {
  const resolver = zodResolver(buildMemberFormSchema(true));

  it("แก้ไข status=suspended และค่าอื่นถูกต้อง → ไม่มี error (โดยเฉพาะ status)", async () => {
    const result = await resolver(
      {
        email: "a@x.ac.th",
        fullName: "สมศรี ใจดี",
        role: "student",
        status: "suspended",
      },
      undefined,
      RESOLVER_OPTIONS,
    );

    expect(result.errors.status).toBeUndefined();
    expect(result.errors.email).toBeUndefined();
    expect(result.errors.fullName).toBeUndefined();
    expect(result.errors.role).toBeUndefined();
    expect(result.errors.password).toBeUndefined();
    expect(result.errors.confirmPassword).toBeUndefined();
  });
});
