export const ROUTES = {
  API_BACKEND: "/api/backend",
  AUTH_SIGNIN: "/login",
  DASHBOARD: "/dashboard",
  MY_LOANS: "/my-loans",
} as const;

export type RouteKey = keyof typeof ROUTES;
