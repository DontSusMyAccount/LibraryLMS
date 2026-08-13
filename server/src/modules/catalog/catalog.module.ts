import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { container } from "tsyringe";

import { TOKENS } from "../tokens";
import { auditRepositoryToken } from "../shared/applications/ports/audit.repository";
import { BookController } from "./adapters/controllers/book.controller";
import { CategoryController } from "./adapters/controllers/category.controller";
import { CopyController } from "./adapters/controllers/copy.controller";
import { DrizzleAuditRepository } from "./adapters/repository/audit.drizzle.repository";
import { DrizzleBookRepository } from "./adapters/repository/book.drizzle.repository";
import { DrizzleCategoryRepository } from "./adapters/repository/category.drizzle.repository";
import { DrizzleCopyRepository } from "./adapters/repository/copy.drizzle.repository";
import { bookRepositoryToken } from "./applications/ports/book.repository";
import { categoryRepositoryToken } from "./applications/ports/category.repository";
import { copyRepositoryToken } from "./applications/ports/copy.repository";
import { CreateBookUsecase } from "./applications/usecases/create-book.usecase";
import { CreateCopyUsecase } from "./applications/usecases/create-copy.usecase";
import { GetBookUsecase } from "./applications/usecases/get-book.usecase";
import { ListBooksUsecase } from "./applications/usecases/list-books.usecase";
import { ListCategoriesUsecase } from "./applications/usecases/list-categories.usecase";
import { UpdateBookUsecase } from "./applications/usecases/update-book.usecase";
import { UpdateCopyStatusUsecase } from "./applications/usecases/update-copy-status.usecase";

export interface CatalogModuleDeps {
  db: PostgresJsDatabase;
  jwtSecret: string;
  internalSecret: string;
}

export function registerCatalogModule(deps: CatalogModuleDeps): void {
  container.register(TOKENS.Db, { useValue: deps.db });
  container.register(TOKENS.JwtSecret, { useValue: deps.jwtSecret });
  container.register(TOKENS.InternalSecret, { useValue: deps.internalSecret });

  container.register(bookRepositoryToken, { useClass: DrizzleBookRepository });
  container.register(copyRepositoryToken, { useClass: DrizzleCopyRepository });
  container.register(categoryRepositoryToken, { useClass: DrizzleCategoryRepository });
  container.register(auditRepositoryToken, { useClass: DrizzleAuditRepository });

  container.register(CreateBookUsecase, { useClass: CreateBookUsecase });
  container.register(UpdateBookUsecase, { useClass: UpdateBookUsecase });
  container.register(ListBooksUsecase, { useClass: ListBooksUsecase });
  container.register(GetBookUsecase, { useClass: GetBookUsecase });
  container.register(CreateCopyUsecase, { useClass: CreateCopyUsecase });
  container.register(UpdateCopyStatusUsecase, { useClass: UpdateCopyStatusUsecase });
  container.register(ListCategoriesUsecase, { useClass: ListCategoriesUsecase });

  container.register(BookController, { useClass: BookController });
  container.register(CopyController, { useClass: CopyController });
  container.register(CategoryController, { useClass: CategoryController });
}

export function resolveBookController(): BookController {
  return container.resolve(BookController);
}

export function resolveCopyController(): CopyController {
  return container.resolve(CopyController);
}

export function resolveCategoryController(): CategoryController {
  return container.resolve(CategoryController);
}

export interface CatalogControllers {
  book: BookController;
  copy: CopyController;
  category: CategoryController;
}

export function resolveCatalogControllers(): CatalogControllers {
  return {
    book: resolveBookController(),
    copy: resolveCopyController(),
    category: resolveCategoryController(),
  };
}
