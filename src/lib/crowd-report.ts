export interface CrowdReportInput {
  storeId: string;
  productId?: string | null;
  productName?: string | null;
  price: number;
}

export interface NormalizedCrowdReport {
  storeId: string;
  productId: string | null;
  productName: string | null;
  price: number;
}

export type CrowdReportValidation =
  | { ok: true; report: NormalizedCrowdReport }
  | { ok: false; errors: string[] };

const MAX_PRICE_KR = 100_000;
const MAX_PRODUCT_NAME = 200;

export function validateCrowdReport(input: CrowdReportInput): CrowdReportValidation {
  const errors: string[] = [];

  const storeId = input.storeId.trim();
  if (!storeId) errors.push("Vælg en butik.");

  const productId = input.productId?.trim() || null;
  const productName = input.productName?.trim() || null;
  if (!productId && !productName) errors.push("Vælg et produkt eller skriv navnet på varen.");

  if (productName && productName.length > MAX_PRODUCT_NAME) {
    errors.push(`Produktnavn må maksimalt være ${MAX_PRODUCT_NAME} tegn.`);
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    errors.push("Angiv en gyldig pris (over 0 kr).");
  } else if (input.price > MAX_PRICE_KR) {
    errors.push(`Prisen ser forkert ud (maks. ${MAX_PRICE_KR} kr).`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    report: { storeId, productId, productName, price: input.price },
  };
}
