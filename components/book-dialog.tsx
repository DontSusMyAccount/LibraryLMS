"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookPlusIcon, ChevronDownIcon, LoaderCircleIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCatalog } from "@/app/features/catalog/hooks/use-catalog";
import type { CreateBookInput } from "@/app/features/catalog/catalog.types";
import { flattenCategoryOptions } from "@/components/category-filter";
import { CoverUpload } from "@/components/cover-upload";
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
import { useCatalogStore } from "@/app/features/catalog/stores/catalog.store";

const FALLBACK_CREATE_MESSAGE = "ไม่สามารถเพิ่มหนังสือได้ กรุณาลองใหม่";

const TITLE_LABEL = "ชื่อหนังสือ";
const TITLE_PLACEHOLDER = "เช่น คัมภีร์ลมปราณ";
const AUTHOR_LABEL = "ผู้แต่ง";
const AUTHOR_PLACEHOLDER = "ชื่อผู้แต่ง";
const ISBN_LABEL = "ISBN";
const ISBN_PLACEHOLDER = "ISBN-10 หรือ ISBN-13 (ไม่บังคับ)";
const CATEGORY_LABEL = "หมวดหมู่";
const COVER_LABEL = "รูปปก";
const DIALOG_TITLE = "เพิ่มหนังสือ";
const DIALOG_DESCRIPTION = "บันทึกหนังสือเล่มใหม่เข้าสู่แคตตาล็อกห้องสมุด";
const SUBMIT_LABEL = "บันทึก";
const SUBMITTING_LABEL = "กำลังบันทึก...";

const isbnPattern = /^[0-9Xx\-\s]{10,20}$/;

const bookFormSchema = z.object({
  title: z.string().trim().min(1, "กรุณากรอกชื่อหนังสือ"),
  author: z.string().trim().min(1, "กรุณากรอกชื่อผู้แต่ง"),
  isbn: z
    .string()
    .trim()
    .refine((value) => value === "" || isbnPattern.test(value), {
      message: "รูปแบบ ISBN ไม่ถูกต้อง (ต้องเป็น ISBN-10 หรือ ISBN-13)",
    }),
  categoryId: z.string(),
});

type BookFormValues = z.infer<typeof bookFormSchema>;

interface BookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function BookDialog({ open, onOpenChange, onCreated }: BookDialogProps) {
  const { categories, createBook, uploadCover } = useCatalog();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => flattenCategoryOptions(categories), [categories]);

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: { title: "", author: "", isbn: "", categoryId: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      setCoverFile(null);
      setSubmitError(null);
    }
  }, [open, form]);

  const handleSubmit = async (values: BookFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);

    const input: CreateBookInput = {
      title: values.title,
      author: values.author,
    };
    if (values.isbn) {
      input.isbn = values.isbn;
    }
    if (values.categoryId) {
      input.categoryId = values.categoryId;
    }

    const book = await createBook(input);
    if (!book) {
      setIsSubmitting(false);
      setSubmitError(useCatalogStore.getState().errorMessage ?? FALLBACK_CREATE_MESSAGE);
      return;
    }

    if (coverFile) {
      await uploadCover(book.id, coverFile);
    }

    setIsSubmitting(false);
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLE}</DialogTitle>
          <DialogDescription>{DIALOG_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <form data-slot="book-dialog-form" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="book-title" className="text-label font-medium text-foreground">
              {TITLE_LABEL}
            </label>
            <Input
              id="book-title"
              placeholder={TITLE_PLACEHOLDER}
              aria-invalid={form.formState.errors.title ? true : undefined}
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p data-slot="book-title-error" className="text-caption text-accent-coral">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="book-author" className="text-label font-medium text-foreground">
              {AUTHOR_LABEL}
            </label>
            <Input
              id="book-author"
              placeholder={AUTHOR_PLACEHOLDER}
              aria-invalid={form.formState.errors.author ? true : undefined}
              {...form.register("author")}
            />
            {form.formState.errors.author && (
              <p data-slot="book-author-error" className="text-caption text-accent-coral">
                {form.formState.errors.author.message}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="book-isbn" className="text-label font-medium text-foreground">
              {ISBN_LABEL}
            </label>
            <Input
              id="book-isbn"
              placeholder={ISBN_PLACEHOLDER}
              className="tabular-nums"
              aria-invalid={form.formState.errors.isbn ? true : undefined}
              {...form.register("isbn")}
            />
            {form.formState.errors.isbn && (
              <p data-slot="book-isbn-error" className="text-caption text-accent-coral">
                {form.formState.errors.isbn.message}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="book-category" className="text-label font-medium text-foreground">
              {CATEGORY_LABEL}
            </label>
            <div className="relative">
              <select
                id="book-category"
                className="h-[42px] w-full appearance-none rounded-sm border border-input bg-card py-2 pr-9 pl-3.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 dark:bg-input/30"
                {...form.register("categoryId")}
              >
                <option value="">ไม่ระบุหมวดหมู่</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${"\u00A0".repeat(option.depth * 2)}${option.name}`}
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
            <span className="text-label font-medium text-foreground">{COVER_LABEL}</span>
            <CoverUpload file={coverFile} onChange={setCoverFile} />
          </div>

          {submitError && (
            <p data-slot="book-dialog-submit-error" className="mt-4 text-caption text-accent-coral">
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
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <BookPlusIcon className="size-4" />
              )}
              {isSubmitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { BookDialog };

export type { BookDialogProps };
