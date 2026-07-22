import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../auth/password.policy.js";

const USER_SORT_FIELDS = ["createdAt", "displayName", "email", "updatedAt"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return undefined;
}

function normalizeRoleKeys(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()))]
    .filter(Boolean)
    .sort();
}

export class ListUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly pageSize: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public readonly search?: string;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  public readonly isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public readonly roleKey?: string;

  @IsOptional()
  @IsIn(USER_SORT_FIELDS)
  public readonly sortBy: (typeof USER_SORT_FIELDS)[number] = "createdAt";

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  public readonly sortDirection: (typeof SORT_DIRECTIONS)[number] = "desc";
}

export class CreateUserDto {
  @IsEmail()
  @MaxLength(254)
  public readonly email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public readonly displayName!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  public readonly temporaryPassword!: string;

  @Transform(({ value }) => normalizeRoleKeys(value))
  @IsArray()
  @ArrayMaxSize(8)
  public readonly roleKeys: readonly string[] = [];

  @IsOptional()
  @IsBoolean()
  public readonly isActive: boolean = true;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  public readonly email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public readonly displayName?: string;
}

export class ReplaceUserRolesDto {
  @Transform(({ value }) => normalizeRoleKeys(value))
  @IsArray()
  @ArrayMaxSize(8)
  public readonly roleKeys!: readonly string[];
}

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  public readonly temporaryPassword!: string;
}
