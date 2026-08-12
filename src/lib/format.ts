export function fmtPrice(p: string): string {
  return p.includes(".") ? p.replace(/\.?0+$/, "") : p;
}

export function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}
