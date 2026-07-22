import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../password.policy.js";

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  public readonly email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  public readonly password!: string;
}
