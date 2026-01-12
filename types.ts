
export interface UserProfile {
  name: string;
  weight: number; // in kg
  height: number; // in cm
  age: number;
  gender: 'male' | 'female';
  goal: 'lose' | 'maintain' | 'gain';
  targetChangeKg?: number; // Metas de peso (ex: perder 5kg)
  durationWeeks?: number;   // Em quanto tempo
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number; // per 100g or unit
  unit: string;
}

export interface LoggedFood {
  id: string;
  foodId: string;
  name: string;
  calories: number;
  timestamp: number;
}

export interface DailyStats {
  waterDrank: number; // in ml
  foods: LoggedFood[];
}
