import { Transform } from "class-transformer";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

const scanSources = ["camera", "manual"] as const;
type ScanSource = (typeof scanSources)[number];

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class ResolveScanDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  public readonly payload!: string;

  @IsIn(scanSources)
  public readonly source!: ScanSource;
}

export class RecordScanWorkOpenedDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  public readonly workId!: string;
}
