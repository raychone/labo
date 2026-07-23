import { Transform } from "class-transformer";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

const scanSources = ["camera", "manual"] as const;

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : value as string;
}

export class ResolveWorkQrDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  public readonly payload!: string;

  @IsIn(scanSources)
  public readonly source: (typeof scanSources)[number] = "manual";
}
