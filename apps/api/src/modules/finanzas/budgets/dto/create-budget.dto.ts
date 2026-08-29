import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { emptyToUndefined } from '../../../../common/utils/empty-to-undefined.transform';

export class CreateBudgetDto {
  @ApiProperty({ example: 'uuid-de-la-institución' })
  @IsUUID('loose')
  institutionId!: string;

  @ApiPropertyOptional({ description: 'Sucursal a la que aplica — vacío = toda la institución' })
  @Transform(emptyToUndefined)
  @IsUUID('loose') @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'Presupuesto 2027' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiProperty({ example: '2027-01-01' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ example: '2027-12-31' })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsString() @IsOptional()
  notes?: string;
}
