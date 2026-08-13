import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { meRepositoryToken, type IMeRepository } from "../ports/me.repository";
import type { IListMyFinesQuery, IListMyFinesResult } from "../schemas/me-schemas";

@injectable()
export class ListMyFinesUsecase {
  constructor(@inject(meRepositoryToken) private readonly me: IMeRepository) {}

  async execute({ query }: { query: IListMyFinesQuery }): Promise<IListMyFinesResult> {
    const fines = await this.me.listFinesByUser(query.userId);
    // ตรงกับ sumUnpaidFinesByUser (gate กันยืม) — นับเฉพาะ paid=false ให้ทั้งระบบเห็นยอดเดียวกัน
    const unpaidTotal = fines
      .filter((fine) => !fine.paid)
      .reduce((total, fine) => total + fine.amount, 0);
    return { fines, unpaidTotal };
  }
}
