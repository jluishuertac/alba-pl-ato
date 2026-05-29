// Alba — asistente inteligente de Pla.to.
// Arquitectura desacoplada: las implementaciones reales se enchufarán
// más adelante a un proveedor (Gemini / OpenAI / Claude) a través de
// `AlbaProvider`. Por ahora devolvemos respuestas deterministas y útiles
// generadas localmente para que toda la UI funcione end-to-end.

export type AlbaMeal = "breakfast" | "lunch" | "dinner" | "snack";

export type AlbaIngredient = { name: string; quantity?: number; unit?: string };
export type AlbaStep = { text: string };

export type AlbaRecipe = {
  title: string;
  description: string;
  category: AlbaMeal;
  servings: number;
  prep_minutes: number;
  ingredients: AlbaIngredient[];
  steps: AlbaStep[];
};

export type AlbaProfileContext = {
  household_size?: number | null;
  dietary_preferences?: string[] | null;
  dietary_restrictions?: string[] | null;
  goal?: string | null;
  cooking_level?: string | null;
  time_available?: string | null;
};

export type GenerateRecipeInput = {
  ingredients: string[];
  servings: number;
  meal: AlbaMeal;
  profile?: AlbaProfileContext;
};

export type GenerateWeeklyPlanInput = {
  weekStartISO: string;
  recipes: { id: string; title: string; category?: string | null }[];
  profile?: AlbaProfileContext;
};

export type WeeklyPlanEntry = { date: string; meal: AlbaMeal; recipeId: string };

export type OptimizeShoppingInput = {
  items: { id: string; name: string; quantity: number | null; unit: string | null; category: string }[];
};

export type OptimizeShoppingResult = {
  removed: string[];
  merged: { name: string; quantity: number | null; unit: string | null; category: string; from: string[] }[];
  substitutions: { original: string; suggestion: string; reason: string }[];
};

export type AlbaProvider = {
  name: string;
  generateRecipe(input: GenerateRecipeInput): Promise<AlbaRecipe>;
  generateWeeklyPlan(input: GenerateWeeklyPlanInput): Promise<WeeklyPlanEntry[]>;
  optimizeShoppingList(input: OptimizeShoppingInput): Promise<OptimizeShoppingResult>;
  suggestRecipes(profile?: AlbaProfileContext): Promise<{ title: string; reason: string; category: AlbaMeal }[]>;
};

// ---------- Local fallback provider ----------

const CATEGORY_TIME: Record<AlbaMeal, number> = {
  breakfast: 15, lunch: 30, dinner: 35, snack: 10,
};

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickName(meal: AlbaMeal, ingredients: string[]): string {
  const star = ingredients[0] ? titleCase(ingredients[0]) : "Casero";
  const map: Record<AlbaMeal, string> = {
    breakfast: `Bowl mañanero de ${star}`,
    lunch: `${star} salteado con verduras`,
    dinner: `${star} al horno con guarnición`,
    snack: `Snack rápido de ${star}`,
  };
  return map[meal];
}

export const localAlbaProvider: AlbaProvider = {
  name: "alba-local",

  async generateRecipe({ ingredients, servings, meal, profile }) {
    const clean = ingredients.map((s) => s.trim()).filter(Boolean);
    const base: AlbaIngredient[] = clean.map((n, i) => ({
      name: n,
      quantity: i === 0 ? servings * 100 : Math.max(1, Math.round(servings * (i === 1 ? 50 : 20))),
      unit: i === 0 ? "g" : i === 1 ? "g" : "ud",
    }));
    if (!base.find((b) => /aceite/i.test(b.name))) base.push({ name: "Aceite de oliva", quantity: 2, unit: "cda" });
    if (!base.find((b) => /sal/i.test(b.name))) base.push({ name: "Sal y pimienta", unit: "al gusto" });

    const fast = profile?.time_available === "menos de 15 min" || profile?.time_available === "15-30 min";
    const time = Math.max(10, CATEGORY_TIME[meal] - (fast ? 10 : 0));

    return {
      title: pickName(meal, clean),
      description: `Una idea de ${meal} pensada para ${servings} ${servings === 1 ? "persona" : "personas"}. ${
        profile?.goal ? `Alineada con tu objetivo de ${profile.goal.toLowerCase()}.` : ""
      }`.trim(),
      category: meal,
      servings,
      prep_minutes: time,
      ingredients: base,
      steps: [
        { text: "Prepara y pesa los ingredientes." },
        { text: `Calienta una sartén con aceite a fuego medio.` },
        { text: `Añade ${clean[0] ?? "los ingredientes principales"} y cocina 5-8 minutos.` },
        { text: `Incorpora el resto de ingredientes y mezcla bien.` },
        { text: `Salpimenta, sirve y disfruta.` },
      ],
    };
  },

  async generateWeeklyPlan({ weekStartISO, recipes }) {
    if (recipes.length === 0) return [];
    const meals: AlbaMeal[] = ["breakfast", "lunch", "dinner"];
    const out: WeeklyPlanEntry[] = [];
    const start = new Date(weekStartISO);
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(date.getDate() + d);
      const iso = date.toISOString().slice(0, 10);
      for (const meal of meals) {
        const idx = (d * meals.length + meals.indexOf(meal)) % recipes.length;
        out.push({ date: iso, meal, recipeId: recipes[idx].id });
      }
    }
    return out;
  },

  async optimizeShoppingList({ items }) {
    const groups = new Map<string, typeof items>();
    for (const it of items) {
      const key = it.name.toLowerCase().trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    const merged: OptimizeShoppingResult["merged"] = [];
    const removed: string[] = [];
    for (const [, list] of groups) {
      if (list.length > 1) {
        const first = list[0];
        const totalQty = list.reduce((acc, x) => acc + (x.quantity ?? 0), 0);
        merged.push({
          name: first.name,
          quantity: totalQty || null,
          unit: first.unit,
          category: first.category,
          from: list.map((l) => l.id),
        });
        removed.push(...list.slice(1).map((l) => l.id));
      }
    }
    const substitutions = items
      .filter((i) => /nata|crema/i.test(i.name))
      .slice(0, 1)
      .map((i) => ({ original: i.name, suggestion: "Yogur griego natural", reason: "Más ligero, mismo cremoso." }));
    return { removed, merged, substitutions };
  },

  async suggestRecipes(profile) {
    const fast = profile?.time_available === "menos de 15 min";
    return [
      { title: "Wok de pollo y verduras", reason: fast ? "Listo en 12 min." : "Equilibrado y rápido.", category: "lunch" },
      { title: "Bowl de avena y frutos rojos", reason: "Energía para empezar el día.", category: "breakfast" },
      { title: "Salmón al horno con limón", reason: "Alto en omega-3.", category: "dinner" },
    ];
  },
};

// Punto único de acceso. Cambiar `provider` para conectar Gemini/OpenAI/Claude.
let provider: AlbaProvider = localAlbaProvider;

export function setAlbaProvider(p: AlbaProvider) { provider = p; }

export const Alba = {
  generateRecipe: (i: GenerateRecipeInput) => provider.generateRecipe(i),
  generateWeeklyPlan: (i: GenerateWeeklyPlanInput) => provider.generateWeeklyPlan(i),
  optimizeShoppingList: (i: OptimizeShoppingInput) => provider.optimizeShoppingList(i),
  suggestRecipes: (p?: AlbaProfileContext) => provider.suggestRecipes(p),
};
