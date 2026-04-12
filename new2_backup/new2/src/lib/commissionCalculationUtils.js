import { 
  selectBonusPercent, 
  computeBillingAmount 
} from './commissionEngine';

// Backwards compatibility re-exports, highly deprecated and will be removed.
export const selectTierRate = (percentAchievement, commissionTiers = []) => {
  return selectBonusPercent(percentAchievement, commissionTiers);
};

export const calculateMonthlyCommission = ({
  totalSalesOverride = null,
  billingBaseOverride = null,
  monthlyGoal = 0,
  commissionTiers = []
}) => {
  const totalSales = Number(totalSalesOverride) || 0;
  const billingBase = Number(billingBaseOverride) || 0;
  const goal = Number(monthlyGoal) || 0;

  const achievementPct = goal > 0 ? (totalSales / goal) * 100 : 0;
  const appliedRate = selectBonusPercent(achievementPct, commissionTiers);
  const estimatedCommission = billingBase * (appliedRate / 100);

  return {
    totalSales,
    billingBase,
    achievementPct,
    appliedRate,
    estimatedCommission
  };
};