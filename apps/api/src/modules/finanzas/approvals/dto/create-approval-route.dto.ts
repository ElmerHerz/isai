import { IsOptional, IsUUID, IsNumber, Min, IsString, IsNotEmpty, MaxLength, ArrayMinSize, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateApprovalRouteDto {
  @ApiProperty({ example: 'Gastos grandes' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ description: 'Vacío = aplica a todo el tenant' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  institutionId?: string;

  @ApiPropertyOptional({ description: 'Vacío = aplica a toda la institución' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minAmount!: number;

  @ApiProperty({
    description: 'Personas aprobadoras en orden — la primera de la lista es el primer paso',
    example: ['uuid-persona-1', 'uuid-persona-2'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Una ruta necesita al menos un paso de aprobación' })
  @IsUUID('4', { each: true })
  approverUserIds!: string[];

  @ApiProperty({
    description: 'Cuentas de gasto a las que aplica la ruta — toda ruta debe quedar atada a al menos una',
    example: ['uuid-cuenta-musicos', 'uuid-cuenta-equipo-sonido'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Indica al menos una cuenta a la que aplica esta ruta' })
  @IsUUID('4', { each: true })
  accountIds!: string[];
}
