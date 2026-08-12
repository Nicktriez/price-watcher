export function fmtPrice(p: string): string {
  return p.replace(/\.?0+$/, "");
}

export function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}
