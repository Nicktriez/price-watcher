// The fixed template set (seeded by migration 0011). Shared so the migration
// seeds exactly what the backfill/template tooling knows about — the item
// `name` is the human anchor (free_text) that the resolver works from, and the
// source of truth for restoring anchors if they're ever lost (Task 038y).

export interface TemplateItemSeed {
  name: string;
  match: string | null;
  quantity: number | null;
  unit: string | null;
}

export interface TemplateSeed {
  name: string;
  kind: string;
  items: TemplateItemSeed[];
}

export const TEMPLATES: TemplateSeed[] = [
  {
    name: "Lasagne",
    kind: "recipe",
    items: [
      { name: "Lasagneplader", match: "%lasagneplader%", quantity: 1, unit: "pk" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 400, unit: "g" },
      { name: "Hakkede tomater", match: "%hakkede tomater%", quantity: 2, unit: "dåser" },
      { name: "Løg", match: null, quantity: 2, unit: "stk" },
      { name: "Hvidløg", match: null, quantity: 2, unit: "stk" },
      { name: "Revet ost", match: "%revet ost%", quantity: 150, unit: "g" },
      { name: "Mælk", match: null, quantity: 5, unit: "dl" },
    ],
  },
  {
    name: "Frikadeller + kartofler",
    kind: "recipe",
    items: [
      { name: "Hakket svinekød", match: null, quantity: 500, unit: "g" },
      { name: "Kartofler", match: "%kartofler%", quantity: 1, unit: "kg" },
      { name: "Æg", match: null, quantity: 2, unit: "stk" },
      { name: "Løg", match: null, quantity: 1, unit: "stk" },
      { name: "Hvedemel", match: null, quantity: 100, unit: "g" },
      { name: "Mælk", match: null, quantity: 1, unit: "dl" },
    ],
  },
  {
    name: "Taco-fredag",
    kind: "recipe",
    items: [
      { name: "Taco shells", match: null, quantity: 1, unit: "pk" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 400, unit: "g" },
      { name: "Salsa", match: "%salsa%", quantity: 1, unit: "glas" },
      { name: "Revet ost", match: "%revet ost%", quantity: 150, unit: "g" },
      { name: "Majs", match: null, quantity: 1, unit: "dåse" },
      { name: "Salat", match: null, quantity: 1, unit: "stk" },
    ],
  },
  {
    name: "Kødsovs",
    kind: "recipe",
    items: [
      { name: "Spaghetti", match: "%spaghetti%", quantity: 500, unit: "g" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 500, unit: "g" },
      { name: "Hakkede tomater", match: "%hakkede tomater%", quantity: 2, unit: "dåser" },
      { name: "Løg", match: null, quantity: 2, unit: "stk" },
      { name: "Hvidløg", match: null, quantity: 2, unit: "stk" },
      { name: "Tomatpuré", match: "%tomatpuré%", quantity: 1, unit: "tube" },
    ],
  },
  {
    name: "Cleaning cupboard",
    kind: "cleaning",
    items: [
      { name: "Opvaskemiddel", match: "%opvaskemiddel%", quantity: 1, unit: "flaske" },
      { name: "Skyllemiddel", match: "%skyllemiddel%", quantity: 1, unit: "flaske" },
      { name: "Vaskemiddel", match: "%vaskemiddel%", quantity: 1, unit: "pose" },
      { name: "Opvaskesvampe", match: null, quantity: 1, unit: "pk" },
      { name: "Mikrofiberklude", match: null, quantity: 1, unit: "pk" },
      { name: "Køkkenrulle", match: null, quantity: 1, unit: "pk" },
    ],
  },
  {
    name: "Student-budget",
    kind: "custom",
    items: [
      { name: "Spaghetti", match: "%spaghetti%", quantity: 1, unit: "kg" },
      { name: "Ris", match: null, quantity: 1, unit: "kg" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 500, unit: "g" },
      { name: "Æg", match: null, quantity: 10, unit: "stk" },
      { name: "Havregryn", match: "%havregryn%", quantity: 1, unit: "kg" },
      { name: "Kaffe", match: "%kaffe%", quantity: 1, unit: "pk" },
    ],
  },
  {
    name: "Burger-fredag",
    kind: "recipe",
    items: [
      { name: "Burgerboller", match: "%burgerbolle%", quantity: 4, unit: "stk" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 500, unit: "g" },
      { name: "Ost til burger", match: null, quantity: 4, unit: "skiver" },
      { name: "Bacon", match: null, quantity: 1, unit: "pk" },
      { name: "Salat", match: null, quantity: 1, unit: "stk" },
      { name: "Tomat", match: null, quantity: 2, unit: "stk" },
    ],
  },
  {
    name: "Ugens grøntsager",
    kind: "custom",
    items: [
      { name: "Kartofler", match: "%kartofler%", quantity: 2, unit: "kg" },
      { name: "Gulerødder", match: null, quantity: 1, unit: "kg" },
      { name: "Løg", match: null, quantity: 1, unit: "kg" },
      { name: "Broccoli", match: "%broccoli%", quantity: 1, unit: "stk" },
      { name: "Spinat", match: null, quantity: 1, unit: "pose" },
    ],
  },
];
