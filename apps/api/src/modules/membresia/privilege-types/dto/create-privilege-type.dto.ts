import { IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePrivilegeTypeDto {
  @ApiProperty({ example: 'ALABANZAS' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, { message: 'El código solo puede tener mayúsculas, números y guion bajo' })
  code!: string;

  @ApiProperty({ example: 'Alabanzas' })
  @IsString()
  @MaxLength(100)
  name!: string;
}
