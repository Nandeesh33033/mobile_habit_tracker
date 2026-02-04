
import { format, endOfMonth, eachDayOfInterval, endOfWeek } from 'date-fns';

// Helper to get start of day (00:00:00)
export const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper to get start of week (Sunday)
export const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day;
  const result = new Date(d.setDate(diff));
  result.setHours(0, 0, 0, 0);
  return result;
};

// Helper to get start of year
export const startOfYear = (date: Date) => {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
};

// Helper to check if a date is within an interval
export const isWithinInterval = (date: Date, interval: { start: Date; end: Date }) => {
  const time = date.getTime();
  const start = interval.start.getTime();
  const end = interval.end.getTime();
  return time >= start && time <= end;
};

export const getDaysInMonth = (date: Date) => {
  return eachDayOfInterval({
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: endOfMonth(date),
  });
};

export const getWeeksInMonth = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = endOfMonth(date);
  const weeks = [];
  
  let current = startOfWeek(start);
  
  while (current <= end) {
    weeks.push({
      start: new Date(current),
      end: endOfWeek(current)
    });
    current.setDate(current.getDate() + 7);
  }
  return weeks;
};

export const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

export const generateId = () => Math.random().toString(36).substr(2, 9);
