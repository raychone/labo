import { ADULT_FDI_TEETH } from "@dental-lab/shared";
import { IsIn, IsInt } from "class-validator";

export class CreateToothConnectionDto {
  @IsInt()
  @IsIn([...ADULT_FDI_TEETH])
  public readonly toothA!: number;

  @IsInt()
  @IsIn([...ADULT_FDI_TEETH])
  public readonly toothB!: number;
}
