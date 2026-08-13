import type { FineRecord } from "@libsys/shared";

export interface MyFinesResult {
  fines: FineRecord[];
  unpaidTotal: number;
}
