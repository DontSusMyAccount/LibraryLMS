import type { UserPublic } from "../../../../shared";

export interface ILoginCommand {
  email: string;
  password: string;
}

export interface ILoginReturnType {
  token: string;
  user: UserPublic;
}
