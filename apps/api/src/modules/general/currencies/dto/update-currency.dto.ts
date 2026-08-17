import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCurrencyDto } from './create-currency.dto';

// code es inmutable (va en la URL, es la PK) — nunca se actualiza.
export class UpdateCurrencyDto extends PartialType(OmitType(CreateCurrencyDto, ['code'] as const)) {}
