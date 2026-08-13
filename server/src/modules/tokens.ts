export const TOKENS = {
  Db: Symbol("Db").toString(),
  JwtSecret: Symbol("JwtSecret").toString(),
  InternalSecret: Symbol("InternalSecret").toString(),
  AuthRepository: Symbol("AuthRepository").toString(),
} as const;
