"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useLogin } from "../hooks/use-login";
import type { SignInCredentials } from "../stores/auth.store";

const loginSchema = z.object({
  email: z.string().trim().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { isSubmitting, errorMessage, handleSubmit } = useLogin();
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    const credentials: SignInCredentials = {
      email: values.email,
      password: values.password,
    };
    await handleSubmit(credentials);
  };

  return (
    <form data-slot="login-form" onSubmit={handleFormSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-label font-medium text-foreground">
          อีเมล
        </label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="คุณ@library.ac.th"
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p data-slot="login-email-error" className="text-caption text-accent-coral">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-label font-medium text-foreground">
          รหัสผ่าน
        </label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="กรอกรหัสผ่าน"
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p data-slot="login-password-error" className="text-caption text-accent-coral">
            {errors.password.message}
          </p>
        )}
      </div>

      {errorMessage && (
        <p data-slot="login-credentials-error" className="mt-3 text-caption text-accent-coral">
          {errorMessage}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-5 w-full">
        {isSubmitting ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
        {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
