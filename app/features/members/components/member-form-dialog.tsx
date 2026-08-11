"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon, LoaderCircleIcon, SaveIcon, UserPlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MEMBER_TYPES, USER_ROLES, USER_STATUSES } from "@libsys/shared";
import type { MemberType, UserRole, UserStatus } from "@libsys/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { useMembers } from "../hooks/use-members";
import { useMembersStore } from "../stores/members.store";
import type { CreateMemberInput, MemberListItem, UpdateMemberInput } from "../members.types";
import { ROLE_LABELS } from "./members-table";
import { STATUS_LABELS } from "./member-status-badge";

const FALLBACK_CREATE_MESSAGE = "ไม่สามารถเพิ่มสมาชิกได้ กรุณาลองใหม่";
const FALLBACK_UPDATE_MESSAGE = "ไม่สามารถแก้ไขสมาชิกได้ กรุณาลองใหม่";

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  general: "ทั่วไป",
  undergraduate: "ปริญญาตรี",
  graduate: "บัณฑิตศึกษา",
};

const EMAIL_LABEL = "อีเมล";
const EMAIL_PLACEHOLDER = "เช่น somchai@example.ac.th";
const FULL_NAME_LABEL = "ชื่อ-นามสกุล";
const FULL_NAME_PLACEHOLDER = "ชื่อ-นามสกุลของสมาชิก";
const ROLE_LABEL = "บทบาท";
const ROLE_PLACEHOLDER = "เลือกบทบาท";
const PASSWORD_LABEL = "รหัสผ่าน";
const PASSWORD_PLACEHOLDER = "อย่างน้อย 8 ตัวอักษร";
const CONFIRM_PASSWORD_LABEL = "ยืนยันรหัสผ่าน";
const CONFIRM_PASSWORD_PLACEHOLDER = "กรอกรหัสผ่านอีกครั้ง";
const MEMBER_TYPE_LABEL = "ประเภทสมาชิก";
const STUDENT_ID_LABEL = "รหัสนักศึกษา/พนักงาน";
const STUDENT_ID_PLACEHOLDER = "เช่น 6501123456 (ไม่บังคับ)";
const PHONE_LABEL = "เบอร์โทร";
const PHONE_PLACEHOLDER = "เช่น 0812345678 (ไม่บังคับ)";
const STATUS_LABEL = "สถานะ";
const CREATE_TITLE = "เพิ่มสมาชิก";
const CREATE_DESCRIPTION = "สร้างบัญชีสมาชิกใหม่ให้เข้าถึงระบบห้องสมุด";
const EDIT_TITLE = "แก้ไขสมาชิก";
const EDIT_DESCRIPTION = "แก้ไขข้อมูลหรือเปลี่ยนสถานะของสมาชิก";
const CREATE_SUBMIT_LABEL = "เพิ่มสมาชิก";
const EDIT_SUBMIT_LABEL = "บันทึกการแก้ไข";
const SUBMITTING_LABEL = "กำลังบันทึก...";
const CANCEL_LABEL = "ยกเลิก";
const OPTION_NOT_SPECIFIED = "ไม่ระบุ";

const SELECT_CLASS =
  "h-[42px] w-full appearance-none rounded-sm border border-input bg-card py-2 pr-9 pl-3.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 dark:bg-input/30";

interface MemberFormValues {
  email: string;
  fullName: string;
  role: UserRole;
  password?: string;
  confirmPassword?: string;
  status?: UserStatus;
  memberType?: MemberType;
  studentOrStaffId?: string;
  phone?: string;
}

function buildDefaultValues(member: MemberListItem | null): MemberFormValues {
  if (member) {
    return {
      email: member.email,
      fullName: member.fullName,
      role: member.role,
      status: member.status,
      memberType: member.memberType,
      studentOrStaffId: member.studentOrStaffId ?? "",
      phone: member.phone ?? "",
      password: "",
      confirmPassword: "",
    };
  }
  return {
    email: "",
    fullName: "",
    role: "" as UserRole,
    memberType: undefined,
    studentOrStaffId: "",
    phone: "",
    password: "",
    confirmPassword: "",
  };
}

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberListItem | null;
}

function MemberFormDialog({ open, onOpenChange, member }: MemberFormDialogProps) {
  const isEdit = member !== null;
  const { createMember, updateMember } = useMembers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const memberTypeTouched = useRef(false);

  const memberFormSchema = useMemo(
    () =>
      z
        .object({
          email: z.string().trim().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
          fullName: z.string().trim().min(1, "กรุณากรอกชื่อ-นามสกุล"),
          role: z.enum(USER_ROLES, { message: "กรุณาเลือกบทบาท" }),
          password: z.string().optional(),
          confirmPassword: z.string().optional(),
          status: z.enum(USER_STATUSES, { message: "กรุณาเลือกสถานะ" }).optional(),
          memberType: z.enum(MEMBER_TYPES).optional(),
          studentOrStaffId: z.string().optional(),
          phone: z.string().optional(),
        })
        .superRefine((values, context) => {
          if (isEdit) {
            if (!values.status) {
              context.addIssue({
                code: "custom",
                path: ["status"],
                message: "กรุณาเลือกสถานะ",
              });
            }
            return;
          }
          const password = values.password ?? "";
          if (!password) {
            context.addIssue({
              code: "custom",
              path: ["password"],
              message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
            });
          } else if (password.length < 8) {
            context.addIssue({
              code: "custom",
              path: ["password"],
              message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
            });
          }
          const confirmPassword = values.confirmPassword ?? "";
          if (!confirmPassword) {
            context.addIssue({
              code: "custom",
              path: ["confirmPassword"],
              message: "กรุณากรอกรหัสผ่านยืนยัน",
            });
          } else if (confirmPassword !== password) {
            context.addIssue({
              code: "custom",
              path: ["confirmPassword"],
              message: "รหัสผ่านไม่ตรงกัน",
            });
          }
        }),
    [isEdit],
  );

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: buildDefaultValues(member),
  });

  const watchedRole = form.watch("role");
  const watchedMemberType = form.watch("memberType");

  useEffect(() => {
    if (open) {
      memberTypeTouched.current = false;
      setSubmitError(null);
      form.reset(buildDefaultValues(member));
    }
  }, [open, member, form]);

  useEffect(() => {
    if (!isEdit && !memberTypeTouched.current && watchedRole) {
      form.setValue("memberType", watchedRole === "student" ? "undergraduate" : "general");
    }
  }, [isEdit, watchedRole, form]);

  const handleSubmit = async (values: MemberFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);

    const studentOrStaffId = values.studentOrStaffId?.trim();
    const phone = values.phone?.trim();

    if (isEdit && member) {
      const patch: UpdateMemberInput = {
        fullName: values.fullName,
        role: values.role,
        status: values.status,
      };
      if (values.memberType) {
        patch.memberType = values.memberType;
      }
      if (studentOrStaffId) {
        patch.studentOrStaffId = studentOrStaffId;
      }
      if (phone) {
        patch.phone = phone;
      }

      const updated = await updateMember(member.id, patch);
      if (!updated) {
        setIsSubmitting(false);
        setSubmitError(useMembersStore.getState().errorMessage ?? FALLBACK_UPDATE_MESSAGE);
        return;
      }
    } else {
      const input: CreateMemberInput = {
        email: values.email,
        fullName: values.fullName,
        role: values.role,
        password: values.password ?? "",
      };
      if (values.memberType) {
        input.memberType = values.memberType;
      }
      if (studentOrStaffId) {
        input.studentOrStaffId = studentOrStaffId;
      }
      if (phone) {
        input.phone = phone;
      }

      const created = await createMember(input);
      if (!created) {
        setIsSubmitting(false);
        setSubmitError(useMembersStore.getState().errorMessage ?? FALLBACK_CREATE_MESSAGE);
        return;
      }
    }

    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? EDIT_TITLE : CREATE_TITLE}</DialogTitle>
          <DialogDescription>{isEdit ? EDIT_DESCRIPTION : CREATE_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <form data-slot="member-dialog-form" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="member-email" className="text-label font-medium text-foreground">
              {EMAIL_LABEL}
            </label>
            <Input
              id="member-email"
              type="email"
              placeholder={EMAIL_PLACEHOLDER}
              readOnly={isEdit}
              className={isEdit ? "bg-muted/40 text-muted-foreground" : undefined}
              aria-invalid={form.formState.errors.email ? true : undefined}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p data-slot="member-email-error" className="text-caption text-accent-coral">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="member-fullname" className="text-label font-medium text-foreground">
              {FULL_NAME_LABEL}
            </label>
            <Input
              id="member-fullname"
              placeholder={FULL_NAME_PLACEHOLDER}
              aria-invalid={form.formState.errors.fullName ? true : undefined}
              {...form.register("fullName")}
            />
            {form.formState.errors.fullName && (
              <p data-slot="member-fullname-error" className="text-caption text-accent-coral">
                {form.formState.errors.fullName.message}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="member-role" className="text-label font-medium text-foreground">
              {ROLE_LABEL}
            </label>
            <div className="relative">
              <select
                id="member-role"
                className={SELECT_CLASS}
                aria-invalid={form.formState.errors.role ? true : undefined}
                {...form.register("role")}
              >
                <option value="">{ROLE_PLACEHOLDER}</option>
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
            </div>
            {form.formState.errors.role && (
              <p data-slot="member-role-error" className="text-caption text-accent-coral">
                {form.formState.errors.role.message}
              </p>
            )}
          </div>

          {isEdit && (
            <div className="mt-4 flex flex-col gap-1.5">
              <label htmlFor="member-status" className="text-label font-medium text-foreground">
                {STATUS_LABEL}
              </label>
              <div className="relative">
                <select
                  id="member-status"
                  className={SELECT_CLASS}
                  aria-invalid={form.formState.errors.status ? true : undefined}
                  {...form.register("status")}
                >
                  {USER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
              </div>
              {form.formState.errors.status && (
                <p data-slot="member-status-error" className="text-caption text-accent-coral">
                  {form.formState.errors.status.message}
                </p>
              )}
            </div>
          )}

          {!isEdit && (
            <>
              <div className="mt-4 flex flex-col gap-1.5">
                <label htmlFor="member-password" className="text-label font-medium text-foreground">
                  {PASSWORD_LABEL}
                </label>
                <Input
                  id="member-password"
                  type="password"
                  placeholder={PASSWORD_PLACEHOLDER}
                  aria-invalid={form.formState.errors.password ? true : undefined}
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p data-slot="member-password-error" className="text-caption text-accent-coral">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-1.5">
                <label
                  htmlFor="member-confirm-password"
                  className="text-label font-medium text-foreground"
                >
                  {CONFIRM_PASSWORD_LABEL}
                </label>
                <Input
                  id="member-confirm-password"
                  type="password"
                  placeholder={CONFIRM_PASSWORD_PLACEHOLDER}
                  aria-invalid={form.formState.errors.confirmPassword ? true : undefined}
                  {...form.register("confirmPassword")}
                />
                {form.formState.errors.confirmPassword && (
                  <p
                    data-slot="member-confirm-password-error"
                    className="text-caption text-accent-coral"
                  >
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="member-member-type" className="text-label font-medium text-foreground">
              {MEMBER_TYPE_LABEL}
            </label>
            <div className="relative">
              <select
                id="member-member-type"
                value={watchedMemberType ?? ""}
                onChange={(event) => {
                  memberTypeTouched.current = true;
                  form.setValue(
                    "memberType",
                    event.target.value ? (event.target.value as MemberType) : undefined,
                  );
                }}
                className={SELECT_CLASS}
              >
                <option value="">{OPTION_NOT_SPECIFIED}</option>
                {MEMBER_TYPES.map((memberType) => (
                  <option key={memberType} value={memberType}>
                    {MEMBER_TYPE_LABELS[memberType]}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="member-student-id" className="text-label font-medium text-foreground">
              {STUDENT_ID_LABEL}
            </label>
            <Input
              id="member-student-id"
              placeholder={STUDENT_ID_PLACEHOLDER}
              className="tabular-nums"
              aria-invalid={form.formState.errors.studentOrStaffId ? true : undefined}
              {...form.register("studentOrStaffId")}
            />
            {form.formState.errors.studentOrStaffId && (
              <p data-slot="member-student-id-error" className="text-caption text-accent-coral">
                {form.formState.errors.studentOrStaffId.message}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="member-phone" className="text-label font-medium text-foreground">
              {PHONE_LABEL}
            </label>
            <Input
              id="member-phone"
              placeholder={PHONE_PLACEHOLDER}
              className="tabular-nums"
              aria-invalid={form.formState.errors.phone ? true : undefined}
              {...form.register("phone")}
            />
            {form.formState.errors.phone && (
              <p data-slot="member-phone-error" className="text-caption text-accent-coral">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          {submitError && (
            <p
              data-slot="member-dialog-submit-error"
              className="mt-4 text-caption text-accent-coral"
            >
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {CANCEL_LABEL}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : isEdit ? (
                <SaveIcon className="size-4" />
              ) : (
                <UserPlusIcon className="size-4" />
              )}
              {isSubmitting ? SUBMITTING_LABEL : isEdit ? EDIT_SUBMIT_LABEL : CREATE_SUBMIT_LABEL}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { MemberFormDialog };

export type { MemberFormDialogProps };
