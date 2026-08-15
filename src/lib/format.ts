export function fmtPrice(p: string): string {
  return p.includes(".") ? p.replace(/\.?0+$/, "") : p;
}

export function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Danish measurement, e.g. 1.5 + "l" -> "1,5 l", 400 + "g" -> "400 g". */
export function fmtSize(size: number, unit: string | null): string {
  const value = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 2 }).format(size);
  const u = (unit ?? "").trim();
  return u ? `${value} ${u}` : value;
}
