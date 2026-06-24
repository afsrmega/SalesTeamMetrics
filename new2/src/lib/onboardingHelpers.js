/**
 * src/lib/onboardingHelpers.js
 * 
 * Helper functions to calculate effective goals for new sales team members during their onboarding period.
 * 
 * Example: A new member starts in April 2026 (new_member_start_date = '2026-04-01').
 * - April (Month 1): Base Goal * 0.25 (25%)
 * - May (Month 2): Base Goal * 0.50 (50%)
 * - June (Month 3): Base Goal * 0.75 (75%)
 * - July+ (Month 4+): Base Goal * 1.00 (100%)
 */

import { differenceInCalendarMonths, parseISO, startOfMonth } from 'date-fns';
import { getQuarterDateRange } from './getQuarterDateRange';

/**
 * Calculates the onboarding multiplier based on elapsed months.
 * @param {Date|string} startDate - The date the member started
 * @param {Date|string} targetDate - The target month for calculation
 * @returns {number} Multiplier (0.25, 0.50, 0.75, or 1.0)
 */
export const getOnboardingMultiplierForMonth = (startDate, targetDate) => {
  try {
    const start = startOfMonth(typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate));
    const target = startOfMonth(typeof targetDate === 'string' ? parseISO(targetDate) : new Date(targetDate));
    
    if (isNaN(start.getTime()) || isNaN(target.getTime())) return 1.0;
    if (target < start) return 0; // Future date relative to target, technically shouldn't happen but safe fallback

    const monthsElapsed = differenceInCalendarMonths(target, start);
    
    if (monthsElapsed === 0) return 0.25;
    if (monthsElapsed === 1) return 0.50;
    if (monthsElapsed === 2) return 0.75;
    return 1.00;
  } catch (error) {
    console.error('Error calculating onboarding multiplier:', error);
    return 1.00;
  }
};

/**
 * Gets the adjusted monthly goal for a member.
 * @param {Object} memberRow - The member record from sales_team
 * @param {number} baseGoal - The standard goal for the period
 * @param {string} periodMode - 'month' or 'quarter'
 * @param {string} periodKey - 'YYYY-MM' or 'FY{YYYY}-Q{Q}'
 * @returns {number} The effective goal
 */
export const getEffectiveGoalForMember = (memberRow, baseGoal, periodMode, periodKey) => {
  if (!memberRow?.is_new_member || !memberRow?.new_member_start_date) {
    return baseGoal;
  }

  if (!periodKey || !baseGoal) return baseGoal;

  try {
    if (periodMode === 'month') {
      let targetDate;
      if (periodKey === 'current') {
        targetDate = new Date();
      } else {
        const [year, month] = periodKey.split('-');
        targetDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      }
      const multiplier = getOnboardingMultiplierForMonth(memberRow.new_member_start_date, targetDate);
      return baseGoal * multiplier;
    }

    if (periodMode === 'quarter') {
      // Treat baseGoal as the total quarter goal, so monthly is baseGoal / 3
      return getEffectiveQuarterGoalForMember(memberRow, baseGoal / 3, periodKey);
    }
  } catch (error) {
    console.error('Error getting effective goal:', error);
  }

  return baseGoal;
};

/**
 * Gets the adjusted quarterly goal by summing the adjusted goals for each month in the quarter.
 * @param {Object} memberRow - The member record from sales_team
 * @param {number} monthlyGoal - The standard monthly goal amount
 * @param {string} quarterKey - The quarter key e.g., 'FY2026-Q2' or '2026-2'
 * @returns {number} The effective quarter goal
 */
export const getEffectiveQuarterGoalForMember = (memberRow, monthlyGoal, quarterKey) => {
  if (!memberRow?.is_new_member || !memberRow?.new_member_start_date) {
    return monthlyGoal * 3;
  }

  try {
    let year, quarter;
    if (quarterKey === 'current') {
      const now = new Date();
      year = now.getFullYear();
      quarter = Math.floor(now.getMonth() / 3) + 1;
    } else {
      const parts = quarterKey.replace('FY', '').split('-Q');
      if (parts.length === 2) {
        year = parseInt(parts[0]);
        quarter = parseInt(parts[1]);
      } else {
        const altParts = quarterKey.split('-');
        year = parseInt(altParts[0]);
        quarter = parseInt(altParts[1]);
      }
    }

    const { start } = getQuarterDateRange(year, quarter);
    const startMonth = new Date(start);
    
    let totalQuarterGoal = 0;
    
    // Sum up the 3 months of the quarter
    for (let i = 0; i < 3; i++) {
      const targetMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const multiplier = getOnboardingMultiplierForMonth(memberRow.new_member_start_date, targetMonth);
      totalQuarterGoal += (monthlyGoal * multiplier);
    }

    return totalQuarterGoal;
  } catch (error) {
    console.error('Error getting effective quarter goal:', error);
    return monthlyGoal * 3;
  }
};