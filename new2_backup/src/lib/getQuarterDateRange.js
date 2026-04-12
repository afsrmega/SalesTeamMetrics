/**
 * Returns the normalized start and end dates for a given fiscal quarter and year.
 * SINGLE SOURCE OF TRUTH for fiscal quarters.
 * Q1: Dec 11 (previous year) - Mar 31
 * Q2: Apr 1 - Jun 30
 * Q3: Jul 1 - Sep 30
 * Q4: Oct 1 - Nov 30
 */
export const getQuarterDateRange = (year, quarterNumber) => {
  let start, end;
  
  switch (quarterNumber) {
    case 1:
      // Q1: Dec 11 (prev year) - Mar 31
      start = new Date(year - 1, 11, 11); // Month 11 is December
      end = new Date(year, 2, 31);        // Month 2 is March
      break;
    case 2:
      // Q2: Apr 1 - Jun 30
      start = new Date(year, 3, 1);
      end = new Date(year, 5, 30);
      break;
    case 3:
      // Q3: Jul 1 - Sep 30
      start = new Date(year, 6, 1);
      end = new Date(year, 8, 30);
      break;
    case 4:
      // Q4: Oct 1 - Nov 30
      start = new Date(year, 9, 1);
      end = new Date(year, 10, 30);       // Month 10 is November
      break;
    default:
      // Fallback
      start = new Date(year - 1, 11, 11);
      end = new Date(year, 10, 30);
  }
  
  // Normalize all quarter start times to 00:00:00.000
  start.setHours(0, 0, 0, 0);
  
  // Normalize all quarter end times to 23:59:59.999
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};