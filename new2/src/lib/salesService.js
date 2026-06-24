import { supabase } from './customSupabaseClient';
import { calculateNonResidentialSales, getCustomQuarter } from './salesUtils';
import { fetchGlobalSettings } from './globalSettingsService';
import { calculateFullCommissionForMemberPeriod, computeBillingAmount } from './commissionEngine';

const mapTeamMemberFromDB = (member) => ({
  ...member,
  monthlySales: member.monthly_sales,
  quarterlySales: member.quarterly_sales,
  monthlyBillingAmount: member.monthly_billing_amount || 0,
  quarterlyBillingAmount: member.quarterly_billing_amount || 0,
  monthlyNonResidentialSales: member.monthly_non_residential_sales || 0,
  quarterlyNonResidentialSales: member.quarterly_non_residential_sales || 0,
  linkedUserId: member.linked_user_id,
  monthlyQuota: member.monthly_quota || null,
  quarterlyQuota: member.quarterly_quota || null,
  is_new_member: member.is_new_member || false,
  new_member_start_date: member.new_member_start_date || null,
  is_archived: member.is_archived || false,
  archived_at: member.archived_at || null,
  archived_by: member.archived_by || null,
  archive_reason: member.archive_reason || null,
  employment_start_date: member.employment_start_date || member.created_at || null,
  employment_end_date: member.employment_end_date || null
});

export const calculateMemberMetrics = (member, globalSettings) => {
    const monthlyAgg = {
      totalSalesValue: parseFloat(member.monthlySales || 0),
      totalBillingAmount: parseFloat(member.monthlyBillingAmount || 0),
      transactionCount: 0 
    };
    const quarterlyAgg = {
      totalSalesValue: parseFloat(member.quarterlySales || 0),
      totalBillingAmount: parseFloat(member.quarterlyBillingAmount || 0),
      transactionCount: 0
    };

    const monthlyEngineResult = calculateFullCommissionForMemberPeriod({
      member,
      preAggregated: monthlyAgg,
      globalSettings,
      periodType: 'month'
    });

    const quarterlyEngineResult = calculateFullCommissionForMemberPeriod({
      member,
      preAggregated: quarterlyAgg,
      globalSettings,
      periodType: 'quarter'
    });
    
    const { quarterLabel } = getCustomQuarter();

    return {
        ...member,
        metrics: {
            monthlyProgress: monthlyEngineResult.goal > 0 ? monthlyEngineResult.achievementPercent : null,
            quarterlyProgress: quarterlyEngineResult.goal > 0 ? quarterlyEngineResult.achievementPercent : null,
            monthlyAchievementPercent: monthlyEngineResult.goal > 0 ? monthlyEngineResult.achievementPercent : null,
            quarterlyAchievementPercent: quarterlyEngineResult.goal > 0 ? quarterlyEngineResult.achievementPercent : null,
            monthlyTarget: monthlyEngineResult.goal > 0 ? monthlyEngineResult.goal : null,
            quarterlyTarget: quarterlyEngineResult.goal > 0 ? quarterlyEngineResult.goal : null,
            commissionRate: monthlyEngineResult.bonusPercent,
            commissionAmount: monthlyEngineResult.commission,
            tierRange: monthlyEngineResult.tierRange,
            quotaPercentage: monthlyEngineResult.achievementPercent,
            quarterlyCommissionRate: quarterlyEngineResult.bonusPercent,
            quarterlyCommissionAmount: quarterlyEngineResult.commission,
            qualifiesForCommission: monthlyEngineResult.commission > 0,
            monthlyBillingAmount: monthlyAgg.totalBillingAmount,
            quarterlyBillingAmount: quarterlyAgg.totalBillingAmount,
            currentQuarterLabel: quarterLabel
        }
    };
};

export const updateAllMemberGoalsFromGlobalSettings = async (userId, globalSettings) => {
    if (!userId || !globalSettings) {
        throw new Error("User ID and Global Settings are required.");
    }
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const isAdmin = user?.user_metadata?.is_super_admin === true || user?.user_metadata?.isSalesMember !== true;
    
    if (!isAdmin) {
      throw new Error("Solo el administrador puede actualizar metas de todos los miembros.");
    }

    const { data: members, error: fetchError } = await supabase.from('sales_team').select('id').eq('user_id', userId);
    if (fetchError) throw new Error("Could not fetch team members to update goals.");
    
    const newMonthlyQuota = globalSettings.individual_monthly_commission_threshold ? parseFloat(globalSettings.individual_monthly_commission_threshold) : null;
    const newQuarterlyQuota = globalSettings.individual_quarterly_target ? parseFloat(globalSettings.individual_quarterly_target) : null;

    const { count, error: updateError } = await supabase
        .from('sales_team')
        .update({ monthly_quota: newMonthlyQuota, quarterly_quota: newQuarterlyQuota })
        .eq('user_id', userId);

    if (updateError) return { updatedCount: 0, errorCount: members.length, errors: [updateError] };
    const updatedCount = count || 0;
    const errorCount = members.length - updatedCount;

    return { updatedCount, errorCount, errors: errorCount > 0 ? ["Bulk update failed or partially failed."] : [] };
};

export const recalculateAllMemberMetrics = async (userId, globalSettings) => {
    if (!userId || !globalSettings) throw new Error("User ID and Global Settings are required.");
    const { data: members, error: fetchError } = await supabase.from('sales_team').select('id').eq('user_id', userId);
    if (fetchError) throw fetchError;
    const promises = members.map(m => syncMemberMonthlyMetrics(m.id, globalSettings));
    const results = await Promise.allSettled(promises);
    return { successCount: results.filter(r => r.status === 'fulfilled').length, totalCount: members.length };
};

export const enrichSalesTeamData = (salesTeam, globalSettings) => {
    if (!salesTeam || !Array.isArray(salesTeam)) return [];
    if (!globalSettings) return salesTeam.map(m => ({...m, metrics: {}}));
    return salesTeam.map(member => calculateMemberMetrics(member, globalSettings));
};

export const calculateSalesStats = (salesTeam, globalSettings) => {
  if (!salesTeam || salesTeam.length === 0) {
    return {
      totalMonthlySales: 0, totalQuarterlySales: 0, totalMonthlyBilling: 0, totalQuarterlyBilling: 0,
      totalMonthlyNonResSales: 0, totalQuarterlyNonResSales: 0, averageMonthlySales: 0, averageQuarterlySales: 0,
      topPerformerMonthly: null, dailyTargetMonth: 0, dailyTargetQuarter: 0, teamMonthlyAchievement: 0, teamQuarterlyAchievement: 0
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
    return (parseFloat(prev.monthlySales) || 0) > (parseFloat(current.monthlySales) || 0) ? prev : current;
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
    totalMonthlySales, totalQuarterlySales, totalMonthlyBilling, totalQuarterlyBilling,
    totalMonthlyNonResSales, totalQuarterlyNonResSales, averageMonthlySales, averageQuarterlySales,
    topPerformerMonthly, dailyTargetMonth, dailyTargetQuarter, teamMonthlyAchievement, teamQuarterlyAchievement
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

export const syncMemberMonthlyMetrics = async (memberId, globalSettings = null) => {
    try {
      if (!memberId) throw new Error("No memberId provided");
      const { data: memberData, error: memberError } = await supabase.from('sales_team').select('user_id').eq('id', memberId).single();
      if (memberError || !memberData) throw new Error("Could not find sales member owner.");
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { quarterStart, quarterEnd } = getCustomQuarter(now, globalSettings?.quarter_definitions);
      const earliestDate = startOfMonth < quarterStart ? startOfMonth : quarterStart;

      const { data: records, error } = await supabase
        .from('sales_records')
        .select('id, value, created_at, property_type, state')
        .eq('sales_member_id', memberId)
        .eq('is_valid', true)
        .eq('is_deleted', false) 
        .gte('created_at', earliestDate.toISOString());

      if (error) throw error;

      const monthlyRecords = records.filter(r => new Date(r.created_at) >= startOfMonth);
      const quarterlyRecords = records.filter(r => {
        const d = new Date(r.created_at);
        return d >= quarterStart && d <= quarterEnd;
      });

      const monthlyTotal = monthlyRecords.reduce((sum, r) => sum + (parseFloat(r.value)||0), 0);
      const quarterlyTotal = quarterlyRecords.reduce((sum, r) => sum + (parseFloat(r.value)||0), 0);
      
      const monthlyBilling = monthlyRecords.reduce((sum, r) => sum + computeBillingAmount(r.value, r.state, r.property_type), 0);
      const quarterlyBilling = quarterlyRecords.reduce((sum, r) => sum + computeBillingAmount(r.value, r.state, r.property_type), 0);

      const monthlyNonRes = calculateNonResidentialSales(monthlyRecords);
      const quarterlyNonRes = calculateNonResidentialSales(quarterlyRecords);

      const { error: updateError } = await supabase
        .from('sales_team')
        .update({
           monthly_sales: monthlyTotal, quarterly_sales: quarterlyTotal,
           monthly_billing_amount: monthlyBilling, quarterly_billing_amount: quarterlyBilling,
           monthly_non_residential_sales: monthlyNonRes, quarterly_non_residential_sales: quarterlyNonRes,
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
      
      const hasDiscrepancy = Math.abs(storedMonthly - actualMonthly) > 0.01 || Math.abs(storedQuarterly - actualQuarterly) > 0.01 || Math.abs(storedMonthlyBilling - actualMonthlyBilling) > 0.01;
      
      auditResults.push({
        id: member.id, name: member.name, status: hasDiscrepancy ? 'DISCREPANCY' : 'OK',
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
  const residential = records.filter(r => r.property_type === 'Residential' || r.property_type === 'Residencial').reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
  const commercial = records.filter(r => r.property_type !== 'Residential' && r.property_type !== 'Residencial').reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
  return { residential, commercial };
};

export const fetchMemberDataByAuthId = async (authUserId) => {
  try {
    if (!authUserId) return null;
    let query = supabase.from('sales_team').select('*');
    if (authUserId === null) {
      query = query.is('linked_user_id', null);
    } else {
      query = query.eq('linked_user_id', authUserId);
    }
    const { data, error } = await query.maybeSingle();
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
            .from('sales_records').select('state, value, property_type, created_at, id')
            .eq('sales_member_id', memberId).eq('is_valid', true).eq('is_deleted', false) 
            .gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
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
        .from('sales_records').select('*')
        .eq('sales_member_id', memberId).eq('is_valid', true).eq('is_deleted', false) 
        .gte('created_at', quarterStart.toISOString()).lte('created_at', quarterEnd.toISOString())
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(`Error fetching weekly quarter data: ${error.message}`);
  }
};

export const getWeeklyProgressData = async (memberId, quarterStart, quarterEnd, quarterGoal = null) => {
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
            .from('sales_records').select('*')
            .eq('sales_member_id', memberId).eq('is_valid', true).eq('is_deleted', false) 
            .gte('created_at', startOfMonth.toISOString()).lte('created_at', endOfMonth.toISOString())
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (error) {
        throw new Error(`Error fetching monthly sales data: ${error.message}`);
    }
};

export const addSalesMember = async (memberData, userId, toast) => {
  try {
    if (!memberData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberData.email)) {
      throw new Error("Email format is invalid");
    }

    let photoUrl = null;
    if (memberData.photoFile) photoUrl = await uploadMemberPhoto(memberData.photoFile, userId);
    
    // Invoke the secure edge function to create auth user and DB record
    const { data, error } = await supabase.functions.invoke('create-member', {
      body: {
        name: memberData.name,
        email: memberData.email,
        linkedUserId: memberData.linkedUserId || null,
        isNewMember: memberData.is_new_member || false,
        newMemberStartDate: memberData.new_member_start_date || null,
        monthlySales: memberData.monthlySales,
        quarterlySales: memberData.quarterlySales,
        photoUrl: photoUrl
      }
    });

    if (error) {
      console.error("Function invocation error:", error);
      throw new Error(error.message || "Failed to create member securely");
    }

    if (data && data.error) {
      throw new Error(data.error);
    }
    
    return mapTeamMemberFromDB(data.data);
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};

export const updateSalesMember = async (currentMember, updatedData, userId) => {
    try {
      let photoUrl = currentMember.photo_url;
      if (updatedData.photoFile) photoUrl = await uploadMemberPhoto(updatedData.photoFile, userId);
      const memberToUpdate = {
        name: updatedData.name, monthly_sales: parseFloat(updatedData.monthlySales) || 0,
        quarterly_sales: parseFloat(updatedData.quarterlySales) || 0, photo_url: photoUrl, updated_at: new Date().toISOString()
      };
      if (updatedData.linkedUserId !== undefined) memberToUpdate.linked_user_id = updatedData.linkedUserId;
      if (updatedData.is_new_member !== undefined) memberToUpdate.is_new_member = updatedData.is_new_member;
      
      // Sanitize new_member_start_date based on is_new_member flag
      if (updatedData.is_new_member) {
        memberToUpdate.new_member_start_date = updatedData.new_member_start_date || null;
      } else {
        memberToUpdate.new_member_start_date = null;
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
      const { error: uploadError } = await supabase.storage.from('member-photos').upload(fileName, photoFile);
      if (uploadError) throw uploadError;
      return supabase.storage.from('member-photos').getPublicUrl(fileName).data.publicUrl;
    } catch (error) {
      throw new Error(`Error uploading photo: ${error.message}`);
    }
};

export const processExcelUpload = async (uploadedMembers, existingTeam, userId) => ({ successCount: 0, errorCount: 0 });

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

export const fetchAuthUsersList = async () => [];

export const syncSalesTotals = async (salesMemberId) => syncMemberMonthlyMetrics(salesMemberId);

export const insertSaleRecord = async (payload, adminUserId = null) => {
  if (adminUserId) payload.created_by_admin_user_id = adminUserId;
  const { data, error } = await supabase.from('sales_records').insert([payload]).select().single();
  if (error) throw error;
  return data;
};

/**
 * Archives a sales member.
 * Historical sales data (sales_records, clients, prospects, commission_plans) 
 * is completely preserved for reporting and audit purposes.
 */
export const archiveSalesMember = async (memberId, employment_end_date, archive_reason, archived_by_user_id) => {
  try {
    const { error } = await supabase.from('sales_team').update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: archived_by_user_id,
      employment_end_date: employment_end_date || null,
      archive_reason: archive_reason || null
    }).eq('id', memberId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw new Error(`Error archiving member: ${error.message}`);
  }
};

/**
 * Restores an archived sales member to active status.
 */
export const restoreSalesMember = async (memberId) => {
  try {
    const { error } = await supabase.from('sales_team').update({
      is_archived: false,
      archived_at: null,
      archived_by: null,
      archive_reason: null,
      employment_end_date: null
    }).eq('id', memberId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw new Error(`Error restoring member: ${error.message}`);
  }
};