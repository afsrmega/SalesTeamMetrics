/**
 * Validates the existence and structure of billing rates and commission tiers.
 * @param {object} globalSettings - The global settings object from context or DB.
 * @returns {object} { isValid: boolean, errors: array, warnings: array }
 */
export const validateBillingRates = (globalSettings) => {
  const errors = [];
  const warnings = [];

  if (!globalSettings) {
    errors.push("Global Settings object is missing or undefined.");
    return { isValid: false, errors, warnings };
  }

  // Validate Billing Rates
  const rateFields = ['natl_res_rate', 'natl_comm_rate', 'tx_res_rate', 'tx_comm_rate'];
  const missingRates = [];

  rateFields.forEach(field => {
    if (globalSettings[field] === undefined || globalSettings[field] === null) {
      missingRates.push(field);
    } else if (typeof globalSettings[field] !== 'number' && isNaN(parseFloat(globalSettings[field]))) {
      errors.push(`Billing rate '${field}' is not a valid number.`);
    }
  });

  if (missingRates.length > 0) {
    warnings.push(`Missing billing rates, using defaults for: ${missingRates.join(', ')}`);
  }

  // Validate Commission Tiers
  if (!globalSettings.commission_tiers || !Array.isArray(globalSettings.commission_tiers)) {
    errors.push("Commission tiers are missing or invalid (must be an array).");
  } else if (globalSettings.commission_tiers.length === 0) {
    warnings.push("Commission tiers array is empty.");
  } else {
    // Check structure of first tier as sample
    const sample = globalSettings.commission_tiers[0];
    if (sample.min === undefined || sample.max === undefined || sample.rate === undefined) {
      errors.push("Commission tiers missing required fields (min, max, rate).");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};