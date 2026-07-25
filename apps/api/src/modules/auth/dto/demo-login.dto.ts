import { IsIn } from "class-validator";

export const DEMO_LOGIN_ROLES = ["MANAGER", "RECEPTIE", "LOGISTICA", "TEHNICIAN", "CURIER", "MEDIC"] as const;
export type DemoLoginRole = (typeof DEMO_LOGIN_ROLES)[number];

export class DemoLoginDto {
  @IsIn(DEMO_LOGIN_ROLES)
  public readonly role!: DemoLoginRole;
}
