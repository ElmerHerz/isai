import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLanguageDto } from './create-language.dto';

// code es inmutable (va en la URL, es la PK) — nunca se actualiza.
// Sin isActive: la tabla languages no tiene esa columna, solo se puede renombrar.
export class UpdateLanguageDto extends PartialType(OmitType(CreateLanguageDto, ['code'] as const)) {}
