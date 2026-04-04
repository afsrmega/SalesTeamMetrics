
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { getCustomQuarter } from './salesUtils';

/**
 * Applies the residential toggle to a list of records.
 * If includeResidential is true, returns all.
 * If false, filters out 'residential' or 'residencial'.
 */
export const applyResidentialToggle = (records, includeResidential) => {
  if (!Array.isArray(records)) return [];
  if (includeResidential) return records;
  
  return records.filter(record => {
    const pt = (record.property_type || '').trim().toLowerCase();
    return pt !== 'residential' && pt !== 'residencial';
  });
};

/**
 * Calculates the exact start and end Date objects for a given mode.
 */
export const calculateDateRange = (mode, customStart, customEnd) => {
  const today = new Date();
  
  switch (mode) {
    case 'hoy':
      return { start: startOfDay(today), end: endOfDay(today) };
    case 'ayer':
      return { start: startOfDay(subDays(today, 1)), end: endOfDay(subDays(today, 1)) };
    case '7dias':
      return { start: startOfDay(subDays(today, 6)), end: endOfDay(today) };
    case '30dias':
      return { start: startOfDay(subDays(today, 29)), end: endOfDay(today) };
    case 'mes':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case 'trimestre': {
      const { quarterStart, quarterEnd } = getCustomQuarter(today);
      return { start: quarterStart, end: quarterEnd };
    }
    case 'custom':
      return {
        start: customStart ? startOfDay(new Date(customStart)) : null,
        end: customEnd ? endOfDay(new Date(customEnd)) : null
      };
    default:
      return null;
  }
};

/**
 * Filters sales records based on the given date range and residential toggle.
 */
export const filterSalesRecords = (records, dateRange, includeResidential) => {
  if (!Array.isArray(records)) return [];

  const toggledRecords = applyResidentialToggle(records, includeResidential);

  return toggledRecords.filter(record => {
    // Date range filter
    if (dateRange && dateRange.start && dateRange.end) {
      const recordDate = new Date(record.created_at);
      if (recordDate < dateRange.start || recordDate > dateRange.end) {
        return false;
      }
    }
    return true;
  });
};
