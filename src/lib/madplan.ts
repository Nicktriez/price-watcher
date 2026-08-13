export interface MealOption {
  templateId: string;
  name: string;
  cost: number;
}

export interface Madplan {
  meals: MealOption[];
  total: number;
  daysFilled: number;
  requestedDays: number;
  fits: boolean;
}

export function assembleMadplan(meals: MealOption[], budget: number, days: number): Madplan {
  const sorted = [...meals].sort((a, b) => a.cost - b.cost);
  const selected: MealOption[] = [];
  let total = 0;
  for (const meal of sorted) {
    if (selected.length >= days) break;
    if (total + meal.cost > budget) break;
    selected.push(meal);
    total += meal.cost;
  }
  return {
    meals: selected,
    total: Math.round(total * 100) / 100,
    daysFilled: selected.length,
    requestedDays: days,
    fits: selected.length >= days,
  };
}
