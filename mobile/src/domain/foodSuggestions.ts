import { GoalDirection } from './types';

export interface FoodPreset {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  tags: GoalDirection[];
}

export const FOOD_PRESETS: FoodPreset[] = [
  { name: 'Oats + milk (1 cup)', calories: 310, proteinG: 12, carbsG: 54, fatG: 6, tags: ['lose', 'maintain', 'gain'] },
  { name: 'Greek yogurt (200g)', calories: 130, proteinG: 18, carbsG: 8, fatG: 3, tags: ['lose', 'maintain'] },
  { name: 'Grilled chicken (150g)', calories: 248, proteinG: 46, carbsG: 0, fatG: 6, tags: ['lose', 'maintain', 'gain'] },
  { name: 'Rice, cooked (1 cup)', calories: 205, proteinG: 4, carbsG: 45, fatG: 0, tags: ['maintain', 'gain'] },
  { name: 'Eggs (2 large)', calories: 144, proteinG: 12, carbsG: 1, fatG: 10, tags: ['lose', 'maintain', 'gain'] },
  { name: 'Peanut butter (2 tbsp)', calories: 190, proteinG: 8, carbsG: 6, fatG: 16, tags: ['gain', 'maintain'] },
  { name: 'Banana', calories: 105, proteinG: 1, carbsG: 27, fatG: 0, tags: ['lose', 'maintain', 'gain'] },
  { name: 'Salmon (120g)', calories: 250, proteinG: 25, carbsG: 0, fatG: 16, tags: ['lose', 'maintain'] },
  { name: 'Apple', calories: 95, proteinG: 0, carbsG: 25, fatG: 0, tags: ['lose', 'maintain'] },
  { name: 'Whey shake (1 scoop)', calories: 120, proteinG: 24, carbsG: 3, fatG: 1, tags: ['lose', 'maintain', 'gain'] },
  { name: 'Mixed salad + chicken', calories: 350, proteinG: 32, carbsG: 15, fatG: 18, tags: ['lose', 'maintain'] },
  { name: 'Pasta bolognese (plate)', calories: 620, proteinG: 28, carbsG: 85, fatG: 18, tags: ['gain', 'maintain'] },
];

export function suggestionsFor(direction: GoalDirection): FoodPreset[] {
  return FOOD_PRESETS.filter((f) => f.tags.includes(direction));
}
