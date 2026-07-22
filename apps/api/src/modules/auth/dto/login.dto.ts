import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  public readonly email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(256)
  public readonly password!: string;
}
