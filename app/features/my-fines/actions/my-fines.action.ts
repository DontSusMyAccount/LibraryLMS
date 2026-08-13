import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";

import type { MyFinesResult } from "../my-fines.types";

export async function fetchMyFines(): Promise<MyFinesResult> {
  return edenRequest(await eden.me.fines.get());
}
