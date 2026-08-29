import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignCustodianDto {
  @ApiPropertyOptional({ description: 'null/vacío = devolver (sin custodio asignado)' })
  @IsUUID('loose') @IsOptional()
  custodianPersonId?: string | null;

  @ApiProperty({ example: 'Se lo lleva a su casa para el ensayo del sábado' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  notes!: string;
}
