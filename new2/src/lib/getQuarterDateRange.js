
export const DEFAULT_QUARTER_DEFINITIONS = {
  Q1: { startMonth: 12, startDay: 11, startYearOffset: -1, endMonth: 3, endDay: 31, endYearOffset: 0 },
  Q2: { startMonth: 4, startDay: 1, startYearOffset: 0, endMonth: 6, endDay: 30, endYearOffset: 0 },
  Q3: { startMonth: 7, startDay: 1, startYearOffset: 0, endMonth: 9, endDay: 30, endYearOffset: 0 },
  Q4: { startMonth: 10, startDay: 1, startYearOffset: 0, endMonth: 11, endDay: 30, endYearOffset: 0 }
};

export const normalizeQuarterDefinitions = (defs) => {
  if (!defs || typeof defs !== 'object') return DEFAULT_QUARTER_DEFINITIONS;
  const normalized = {};
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    const defaultQ = DEFAULT_QUARTER_DEFINITIONS[q];
    const userQ = defs[q] || {};
    normalized[q] = {
      startMonth: userQ.startMonth ? Math.max(1, Math.min(12, userQ.startMonth)) : defaultQ.startMonth,
      startDay: userQ.startDay ? Math.max(1, Math.min(31, userQ.startDay)) : defaultQ.startDay,
      startYearOffset: typeof userQ.startYearOffset === 'number' ? userQ.startYearOffset : defaultQ.startYearOffset,
      endMonth: userQ.endMonth ? Math.max(1, Math.min(12, userQ.endMonth)) : defaultQ.endMonth,
      endDay: userQ.endDay ? Math.max(1, Math.min(31, userQ.endDay)) : defaultQ.endDay,
      endYearOffset: typeof userQ.endYearOffset === 'number' ? userQ.endYearOffset : defaultQ.endYearOffset
    };
  });
  return normalized;
};

export const getQuarterDateRange = (year, quarterNumber, quarterDefinitions = DEFAULT_QUARTER_DEFINITIONS) => {
  const defs = normalizeQuarterDefinitions(quarterDefinitions);
  const qDef = defs[`Q${quarterNumber}`] || defs.Q1;
  
  const start = new Date(year + qDef.startYearOffset, qDef.startMonth - 1, qDef.startDay);
  const end = new Date(year + qDef.endYearOffset, qDef.endMonth - 1, qDef.endDay);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
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

export const getCustomQuarter = (date = new Date(), quarterDefinitions = DEFAULT_QUARTER_DEFINITIONS) => {
  const year = date.getFullYear();
  const defs = normalizeQuarterDefinitions(quarterDefinitions);

  const candidateYears = [year - 1, year, year + 1];

  for (const candidateYear of candidateYears) {
    for (let q = 1; q <= 4; q++) {
      const { start, end } = getQuarterDateRange(candidateYear, q, defs);
      if (date >= start && date <= end) {
        return _formatQuarterResult(start, end, q, candidateYear);
      }
    }
  }

  const { start, end } = getQuarterDateRange(year, 1, defs);
  return _formatQuarterResult(start, end, 1, year);
};
