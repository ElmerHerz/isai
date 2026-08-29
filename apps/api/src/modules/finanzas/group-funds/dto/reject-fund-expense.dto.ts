import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectFundExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;
}
