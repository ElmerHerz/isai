import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;
}
