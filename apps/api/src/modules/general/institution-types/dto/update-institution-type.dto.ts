import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateInstitutionTypeDto } from './create-institution-type.dto';

// code es inmutable (va en la URL, es la PK) — nunca se actualiza.
export class UpdateInstitutionTypeDto extends PartialType(OmitType(CreateInstitutionTypeDto, ['code'] as const)) {}
