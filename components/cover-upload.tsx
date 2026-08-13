"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlusIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

const NOT_IMAGE_MESSAGE = "รองรับเฉพาะไฟล์รูปภาพ (JPG/PNG/WEBP)";
const TOO_LARGE_MESSAGE = "ไฟล์ต้องมีขนาดไม่เกิน 5MB";
const BROWSE_LABEL = "อัปโหลดรูปปก";
const CHANGE_LABEL = "เปลี่ยนรูป";
const REMOVE_LABEL = "ลบรูป";
const PLACEHOLDER_TEXT = "เลือกไฟล์รูปปกเพื่อแสดงตัวอย่าง";

interface CoverUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
  className?: string;
}

function CoverUpload({ file, onChange, className }: CoverUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (selected: File | null) => {
    if (!selected) {
      return;
    }
    if (!selected.type.startsWith("image/")) {
      setErrorMessage(NOT_IMAGE_MESSAGE);
      onChange(null);
      return;
    }
    if (selected.size > MAX_COVER_SIZE) {
      setErrorMessage(TOO_LARGE_MESSAGE);
      onChange(null);
      return;
    }
    setErrorMessage(null);
    onChange(selected);
  };

  const handleRemove = () => {
    onChange(null);
    setErrorMessage(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div data-slot="cover-upload" className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "relative flex min-h-[160px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40",
          errorMessage && "border-accent-coral/60",
        )}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="ตัวอย่างรูปปก"
              className="h-40 w-full object-contain"
              data-slot="cover-upload-preview"
            />
            <button
              type="button"
              onClick={handleRemove}
              aria-label={REMOVE_LABEL}
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-[rgba(11,18,32,0.6)] text-white transition-colors hover:bg-[rgba(11,18,32,0.8)]"
            >
              <XIcon className="size-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <ImagePlusIcon className="size-6" />
            <span className="text-sm font-medium">{PLACEHOLDER_TEXT}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        data-slot="cover-upload-input"
        onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
      />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-500 px-3 text-xs font-medium text-white transition-colors hover:bg-brand-600"
        >
          <ImagePlusIcon className="size-3.5" />
          {previewUrl ? CHANGE_LABEL : BROWSE_LABEL}
        </button>
        <span className="text-caption text-muted-foreground">JPG/PNG/WEBP ไม่เกิน 5MB</span>
      </div>

      {errorMessage && (
        <p data-slot="cover-upload-error" className="text-caption text-accent-coral">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export { CoverUpload };

export type { CoverUploadProps };
