import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLanguageDto {
  @ApiProperty({ example: 'es', description: 'Código ISO 639-1 (o con región, ej. es-GT), minúsculas' })
  @IsString() @IsNotEmpty() @Length(2, 10)
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, { message: 'code debe ser tipo "es" o "es-GT"' })
  code!: string;

  @ApiProperty({ example: 'Español' })
  @IsString() @IsNotEmpty() @Length(1, 100)
  name!: string;
}
