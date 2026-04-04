import { DEFAULT_RATES } from './globalSettingsService';
import { getQuarterDateRange } from './getQuarterDateRange';

export { getQuarterDateRange }; // Re-export for compatibility with other files importing it from here

export const formatCurrency = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? "$0.00" : num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const getProgressColor = (percent) => {
  if (isNaN(percent) || percent < 0) percent = 0;
  if (percent >= 100) return "text-green-600";
  if (percent >= 50) return "text-yellow-600";
  return "text-red-600";
};

export const getBarColor = (value, threshold, target) => {
  const val = parseFloat(value);
  const thr = parseFloat(threshold);
  const tar = parseFloat(target);

  if (isNaN(val)) return "#ef4444"; 

  if (tar > 0 && val >= tar) return "#22c55e"; 
  if (thr > 0 && val >= thr) return "#3b82f6"; 
  if (val > 0) return "#f59e0b"; 
  return "#ef4444"; 
};

export const calculateAchievementPercentage = (totalSales, quota) => {
  const salesVal = parseFloat(totalSales) || 0;
  const quotaVal = parseFloat(quota) || 0;
  if (quotaVal <= 0) return 0;
  return (salesVal / quotaVal) * 100;
};

export const getBillingRate = (location, propertyType, billingRates = DEFAULT_RATES) => {
  const loc = location ? location.trim().toLowerCase() : '';
  const type = propertyType ? propertyType.trim().toLowerCase() : '';
  
  const isTX = loc === 'tx' || loc === 'texas';
  const isRes = type === 'residential' || type === 'residencial';

  const rates = { ...DEFAULT_RATES, ...billingRates };

  if (isTX) {
    return isRes ? rates.tx_res_rate : rates.tx_comm_rate;
  } else {
    return isRes ? rates.natl_res_rate : rates.natl_comm_rate;
  }
};

export const calculateBillingAmount = (salesValue, billingRates, propertyType, state) => {
  const val = parseFloat(salesValue) || 0;
  const rate = getBillingRate(state, propertyType, billingRates);
  return val * rate;
};

export const calculateCommissionWithTiers = (billingAmount, quota, commissionTiers) => {
    const val = parseFloat(billingAmount) || 0;
    const target = parseFloat(quota) || 1;
    
    const quotaPercentage = (val / target) * 100;
    
    let appliedRate = 0;
    let tierRange = "None";
    
    if (commissionTiers && Array.isArray(commissionTiers) && commissionTiers.length > 0) {
        const match = commissionTiers.find(tier => {
            const min = parseFloat(tier.min);
            const max = parseFloat(tier.max);
            return quotaPercentage >= min && quotaPercentage <= max;
        });
        
        if (match) {
            appliedRate = parseFloat(match.rate);
            tierRange = `${match.min}% - ${match.max}%`;
        } else {
             const lastTier = commissionTiers[commissionTiers.length - 1];
             if (lastTier && quotaPercentage > parseFloat(lastTier.max)) {
                 appliedRate = parseFloat(lastTier.rate);
                 tierRange = `> ${lastTier.max}%`;
             }
        }
    }
    
    const commissionAmount = val * (appliedRate / 100);

    return {
        commissionAmount,
        quotaPercentage,
        appliedRate,
        tierRange
    };
};

export const calculateCommission = (accomplished, globalSettings) => {
    if (!globalSettings) return { rate: 0, commissionAmount: 0, qualified: false };
    
    const threshold = parseFloat(globalSettings.commission_threshold) || 16000000;
    const percentage = parseFloat(globalSettings.commission_percentage) || 0.01;
    const val = parseFloat(accomplished) || 0;
    
    if (val >= threshold) {
        return { rate: (percentage * 100).toFixed(2), commissionAmount: val * percentage, qualified: true };
    }
    return { rate: 0, commissionAmount: 0, qualified: false };
};

export const calculateNonResidentialSales = (salesRecords) => {
  if (!Array.isArray(salesRecords)) return 0;
  
  return salesRecords.reduce((total, record) => {
    const type = record.property_type;
    const normalizedType = type ? type.trim().toLowerCase() : '';
    
    if (normalizedType === 'residencial' || normalizedType === 'residential') {
      return total;
    }
    
    return total + (parseFloat(record.value) || 0);
  }, 0);
};

export const getCustomQuarter = (date = new Date()) => {
  const year = date.getFullYear();

  // Check current year's quarters (1-4)
  for (let q = 1; q <= 4; q++) {
    const { start, end } = getQuarterDateRange(year, q);
    if (date >= start && date <= end) {
      return _formatQuarterResult(start, end, q, year);
    }
  }

  // Check next year's Q1 (since dates in late Dec belong to next year's Q1)
  const nextYearQ1 = getQuarterDateRange(year + 1, 1);
  if (date >= nextYearQ1.start && date <= nextYearQ1.end) {
    return _formatQuarterResult(nextYearQ1.start, nextYearQ1.end, 1, year + 1);
  }

  // Fallback
  const { start, end } = getQuarterDateRange(year, 1);
  return _formatQuarterResult(start, end, 1, year);
};

const _formatQuarterResult = (start, end, q, year) => {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const rangeLabel = `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}`;
  return {
    quarter: q,
    year: year,
    quarterStart: start,
    quarterEnd: end,
    quarterLabel: `Q${q} FY${year}`,
    quarterRangeLabel: rangeLabel
  };
};

export const calculateAmountRemaining = (currentValue, goal) => {
  const diff = parseFloat(goal) - parseFloat(currentValue);
  return diff > 0 ? diff : 0;
};

export const calculateDaysInPeriod = (period) => {
  const now = new Date();
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  } else if (period === 'quarter') {
    const { quarterStart, quarterEnd } = getCustomQuarter(now);
    const diffTime = Math.abs(quarterEnd - quarterStart);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 30; // fallback
};

export const calculateDaysElapsed = (period) => {
  const now = new Date();
  if (period === 'month') {
    return now.getDate();
  } else if (period === 'quarter') {
    const { quarterStart } = getCustomQuarter(now);
    const diffTime = now - quarterStart;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  return 15; // fallback
};

export const calculateRunRateStatus = (currentValue, goal, period) => {
  const val = parseFloat(currentValue) || 0;
  const tar = parseFloat(goal) || 1;
  const currentPercent = val / tar;
  
  const elapsed = calculateDaysElapsed(period);
  const total = calculateDaysInPeriod(period);
  const expectedPercent = elapsed / total;
  
  if (currentPercent >= expectedPercent) return "Adelantado";
  if (currentPercent >= expectedPercent - 0.1) return "En línea"; // 10% margin
  return "Atrasado";
};