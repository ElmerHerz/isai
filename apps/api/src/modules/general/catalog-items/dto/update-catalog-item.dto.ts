import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCatalogItemDto } from './create-catalog-item.dto';

// catalogCode y code son inmutables (identifican la fila junto al id) — nunca se actualizan.
export class UpdateCatalogItemDto extends PartialType(
  OmitType(CreateCatalogItemDto, ['catalogCode', 'code'] as const),
) {}
