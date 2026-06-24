export const convertUsdToCop = (usdAmount, conversionRate) => {
  if (usdAmount === null || usdAmount === undefined || isNaN(usdAmount) || usdAmount < 0) return 0;
  if (conversionRate === null || conversionRate === undefined || isNaN(conversionRate) || conversionRate <= 0) return 0;
  return usdAmount * conversionRate;
};

export const formatCOP = (copAmount) => {
  if (copAmount === null || copAmount === undefined || isNaN(copAmount) || copAmount < 0) return "COP $0";
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(copAmount);
};

export const convertAndFormatCOP = (usdAmount, conversionRate) => {
  const cop = convertUsdToCop(usdAmount, conversionRate);
  return formatCOP(cop);
};