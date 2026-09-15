import type { Role } from "@/shared/types/enums";

export type { Role };

export type SessionShape = {
  id: string;
  name: string;
  email: string;
  role: Role;
  sppgId: string;
};
