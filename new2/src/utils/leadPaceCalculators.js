/**
 * Lead Pace Calculation Utilities
 * Calculates expected lead pace based on time of day and compares with actual progress
 */

/**
 * Returns the number of worked minutes so far today
 * Working hours: 8:00 AM - 12:00 PM (4 hours) and 1:00 PM - 5:00 PM (4 hours)
 * Total work day: 480 minutes (8 hours)
 * Lunch break: 12:00 PM - 1:00 PM (not counted)
 * 
 * @param {Date} now - Current time (defaults to new Date())
 * @returns {number|null} - Worked minutes or null if before work hours
 */
export function getWorkedMinutesToday(now = new Date()) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Before 8:00 AM - work hasn't started
  if (totalMinutes < 8 * 60) {
    return null;
  }

  // During lunch (12:00 PM - 1:00 PM)
  if (totalMinutes >= 12 * 60 && totalMinutes < 13 * 60) {
    return 4 * 60; // 240 minutes (morning session only)
  }

  // After 5:00 PM - work day complete
  if (totalMinutes >= 17 * 60) {
    return 480; // Full 8 hours
  }

  // Morning session: 8:00 AM - 12:00 PM
  if (totalMinutes < 12 * 60) {
    return totalMinutes - (8 * 60); // Minutes since 8:00 AM
  }

  // Afternoon session: 1:00 PM - 5:00 PM
  // Add morning session (4 hours = 240 minutes) + afternoon minutes worked
  const afternoonMinutes = totalMinutes - (13 * 60);
  return 240 + afternoonMinutes;
}

/**
 * Calculates expected number of leads by current time
 * Daily goal: 100 leads
 * Expected leads = (worked minutes / 480) * 100
 * 
 * @param {Date} now - Current time (defaults to new Date())
 * @returns {number|null} - Expected leads or null if work hasn't started
 */
export function getExpectedLeadsByTime(now = new Date()) {
  const workedMinutes = getWorkedMinutesToday(now);
  
  if (workedMinutes === null) {
    return null;
  }

  return (workedMinutes / 480) * 100;
}

/**
 * Determines lead pace status based on actual vs expected leads
 * 
 * @param {number} actualLeads - Number of leads worked today
 * @param {number|null} expectedLeads - Expected leads at current time
 * @returns {Object} - Status object with status, label, message, and variant
 */
export function getLeadPaceStatus(actualLeads, expectedLeads) {
  // Work hasn't started yet
  if (expectedLeads === null) {
    return {
      status: 'not_started',
      label: 'La jornada aún no inicia',
      message: 'El seguimiento comenzará a las 8:00 AM.',
      variant: 'default'
    };
  }

  const difference = actualLeads - expectedLeads;

  // Behind pace
  if (actualLeads < expectedLeads) {
    return {
      status: 'behind',
      label: 'Atrasado',
      message: 'Vas por debajo del ritmo esperado.',
      variant: 'destructive'
    };
  }

  // On track (within 10 leads ahead of expected)
  if (actualLeads >= expectedLeads && actualLeads < expectedLeads + 10) {
    return {
      status: 'on_track',
      label: 'Bien',
      message: 'Vas en buen ritmo.',
      variant: 'default'
    };
  }

  // Ahead of pace (10+ leads ahead)
  return {
    status: 'ahead',
    label: 'Adelantado con posibilidad de trabajar follow ups',
    message: 'Vas adelantado. Tienes posibilidad de trabajar follow ups.',
    variant: 'success'
  };
}

/**
 * Returns today's date as YYYY-MM-DD string
 * 
 * @returns {string} - Date string in YYYY-MM-DD format
 */
export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}