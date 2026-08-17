import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCountryDto } from './create-country.dto';

// code es inmutable (va en la URL, es la PK) — nunca se actualiza.
export class UpdateCountryDto extends PartialType(OmitType(CreateCountryDto, ['code'] as const)) {}
