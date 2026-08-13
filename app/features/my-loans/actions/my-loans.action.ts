import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";

import type { MeProfile, MyLoanItem, RenewMyLoanResult } from "../my-loans.types";

export async function fetchMyProfile(): Promise<MeProfile> {
  return edenRequest(await eden.me.get());
}

export async function fetchMyLoans(): Promise<MyLoanItem[]> {
  const result = await edenRequest(await eden.me.loans.get());
  return result.loans;
}

export async function renewMyLoan(loanId: string): Promise<RenewMyLoanResult> {
  return edenRequest(await eden.me.loans({ id: loanId }).renew.post());
}
