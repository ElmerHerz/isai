import { toast } from 'sonner';

export { toast };

interface ApiErrorShape {
  response?: { data?: { message?: string | string[] } };
}

// Centraliza el patrón repetido en cada diálogo: extraer el mensaje real del
// backend (class-validator devuelve un array cuando falla más de una regla)
// en vez de mostrar siempre el mismo texto genérico.
export function getErrorMessage(error: unknown, fallback = 'No se pudo completar la acción.'): string {
  const message = (error as ApiErrorShape)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' — ');
  return message ?? fallback;
}
