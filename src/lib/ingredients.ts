// Smart ingredient consolidation for shopping list.
export type RawIngredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
};

const CATEGORY_MAP: Record<string, string> = {
  tomate: "Verduras", tomates: "Verduras", lechuga: "Verduras", cebolla: "Verduras",
  ajo: "Verduras", zanahoria: "Verduras", papa: "Verduras", patata: "Verduras",
  pimiento: "Verduras", calabacin: "Verduras", brocoli: "Verduras", espinaca: "Verduras",
  manzana: "Frutas", platano: "Frutas", banana: "Frutas", naranja: "Frutas",
  limon: "Frutas", fresa: "Frutas", uva: "Frutas",
  pollo: "Carnes", carne: "Carnes", ternera: "Carnes", cerdo: "Carnes", jamon: "Carnes",
  pescado: "Pescados", salmon: "Pescados", atun: "Pescados", merluza: "Pescados",
  leche: "Lácteos", queso: "Lácteos", yogur: "Lácteos", mantequilla: "Lácteos", nata: "Lácteos",
  huevo: "Lácteos", huevos: "Lácteos",
  pan: "Panadería", harina: "Panadería",
  arroz: "Despensa", pasta: "Despensa", aceite: "Despensa", sal: "Despensa",
  azucar: "Despensa", vinagre: "Despensa", lentejas: "Despensa", garbanzos: "Despensa",
};

const UNIT_ALIASES: Record<string, string> = {
  g: "g", gr: "g", grs: "g", gramo: "g", gramos: "g",
  kg: "kg", kilo: "kg", kilos: "kg",
  ml: "ml", l: "l", litro: "l", litros: "l",
  cda: "cda", cdas: "cda", cucharada: "cda", cucharadas: "cda",
  cdita: "cdita", taza: "taza", tazas: "taza",
  ud: "ud", uds: "ud", unidad: "ud", unidades: "ud", pza: "ud", pzas: "ud",
};

const normalize = (s: string) =>
  s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const normalizeUnit = (u?: string | null) => {
  if (!u) return "";
  const n = normalize(u);
  return UNIT_ALIASES[n] ?? n;
};

export function categorize(name: string): string {
  const n = normalize(name);
  for (const key of Object.keys(CATEGORY_MAP)) {
    if (n.includes(key)) return CATEGORY_MAP[key];
  }
  return "Otros";
}

export type ConsolidatedItem = {
  name: string;
  category: string;
  quantity: number | null;
  unit: string;
};

/** Consolidate ingredients from multiple recipes into a clean shopping list. */
export function consolidate(items: RawIngredient[]): ConsolidatedItem[] {
  const map = new Map<string, ConsolidatedItem>();
  for (const it of items) {
    if (!it.name) continue;
    const name = normalize(it.name);
    const unit = normalizeUnit(it.unit);
    const key = `${name}|${unit}`;
    const cat = it.category ?? categorize(it.name);
    const existing = map.get(key);
    if (existing) {
      if (it.quantity != null && existing.quantity != null) existing.quantity += Number(it.quantity);
      else if (it.quantity != null) existing.quantity = Number(it.quantity);
    } else {
      map.set(key, {
        name: it.name.trim(),
        category: cat,
        quantity: it.quantity != null ? Number(it.quantity) : null,
        unit,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );
}

export function formatForWhatsApp(items: { name: string; quantity: number | null; unit: string | null; category: string; checked: boolean }[]): string {
  const groups = new Map<string, typeof items>();
  for (const it of items) {
    if (it.checked) continue;
    if (!groups.has(it.category)) groups.set(it.category, []);
    groups.get(it.category)!.push(it);
  }
  const lines: string[] = ["🛒 *Lista de compras — Pla.to*", ""];
  for (const [cat, list] of groups) {
    lines.push(`*${cat}*`);
    for (const it of list) {
      const qty = it.quantity != null ? `${it.quantity}${it.unit ? " " + it.unit : ""} ` : "";
      lines.push(`• ${qty}${it.name}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
