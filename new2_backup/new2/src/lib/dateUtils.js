import { startOfDay, endOfDay, format } from 'date-fns';

export const normalizeToLocalDate = (timestamp) => {
  if (!timestamp) return null;
  return new Date(timestamp);
};

export const getDayBoundaries = (date) => {
  if (!date) return { start: null, end: null };
  const d = new Date(date);
  return {
    start: startOfDay(d),
    end: endOfDay(d)
  };
};

export const getQualificationBucket = (score) => {
  const num = Number(score);
  if (isNaN(num)) return 'Unknown';
  if (num >= 1 && num <= 4) return 'Cold';
  if (num >= 5 && num <= 7) return 'Warm';
  if (num >= 8 && num <= 10) return 'Hot';
  return 'Unknown';
};

export const formatDateForCalendar = (date) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd');
};