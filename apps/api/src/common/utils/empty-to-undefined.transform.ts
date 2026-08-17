import { TransformFnParams } from 'class-transformer';

// @IsOptional() de class-validator solo salta la validación si el valor es
// null/undefined — un string vacío ("") la sigue pasando y truena contra
// @Length/@Matches. Los formularios del frontend siempre mandan "" (no
// undefined) para un campo de texto opcional que el usuario dejó en blanco,
// así que sin esto cualquier campo string opcional con longitud mínima
// responde 400 apenas alguien deja el campo vacío.
export function emptyToUndefined({ value }: TransformFnParams) {
  return value === '' ? undefined : value;
}
