import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Min } from "class-validator";

export class StageTransitionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly expectedWorkflowVersion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly expectedStageVersion?: number;

  @IsOptional()
  @IsIn(["scan"])
  public readonly source?: "scan";
}
