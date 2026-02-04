
export interface Habit {
  id: string;
  name: string;
  goal: number; 
  color: string;
  completions: string[]; // ISO YYYY-MM-DD
  type: 'daily' | 'weekly';
}

export interface DayProgress {
  date: string;
  completed: number;
  total: number;
}

export interface WeeklyStats {
  week: number;
  completed: number;
  goal: number;
  progress: number;
  color: string;
}
