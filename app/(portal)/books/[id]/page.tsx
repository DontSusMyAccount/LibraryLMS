import type { Metadata } from "next";

import { BookDetail } from "@/app/features/book-detail/components/book-detail";

export const metadata: Metadata = {
  title: "รายละเอียดหนังสือ",
};

interface BookDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalBookDetailPage({ params }: BookDetailPageProps) {
  const { id } = await params;
  return <BookDetail bookId={id} />;
}
