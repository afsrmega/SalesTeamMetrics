import { supabase } from './customSupabaseClient';
import { 
  calculateCommissionWithTiers, 
  calculateNonResidentialSales, 
  getCustomQuarter, 
  calculateAchievementPercentage, 
  calculateBillingAmount 
} from './salesUtils';
import { fetchGlobalSettings } from './globalSettingsService';

const mapTeamMemberFromDB = (member) => ({
  ...member,
  monthlySales: member.monthly_sales,
  quarterlySales: member.quarterly_sales,
  monthlyBillingAmount: member.monthly_billing_amount || 0,
  quarterlyBillingAmount: member.quarterly_billing_amount || 0,
  monthlyNonResidentialSales: member.monthly_non_residential_sales || 0,
  quarterlyNonResidentialSales: member.quarterly_non_residential_sales || 0,
  linkedUserId: member.linked_user_id,
  monthlyQuota: member.monthly_quota || 0,
  quarterlyQuota: member.quarterly_quota || 0
});

export const calculateMemberMetrics = (member, globalSettings) => {
    const monthlySales = parseFloat(member.monthlySales || 0);
    const quarterlySales = parseFloat(member.quarterlySales || 0);
    
    const monthlyBilling = parseFloat(member.monthlyBillingAmount || 0);
    const quarterlyBilling = parseFloat(member.quarterlyBillingAmount || 0);

    const monthlyTarget = parseFloat(member.monthlyQuota || globalSettings?.individual_monthly_commission_threshold || 5000);
    const quarterlyTarget = parseFloat(member.quarterlyQuota || globalSettings?.individual_quarterly_target || 15000);

    const monthlyAchievementPercent = calculateAchievementPercentage(monthlySales, monthlyTarget);
    const quarterlyAchievementPercent = calculateAchievementPercentage(quarterlySales, quarterlyTarget);

    const monthlyProgress = monthlyTarget > 0 ? monthlyAchievementPercent : 0;
    const quarterlyProgress = quarterlyTarget > 0 ? quarterlyAchievementPercent : 0;
    
    const tiers = globalSettings?.commission_tiers || [];

    const commissionDataMonthly = calculateCommissionWithTiers(monthlyBilling, monthlyTarget, tiers);
    const commissionDataQuarterly = calculateCommissionWithTiers(quarterlyBilling, quarterlyTarget, tiers);
    
    const { quarterLabel } = getCustomQuarter();

    return {
        ...member,
        metrics: {
            monthlyProgress, 
            quarterlyProgress,
            monthlyAchievementPercent, 
            quarterlyAchievementPercent,
            monthlyTarget,
            quarterlyTarget,
            commissionRate: commissionDataMonthly.appliedRate,
            commissionAmount: commissionDataMonthly.commissionAmount,
            tierRange: commissionDataMonthly.tierRange,
            quotaPercentage: commissionDataMonthly.quotaPercentage,
            quarterlyCommissionRate: commissionDataQuarterly.appliedRate,
            quarterlyCommissionAmount: commissionDataQuarterly.commissionAmount,
            qualifiesForCommission: commissionDataMonthly.commissionAmount > 0,
            monthlyBillingAmount: monthlyBilling,
            quarterlyBillingAmount: quarterlyBilling,
            currentQuarterLabel: quarterLabel
        }
    };
};

export const updateAllMemberGoalsFromGlobalSettings = async (userId, globalSettings) => {
    if (!userId || !globalSettings) {
        throw new Error("User ID and Global Settings are required.");
    }

    const { data: members, error: fetchError } = await supabase
        .from('sales_team')
        .select('id')
        .eq('user_id', userId);

    if (fetchError) throw new Error("Could not fetch team members to update goals.");
    
    const newMonthlyQuota = parseFloat(globalSettings.individual_monthly_commission_threshold);
    const newQuarterlyQuota = parseFloat(globalSettings.individual_quarterly_target);

    const { count, error: updateError } = await supabase
        .from('sales_team')
        .update({ 
            monthly_quota: newMonthlyQuota,
            quarterly_quota: newQuarterlyQuota
        })
        .eq('user_id', userId);

    if (updateError) return { updatedCount: 0, errorCount: members.length, errors: [updateError] };
    
    const updatedCount = count || 0;
    const errorCount = members.length - updatedCount;

    return { updatedCount, errorCount, errors: errorCount > 0 ? ["Bulk update failed or partially failed."] : [] };
};

export const recalculateAllMemberMetrics = async (userId, globalSettings) => {
    if (!userId || !globalSettings) throw new Error("User ID and Global Settings are required.");

    const { data: members, error: fetchError } = await supabase
        .from('sales_team')
        .select('id')
        .eq('user_id', userId);
    
    if (fetchError) throw fetchError;
    
    const promises = members.map(m => syncMemberMonthlyMetrics(m.id));
    const results = await Promise.allSettled(promises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    return { successCount, totalCount: members.length };
};

export const enrichSalesTeamData = (salesTeam, globalSettings) => {
    if (!salesTeam || !Array.isArray(salesTeam)) return [];
    if (!globalSettings) return salesTeam.map(m => ({...m, metrics: {}}));
    return salesTeam.map(member => calculateMemberMetrics(member, globalSettings));
};

export const calculateSalesStats = (salesTeam, globalSettings) => {
  if (!salesTeam || salesTeam.length === 0) {
    return {
      totalMonthlySales: 0,
      totalQuarterlySales: 0,
      totalMonthlyBilling: 0,
      totalQuarterlyBilling: 0,
      totalMonthlyNonResSales: 0,
      totalQuarterlyNonResSales: 0,
      averageMonthlySales: 0,
      averageQuarterlySales: 0,
      topPerformerMonthly: null,
      dailyTargetMonth: 0,
      dailyTargetQuarter: 0,
      teamMonthlyAchievement: 0,
      teamQuarterlyAchievement: 0
    };
  }

  const totalMonthlySales = salesTeam.reduce((sum, member) => sum + (parseFloat(member.monthlySales) || 0), 0);
  const totalQuarterlySales = salesTeam.reduce((sum, member) => sum + (parseFloat(member.quarterlySales) || 0), 0);
  
  const totalMonthlyBilling = salesTeam.reduce((sum, member) => sum + (parseFloat(member.monthlyBillingAmount) || 0), 0);
  const totalQuarterlyBilling = salesTeam.reduce((sum, member) => sum + (parseFloat(member.quarterlyBillingAmount) || 0), 0);

  const totalMonthlyNonResSales = salesTeam.reduce((sum, member) => sum + (parseFloat(member.monthlyNonResidentialSales) || 0), 0);
  const totalQuarterlyNonResSales = salesTeam.reduce((sum, member) => sum + (parseFloat(member.quarterlyNonResidentialSales) || 0), 0);

  const averageMonthlySales = salesTeam.length > 0 ? totalMonthlySales / salesTeam.length : 0;
  const averageQuarterlySales = salesTeam.length > 0 ? totalQuarterlySales / salesTeam.length : 0;
  
  const topPerformerMonthly = salesTeam.reduce((prev, current) => {
    const prevSales = parseFloat(prev.monthlySales);
    const currentSales = parseFloat(current.monthlySales);
    return (prevSales || 0) > (currentSales || 0) ? prev : current;
  });

  const teamMonthlyTarget = parseFloat(globalSettings?.team_monthly_target || 0);
  const teamQuarterlyTarget = parseFloat(globalSettings?.team_quarterly_target || 0);

  const teamMonthlyAchievement = teamMonthlyTarget > 0 ? (totalMonthlySales / teamMonthlyTarget) * 100 : 0;
  const teamQuarterlyAchievement = teamQuarterlyTarget > 0 ? (totalQuarterlySales / teamQuarterlyTarget) * 100 : 0;

  const remainingMonthlyTarget = Math.max(0, teamMonthlyTarget - totalMonthlySales);
  const remainingQuarterlyTarget = Math.max(0, teamQuarterlyTarget - totalQuarterlySales);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = daysInMonth - today.getDate() + 1;
  
  const { quarterEnd } = getCustomQuarter(today);
  const daysRemainingInQuarter = Math.ceil((quarterEnd - today) / (1000 * 60 * 60 * 24));

  const dailyTargetMonth = daysRemainingInMonth > 0 ? remainingMonthlyTarget / daysRemainingInMonth : 0;
  const dailyTargetQuarter = daysRemainingInQuarter > 0 ? remainingQuarterlyTarget / daysRemainingInQuarter : 0;

  return {
    totalMonthlySales,
    totalQuarterlySales,
    totalMonthlyBilling,
    totalQuarterlyBilling,
    totalMonthlyNonResSales,
    totalQuarterlyNonResSales, 
    averageMonthlySales,
    averageQuarterlySales,
    topPerformerMonthly,
    dailyTargetMonth,
    dailyTargetQuarter,
    teamMonthlyAchievement,
    teamQuarterlyAchievement
  };
};

export const fetchSalesTeamData = async (userId) => {
  try {
    const { data, error } = await supabase.from('sales_team').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapTeamMemberFromDB);
  } catch (error) {
    throw new Error(`Error fetching sales team: ${error.message}`);
  }
};

export const fetchGlobalSettingsData = async (userId) => {
  try {
    return await fetchGlobalSettings(userId);
  } catch (error) {
    throw new Error(`Error fetching global settings: ${error.message}`);
  }
};

export const syncMemberMonthlyMetrics = async (memberId) => {
    try {
      if (!memberId) throw new Error("No memberId provided to syncMemberMonthlyMetrics");

      const { data: memberData, error: memberError } = await supabase
          .from('sales_team')
          .select('user_id')
          .eq('id', memberId)
          .single();
      
      if (memberError || !memberData) throw new Error("Could not find sales member owner.");
      
      const ownerId = memberData.user_id;
      const globalSettings = await fetchGlobalSettings(ownerId);
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { quarterStart, quarterEnd } = getCustomQuarter(now);
      const earliestDate = startOfMonth < quarterStart ? startOfMonth : quarterStart;

      const { data: records, error } = await supabase
        .from('sales_records')
        .select('id, value, created_at, property_type, state')
        .eq('sales_member_id', memberId)
        .eq('is_valid', true)
        .eq('is_deleted', false) // Task 5: Added is_deleted filter
        .gte('created_at', earliestDate.toISOString());

      if (error) throw error;

      const monthlyRecords = records.filter(r => new Date(r.created_at) >= startOfMonth);
      const quarterlyRecords = records.filter(r => {
        const d = new Date(r.created_at);
        return d >= quarterStart && d <= quarterEnd;
      });

      const monthlyTotal = monthlyRecords.reduce((sum, r) => sum + (parseFloat(r.value)||0), 0);
      const quarterlyTotal = quarterlyRecords.reduce((sum, r) => sum + (parseFloat(r.value)||0), 0);
      
      const monthlyBilling = globalSettings 
        ? monthlyRecords.reduce((sum, r) => sum + calculateBillingAmount(r.value, globalSettings, r.property_type, r.state), 0)
        : 0;
        
      const quarterlyBilling = globalSettings
        ? quarterlyRecords.reduce((sum, r) => sum + calculateBillingAmount(r.value, globalSettings, r.property_type, r.state), 0)
        : 0;

      const monthlyNonRes = calculateNonResidentialSales(monthlyRecords);
      const quarterlyNonRes = calculateNonResidentialSales(quarterlyRecords);

      const { error: updateError } = await supabase
        .from('sales_team')
        .update({
           monthly_sales: monthlyTotal,
           quarterly_sales: quarterlyTotal,
           monthly_billing_amount: monthlyBilling,
           quarterly_billing_amount: quarterlyBilling,
           monthly_non_residential_sales: monthlyNonRes,
           quarterly_non_residential_sales: quarterlyNonRes,
           updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (updateError) throw updateError;

      return { monthlyTotal, quarterlyTotal, monthlyBilling, quarterlyBilling };

    } catch (error) {
      console.error("Error in syncMemberMonthlyMetrics:", error);
      throw error;
    }
};

export const runFullAudit = async () => {
  try {
    const { data: members, error } = await supabase.from('sales_team').select('*');
    if (error) throw error;

    const auditResults = [];
    
    for (const member of members) {
      const mappedMember = mapTeamMemberFromDB(member);
      const recalculated = await syncMemberMonthlyMetrics(member.id);
      
      const storedMonthly = parseFloat(mappedMember.monthlySales || 0);
      const storedQuarterly = parseFloat(mappedMember.quarterlySales || 0);
      const storedMonthlyBilling = parseFloat(mappedMember.monthlyBillingAmount || 0);
      
      const actualMonthly = recalculated.monthlyTotal;
      const actualQuarterly = recalculated.quarterlyTotal;
      const actualMonthlyBilling = recalculated.monthlyBilling;
      
      const hasDiscrepancy = 
        Math.abs(storedMonthly - actualMonthly) > 0.01 ||
        Math.abs(storedQuarterly - actualQuarterly) > 0.01 ||
        Math.abs(storedMonthlyBilling - actualMonthlyBilling) > 0.01;
      
      auditResults.push({
        id: member.id,
        name: member.name,
        status: hasDiscrepancy ? 'DISCREPANCY' : 'OK',
        details: hasDiscrepancy ? {
          monthlySales: { stored: storedMonthly, actual: actualMonthly },
          quarterlySales: { stored: storedQuarterly, actual: actualQuarterly },
          monthlyBilling: { stored: storedMonthlyBilling, actual: actualMonthlyBilling }
        } : null
      });
    }
    
    return auditResults;
  } catch (error) {
    throw new Error(`Audit failed: ${error.message}`);
  }
};

export const correctAllSalesDiscrepancies = async () => {
  try {
    const { data: members, error } = await supabase.from('sales_team').select('id');
    if (error) throw error;
    
    let correctedCount = 0;
    for (const member of members) {
      await syncMemberMonthlyMetrics(member.id);
      correctedCount++;
    }
    
    return { correctedCount };
  } catch (error) {
    throw new Error(`Correction failed: ${error.message}`);
  }
};

export const getPropertyTypeTotals = (records) => {
  const residential = records
    .filter(r => r.property_type === 'Residential' || r.property_type === 'Residencial')
    .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
  
  const commercial = records
    .filter(r => r.property_type !== 'Residential' && r.property_type !== 'Residencial')
    .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
  
  return { residential, commercial };
};

export const fetchMemberDataByAuthId = async (authUserId) => {
  try {
    if (!authUserId) return null;
    const { data, error } = await supabase.from('sales_team').select('*').eq('linked_user_id', authUserId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapTeamMemberFromDB(data);
  } catch (error) {
    console.error(`Error in fetchMemberDataByAuthId: ${error.message}`);
    return null;
  }
};

export const getSalesRecordsByMemberAndDateRange = async (memberId, startDate, endDate) => {
    try {
        if (!memberId) throw new Error("Member ID is required");
        const { data, error } = await supabase
            .from('sales_records')
            .select('state, value, property_type, created_at, id')
            .eq('sales_member_id', memberId)
            .eq('is_valid', true)
            .eq('is_deleted', false) // Task 5
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (error) {
        throw new Error(`Error fetching sales records: ${error.message}`);
    }
};

export const getWeeklyQuarterData = async (memberId, quarterStart, quarterEnd) => {
  try {
    if (!memberId) throw new Error("Member ID is required");
    const { data, error } = await supabase
        .from('sales_records')
        .select('*')
        .eq('sales_member_id', memberId)
        .eq('is_valid', true)
        .eq('is_deleted', false) // Task 5
        .gte('created_at', quarterStart.toISOString())
        .lte('created_at', quarterEnd.toISOString())
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(`Error fetching weekly quarter data: ${error.message}`);
  }
};

export const getWeeklyProgressData = async (memberId, quarterStart, quarterEnd, quarterGoal = 0) => {
  try {
    const records = await getWeeklyQuarterData(memberId, quarterStart, quarterEnd);
    records.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return { records, quarterGoal };
  } catch (error) {
     throw new Error(`Error fetching weekly progress data: ${error.message}`);
  }
};

export const getMonthlyWeeklySalesData = async (memberId, startOfMonth, endOfMonth) => {
    try {
        if (!memberId) throw new Error("Member ID is required");
        const { data, error } = await supabase
            .from('sales_records')
            .select('*')
            .eq('sales_member_id', memberId)
            .eq('is_valid', true)
            .eq('is_deleted', false) // Task 5
            .gte('created_at', startOfMonth.toISOString())
            .lte('created_at', endOfMonth.toISOString())
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (error) {
        throw new Error(`Error fetching monthly sales data: ${error.message}`);
    }
};

export const addSalesMember = async (memberData, userId, toast) => {
  try {
    let photoUrl = null;
    if (memberData.photoFile) {
      photoUrl = await uploadMemberPhoto(memberData.photoFile, userId);
    }
    const newMember = {
      user_id: userId,
      name: memberData.name,
      monthly_sales: parseFloat(memberData.monthlySales) || 0,
      quarterly_sales: parseFloat(memberData.quarterlySales) || 0,
      monthly_billing_amount: 0, 
      quarterly_billing_amount: 0, 
      monthly_non_residential_sales: 0,
      quarterly_non_residential_sales: 0,
      photo_url: photoUrl,
      linked_user_id: memberData.linkedUserId || null,
      email: memberData.email || null
    };
    const { data, error } = await supabase.from('sales_team').insert([newMember]).select().single();
    if (error) throw error;
    return mapTeamMemberFromDB(data);
  } catch (error) {
    throw new Error(`Error adding team member: ${error.message}`);
  }
};

export const updateSalesMember = async (currentMember, updatedData, userId) => {
    try {
      let photoUrl = currentMember.photo_url;
      if (updatedData.photoFile) {
        photoUrl = await uploadMemberPhoto(updatedData.photoFile, userId);
      }
      const memberToUpdate = {
        name: updatedData.name,
        monthly_sales: parseFloat(updatedData.monthlySales) || 0,
        quarterly_sales: parseFloat(updatedData.quarterlySales) || 0,
        photo_url: photoUrl,
        updated_at: new Date().toISOString()
      };
      if (updatedData.linkedUserId !== undefined) {
          memberToUpdate.linked_user_id = updatedData.linkedUserId;
      }
      const { data, error } = await supabase.from('sales_team').update(memberToUpdate).eq('id', currentMember.id).select().single();
      if (error) throw error;
      return mapTeamMemberFromDB(data);
    } catch (error) {
      throw new Error(`Error updating team member: ${error.message}`);
    }
};

export const deleteSalesMemberById = async (memberId, userId, photoUrl) => {
  try {
    const { error } = await supabase.from('sales_team').delete().eq('id', memberId).eq('user_id', userId);
    if (error) throw error;
  } catch (error) {
    throw new Error(`Error deleting team member: ${error.message}`);
  }
};

export const uploadMemberPhoto = async (photoFile, userId) => {
    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${userId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;
      const { error: uploadError } = await supabase.storage.from('member-photos').upload(filePath, photoFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('member-photos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      throw new Error(`Error uploading photo: ${error.message}`);
    }
};

export const processExcelUpload = async (uploadedMembers, existingTeam, userId) => {
  return { successCount: 0, errorCount: 0 }; 
};

export const getMemberPhotoUrl = (photoKey, userId) => photoKey;

export const linkSalesMemberToUser = async (salesTeamId, authUserId) => {
    try {
      const { data, error } = await supabase.from('sales_team').update({ linked_user_id: authUserId }).eq('id', salesTeamId).select().single();
      if (error) throw error;
      return mapTeamMemberFromDB(data);
    } catch (error) {
      throw new Error(`Error linking user: ${error.message}`);
    }
};

export const fetchAuthUsersList = async () => { return [] };

export const syncSalesTotals = async (salesMemberId) => { return syncMemberMonthlyMetrics(salesMemberId); }

export const insertSaleRecord = async (payload, adminUserId = null) => {
  if (adminUserId) {
    payload.created_by_admin_user_id = adminUserId;
  }
  const { data, error } = await supabase.from('sales_records').insert([payload]).select().single();
  if (error) throw error;
  return data;
};