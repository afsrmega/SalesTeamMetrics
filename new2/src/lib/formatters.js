export const formatM = (value) => {
  if (!value || isNaN(value)) return '0M';
  return `${Math.round(value / 1_000_000)}M`;
};