import { IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttendanceTagDto {
  @ApiProperty({ example: 'UNIFORME' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, { message: 'El código solo puede tener mayúsculas, números y guion bajo' })
  code!: string;

  @ApiProperty({ example: 'Uniforme' })
  @IsString()
  @MaxLength(100)
  name!: string;
}
