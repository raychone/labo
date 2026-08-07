import { Matches } from "class-validator";

export class UpdateProfileDto {
  @Matches(/^#[0-9a-fA-F]{6}$/)
  public readonly preferredColor!: string;
}
