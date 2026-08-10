export const ROUTES = {
  API_BACKEND: "/api/backend",
  AUTH_SIGNIN: "/login",
  DASHBOARD: "/dashboard",
} as const;

export type RouteKey = keyof typeof ROUTES;
