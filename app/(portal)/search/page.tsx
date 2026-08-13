import type { Metadata } from "next";

import { SearchPage } from "@/app/features/search/search.page";

export const metadata: Metadata = {
  title: "ค้นหาหนังสือ",
};

export default function PortalSearchPage() {
  return <SearchPage />;
}
