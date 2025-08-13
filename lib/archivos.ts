export type ArchivoRecibo = { name: string; id?: string; link?: string };

export function parseArchivosCell(value: unknown): ArchivoRecibo[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as ArchivoRecibo[];
  const s = String(value);
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr as ArchivoRecibo[];
  } catch {
    return [{ name: s }];
  }
  return [];
}

export function mergeArchivos(prev: unknown, nuevo: ArchivoRecibo): ArchivoRecibo[] {
  const arr = parseArchivosCell(prev);
  const key = (a: ArchivoRecibo) => (a.id || a.name);
  const by = new Map<string, ArchivoRecibo>();
  for (const a of arr) by.set(key(a), a);
  by.set(key(nuevo), nuevo);
  return Array.from(by.values());
}

export function getArchivoLink(a: ArchivoRecibo): string {
  if (a.link) return a.link;
  return `/recibos/${encodeURIComponent(a.name)}`;
}
