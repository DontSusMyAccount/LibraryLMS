import { treaty } from "@elysiajs/eden";

import { ROUTES } from "@/app/_shared/constants/routes";
import type { App } from "@/server/src/app";

export const eden = treaty<App>(ROUTES.API_BACKEND, { keepDomain: true });
