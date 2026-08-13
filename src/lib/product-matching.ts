const BRAND_PREFIXES = ["rema 1000"];

export function normalizeName(heading: string): string {
  let name = heading.toLowerCase().trim().replace(/\s+/g, " ");
  name = name.replace(/[–—]/g, "-");

  for (const brand of BRAND_PREFIXES) {
    if (name.startsWith(`${brand} `)) {
      name = name.slice(brand.length).trim();
      break;
    }
  }

  for (;;) {
    const before = name;
    name = name.replace(/\s*\(?\d+(?:-\d+)?\s*(?:kg|g|ml|cl|liter|litre|stk|pcs|l)s?\s*\)?$/, "");
    name = name.replace(/\s*\d+(?:-\d+)?%$/, "");
    name = name.replace(/[\s*¹²³]+$/, "");
    if (name === before) break;
  }

  return name.trim();
}

export interface OfferLike {
  id: string;
  product_id: string;
  dealer_id: string;
  heading: string;
}

export interface LinkDecision {
  offerId: string;
  fromProductId: string;
  toProductId: string;
}

export function linkProducts(offers: OfferLike[]): LinkDecision[] {
  const groups = new Map<string, OfferLike[]>();
  for (const offer of offers) {
    const key = normalizeName(offer.heading);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(offer);
    groups.set(key, list);
  }

  const decisions: LinkDecision[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const counts = new Map<string, number>();
    for (const offer of group) {
      counts.set(offer.product_id, (counts.get(offer.product_id) ?? 0) + 1);
    }
    if (counts.size < 2) continue;

    let canonical = "";
    let best = 0;
    for (const [productId, n] of counts) {
      if (n > best || (n === best && (canonical === "" || productId < canonical))) {
        canonical = productId;
        best = n;
      }
    }

    for (const offer of group) {
      if (offer.product_id !== canonical) {
        decisions.push({
          offerId: offer.id,
          fromProductId: offer.product_id,
          toProductId: canonical,
        });
      }
    }
  }

  return decisions;
}

export function matchProductName(
  products: { id: string; name: string }[],
  itemName: string,
): string | null {
  const key = normalizeName(itemName);
  if (!key) return null;
  for (const product of products) {
    if (normalizeName(product.name) === key) return product.id;
  }
  return null;
}
