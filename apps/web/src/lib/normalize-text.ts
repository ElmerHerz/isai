// Normaliza texto para comparar en buscadores: sin distinguir mayúsculas de
// minúsculas ni acentos ("café" debe encontrarse buscando "cafe"). Usado por
// todo buscador de texto libre de la app (tablas, combobox, listas
// filtrables) para que el criterio sea el mismo en todos lados.
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
