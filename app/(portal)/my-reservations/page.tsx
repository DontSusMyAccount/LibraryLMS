import type { Metadata } from "next";

import { MyReservationsPage } from "@/app/features/my-reservations/my-reservations.page";

export const metadata: Metadata = {
  title: "การจองของฉัน",
};

export default function PortalMyReservationsPage() {
  return <MyReservationsPage />;
}
