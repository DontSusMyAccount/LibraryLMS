"use client";

import Image from "next/image";

import { LoginForm } from "./components/login-form";

export function LoginPage() {
  return (
    <main
      data-slot="login-page"
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-24 size-80 rounded-full bg-brand-100/70 blur-3xl dark:bg-brand-900/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-accent-amber/20 blur-3xl dark:bg-accent-amber/10"
      />

      <div className="relative flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-center gap-3">
          <div className="relative size-11 shrink-0">
            <Image
              src="/brand/logo.png"
              alt="Library LMS"
              fill
              sizes="44px"
              className="object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-title font-semibold text-foreground">Library LMS</p>
            <p className="text-caption text-muted-foreground">ระบบบริหารจัดการห้องสมุด</p>
          </div>
        </div>

        <section data-slot="login-card" className="rounded-lg bg-card p-8 shadow-card">
          <header className="mb-6">
            <h1 className="text-title font-semibold text-foreground">เข้าสู่ระบบ</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ยินดีต้อนรับสู่ระบบยืม-คืนหนังสือของห้องสมุด
            </p>
          </header>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
