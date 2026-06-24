import React, { useState, useMemo, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import GlobalSettings from "@/components/sales/GlobalSettings";
import QuarterSettingsDialog from "@/components/sales/QuarterSettingsDialog";
import AddMemberForm from "@/components/sales/AddMemberForm";
import SalesTeamTable from "@/components/sales/SalesTeamTable";
import SalesTeamTableQuarterly from "@/components/sales/SalesTeamTableQuarterly";
import SummaryCards from "@/components/sales/SummaryCards";
import TeamOverallProgressCharts from "@/components/sales/TeamOverallProgressCharts";
import EditMemberDialog from "@/components/sales/EditMemberDialog";
import ExcelUploader from "@/components/sales/ExcelUploader";
import TimeProgressChart from "@/components/sales/TimeProgressChart"; 
import CommissionRangesTable from "@/components/sales/CommissionRangesTable";
import LinkUserDialog from "@/components/sales/LinkUserDialog";
import AllSalesRecordsTable from "@/components/sales/AllSalesRecordsTable";
import AuditPanel from "@/components/sales/AuditPanel"; 
import QuarterWeeklyProgressTable from "@/components/sales/QuarterWeeklyProgressTable";
import PropertyTypeComparisonChart from "@/components/sales/PropertyTypeComparisonChart";
import TexasVsOutOfStateChart from "@/components/sales/TexasVsOutOfStateChart";
import QuarterlyTexasVsOutOfStateChart from "@/components/sales/QuarterlyTexasVsOutOfStateChart";
import QuarterGoalDistributionChart from "@/components/sales/QuarterGoalDistributionChart";
import AddSaleForm from "@/components/sales/AddSaleForm";
import SalesFiltersBlock from "@/components/sales/SalesFiltersBlock";
import MemberOverridesManager from "@/components/sales/MemberOverridesManager";
import ArchiveMemberModal from "@/components/sales/ArchiveMemberModal";
import ArchivedMembersTable from "@/components/sales/ArchivedMembersTable";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/contexts/SupabaseAuthContext";
import { getGoalsByPeriod } from "@/lib/goalsService";
import { 
  calculateSalesStats, 
  enrichSalesTeamData, 
  updateSalesMember, 
  processExcelUpload,
  syncMemberMonthlyMetrics,
  archiveSalesMember,
  restoreSalesMember
} from "@/lib/salesService";
import { useRealTimeSalesData } from "@/hooks/useRealTimeSalesData"; 
import { generatePowerPointReport } from "@/lib/powerPointGenerator";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileDown, Link as LinkIcon, AlertTriangle, RefreshCw, BarChart2, Presentation, Loader2, Calculator, Settings, KeyRound, Users } from "lucide-react";
import { exportToExcelWithCharts } from "@/lib/exportToExcelWithCharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { calculateBillingAmount, formatCurrency, getCustomQuarter, getQuarterDateRange } from "@/lib/salesUtils";
import { validateBillingRates } from "@/lib/validateBillingRates";
import { useColorPreferences } from "@/hooks/useColorPreferences";
import { calculateDateRange, filterSalesRecords } from "@/lib/filterSalesRecords";
import { format } from "date-fns";
import { supabase } from "@/lib/customSupabaseClient";
import { getVisibleMembersForPeriod } from "@/lib/memberVisibilityUtils";

function validateDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  return date;
}

const safeFormat = (date, formatStr) => {
  const validDate = validateDate(date);
  if (!validDate) return 'Invalid Date';
  return format(validDate, formatStr);
};

const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const SalesMetrics = () => {
  const { toast } = useToast();
  const { user, globalSettings, fetchSettings, updateGlobalSettings, isAdmin } = useAuth(); 
  useColorPreferences();

  const [dateFilter, setDateFilter] = useState(() => {
    const saved = localStorage.getItem('adminDashboardFilters_date');
    return saved ? JSON.parse(saved) : { mode: 'reset', startDate: null, endDate: null };
  });
  const [includeResidential, setIncludeResidential] = useState(() => {
    const saved = localStorage.getItem('adminDashboardFilters_res');
    return saved ? JSON.parse(saved) : false;
  });

  const [periodMode, setPeriodMode] = useState(() => localStorage.getItem('adminPeriodMode') || 'quarter');
  const [selectedQuarterKey, setSelectedQuarterKey] = useState(() => localStorage.getItem('adminSelectedQuarterKey') || 'current');
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => localStorage.getItem('adminSelectedMonthKey') || 'current');
  //const [memberStatusFilter, setMemberStatusFilter] = useState('active');
  const [memberStatusFilter, setMemberStatusFilter] = useState('period');

  const [effectiveMonthGoals, setEffectiveMonthGoals] = useState(null);
  const [effectiveQuarterGoals, setEffectiveQuarterGoals] = useState(null);

  useEffect(() => {
    localStorage.setItem('adminDashboardFilters_date', JSON.stringify(dateFilter));
    localStorage.setItem('adminDashboardFilters_res', JSON.stringify(includeResidential));
    localStorage.setItem('adminPeriodMode', periodMode);
    localStorage.setItem('adminSelectedQuarterKey', selectedQuarterKey);
    localStorage.setItem('adminSelectedMonthKey', selectedMonthKey);
  }, [dateFilter, includeResidential, periodMode, selectedQuarterKey, selectedMonthKey]);

  // Add Member State
  const [newMember, setNewMember] = useState({ 
    name: "", 
    email: "", 
    is_new_member: false, 
    new_member_start_date: "",
    role: "member"
  });
  
  // UI States
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  
  const [editingMember, setEditingMember] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Archive Member Flow State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [memberPendingArchive, setMemberPendingArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // --- SET PASSWORD MODAL STATE & HANDLERS ---
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [selectedMemberForPassword, setSelectedMemberForPassword] = useState(null);
  const [passwordFormData, setPasswordFormData] = useState({ password: '', confirmPassword: '' });
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const handleOpenSetPasswordModal = (member) => {
    setSelectedMemberForPassword(member);
    setPasswordFormData({ password: '', confirmPassword: '' });
    setShowSetPasswordModal(true);
  };

  const handleCloseSetPasswordModal = () => {
    setShowSetPasswordModal(false);
    setSelectedMemberForPassword(null);
    setPasswordFormData({ password: '', confirmPassword: '' });
  };

  const handleSetPassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const { password, confirmPassword } = passwordFormData;
    
    if (!password || password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }
    
    setIsSettingPassword(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('set-member-password', {
        body: {
          memberId: selectedMemberForPassword.id,
          newPassword: password
        }
      });
      
      if (error) throw new Error(error.message || "Error al invocar la función.");
      if (data && data.error) throw new Error(data.error);
      
      toast({ title: "Éxito", description: "Contraseña temporal establecida correctamente." });
      handleCloseSetPasswordModal();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      console.error("Set password error:", error);
    } finally {
      setIsSettingPassword(false);
    }
  };
  // -------------------------------------------

  const { 
    salesTeam: salesTeamRaw, 
    salesRecords,
    loading: isLoading, 
    refresh: refreshData 
  } = useRealTimeSalesData(user?.id);

  const loadMembers = refreshData;

  const safeGlobalSettings = useMemo(() => {
    return globalSettings || {
      team_monthly_target: "100000", 
      individual_monthly_commission_threshold: "5000",
      team_quarterly_target: "300000",
      individual_quarterly_target: "15000",
      commission_percentage: 0.01,
      commission_threshold: 16000000,
      commission_tiers: []
    };
  }, [globalSettings]);

  const validation = useMemo(() => validateBillingRates(safeGlobalSettings), [safeGlobalSettings]);

  const activeRange = useMemo(() => calculateDateRange(dateFilter.mode, dateFilter.startDate, dateFilter.endDate, safeGlobalSettings.quarter_definitions), [dateFilter, safeGlobalSettings.quarter_definitions]);
  const isDateFiltered = dateFilter.mode !== 'reset';
  const filteredSalesRecordsFinal = useMemo(() => filterSalesRecords(salesRecords, activeRange, includeResidential), [salesRecords, activeRange, includeResidential]);

  const currentQInfo = useMemo(() => getCustomQuarter(new Date(), safeGlobalSettings.quarter_definitions), [safeGlobalSettings.quarter_definitions]);
  const currentMonthDate = useMemo(() => new Date(), []);

  const quarterOptions = useMemo(() => {
    const opts = [];
    let { year, quarter } = currentQInfo;
    for(let i=0; i<8; i++) {
        opts.push({ key: `${year}-${quarter}`, label: `Q${quarter} FY${year}` });
        quarter--;
        if (quarter === 0) { quarter = 4; year--; }
    }
    return opts;
  }, [currentQInfo]);

  const monthOptions = useMemo(() => {
    const opts = [];
    let d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
    for(let i=0; i<12; i++) {
        opts.push({ 
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 
            label: format(d, 'MMM yyyy')
        });
        d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, [currentMonthDate]);

  const { activeQuarterStart, activeQuarterEnd, activeQuarterLabel, computedQuarterKey } = useMemo(() => {
    let qStart, qEnd, qLabel, cKey;
    try {
      if (selectedQuarterKey === 'current') throw new Error('Use current quarter fallback');
      const [y, q] = selectedQuarterKey.split('-');
      const year = parseInt(y, 10);
      const quarterNumber = parseInt(q, 10);
      if (isNaN(year) || isNaN(quarterNumber)) throw new Error('Invalid quarter key format');
      const quarterData = getQuarterDateRange(year, quarterNumber, safeGlobalSettings.quarter_definitions);
      qStart = validateDate(quarterData.start);
      qEnd = validateDate(quarterData.end);
      qLabel = `Q${quarterNumber} FY${year}`;
      cKey = `FY${year}-Q${quarterNumber}`;
      if (!qStart || !qEnd) throw new Error('Invalid quarter dates generated');
    } catch (error) {
      qStart = validateDate(currentQInfo.quarterStart) || new Date();
      qEnd = validateDate(currentQInfo.quarterEnd) || new Date();
      qLabel = currentQInfo.quarterLabel || 'Current Q';
      cKey = `FY${currentQInfo.year}-Q${currentQInfo.quarter}`;
    }
    return { activeQuarterStart: qStart, activeQuarterEnd: qEnd, activeQuarterLabel: qLabel, computedQuarterKey: cKey };
  }, [selectedQuarterKey, currentQInfo, safeGlobalSettings.quarter_definitions]);

  const { activeMonthStart, activeMonthEnd, activeMonthLabel, computedMonthKey } = useMemo(() => {
    let mStart, mEnd, mLabel, cKey;
    try {
      if (selectedMonthKey === 'current') throw new Error('Use current month fallback');
      const [y, m] = selectedMonthKey.split('-');
      const year = parseInt(y, 10);
      const month = parseInt(m, 10) - 1;
      if (isNaN(year) || isNaN(month) || month < 0 || month > 11) throw new Error('Invalid month key format');
      mStart = new Date(year, month, 1);
      mStart.setHours(0, 0, 0, 0);
      mEnd = new Date(year, month + 1, 0);
      mEnd.setHours(23, 59, 59, 999);
      mStart = validateDate(mStart);
      mEnd = validateDate(mEnd);
      if (!mStart || !mEnd) throw new Error('Invalid month dates');
      mLabel = safeFormat(mStart, 'MMM yyyy');
      cKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    } catch (error) {
      const now = new Date();
      mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      mStart.setHours(0, 0, 0, 0);
      mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      mEnd.setHours(23, 59, 59, 999);
      mStart = validateDate(mStart) || new Date();
      mEnd = validateDate(mEnd) || new Date();
      mLabel = safeFormat(mStart, 'MMM yyyy');
      cKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    return { activeMonthStart: mStart, activeMonthEnd: mEnd, activeMonthLabel: mLabel, computedMonthKey: cKey };
  }, [selectedMonthKey, currentMonthDate]);

  const currentPeriodKey = periodMode === 'quarter' ? computedQuarterKey : computedMonthKey;
  const currentPeriodLabel = periodMode === 'quarter' ? activeQuarterLabel : activeMonthLabel;

  const fetchGoals = async () => {
    if (!safeGlobalSettings) return;
    const monthGoals = await getGoalsByPeriod('month', computedMonthKey, safeGlobalSettings);
    setEffectiveMonthGoals(monthGoals);
    
    const quarterGoals = await getGoalsByPeriod('quarter', computedQuarterKey, safeGlobalSettings);
    setEffectiveQuarterGoals(quarterGoals);
  };

  useEffect(() => {
    fetchGoals();
    const handleUpdate = () => fetchGoals();
    window.addEventListener('goalsUpdated', handleUpdate);
    return () => window.removeEventListener('goalsUpdated', handleUpdate);
  }, [computedMonthKey, computedQuarterKey, safeGlobalSettings]);

  const activeSettings = useMemo(() => {
    const settings = {
      ...safeGlobalSettings,
      team_monthly_target: effectiveMonthGoals?.team_goal > 0 ? effectiveMonthGoals.team_goal : safeGlobalSettings.team_monthly_target,
      individual_monthly_commission_threshold: effectiveMonthGoals?.individual_goal > 0 ? effectiveMonthGoals.individual_goal : safeGlobalSettings.individual_monthly_commission_threshold,
      team_quarterly_target: effectiveQuarterGoals?.team_goal > 0 ? effectiveQuarterGoals.team_goal : safeGlobalSettings.team_quarterly_target,
      individual_quarterly_target: effectiveQuarterGoals?.individual_goal > 0 ? effectiveQuarterGoals.individual_goal : safeGlobalSettings.individual_quarterly_target,
    };
    return settings;
  }, [safeGlobalSettings, effectiveMonthGoals, effectiveQuarterGoals]);

  const salesTeamLive = useMemo(() => {
    if (!salesTeamRaw) return [];
    const memberTotals = {};
    if (filteredSalesRecordsFinal && filteredSalesRecordsFinal.length > 0) {
      filteredSalesRecordsFinal.forEach(record => {
        const memberId = record.sales_member_id;
        if (!memberTotals[memberId]) {
          memberTotals[memberId] = {
            monthlySales: 0, quarterlySales: 0, monthlyNonResidentialSales: 0,
            quarterlyNonResidentialSales: 0, monthlyBillingAmount: 0, quarterlyBillingAmount: 0,
          };
        }
        const recordDate = validateDate(new Date(record.created_at));
        if (!recordDate) return;
        const val = parseFloat(record.value) || 0;
        const billingAmt = calculateBillingAmount(val, activeSettings, record.property_type, record.state);
        const pt = record.property_type ? record.property_type.trim().toLowerCase() : '';
        const isNonRes = pt !== 'residential' && pt !== 'residencial';
        const isMTD = isDateFiltered ? true : (recordDate >= activeMonthStart && recordDate <= activeMonthEnd);
        const isQTD = isDateFiltered ? true : (recordDate >= activeQuarterStart && recordDate <= activeQuarterEnd);
        if (isMTD) {
          memberTotals[memberId].monthlySales += val;
          memberTotals[memberId].monthlyBillingAmount += billingAmt;
          if (isNonRes) memberTotals[memberId].monthlyNonResidentialSales += val;
        }
        if (isQTD) {
          memberTotals[memberId].quarterlySales += val;
          memberTotals[memberId].quarterlyBillingAmount += billingAmt;
          if (isNonRes) memberTotals[memberId].quarterlyNonResidentialSales += val;
        }
      });
    }
    return salesTeamRaw.map(member => {
      const totals = memberTotals[member.id] || {
        monthlySales: 0, quarterlySales: 0, monthlyNonResidentialSales: 0,
        quarterlyNonResidentialSales: 0, monthlyBillingAmount: 0, quarterlyBillingAmount: 0,
      };
      return { ...member, ...totals };
    });
  }, [salesTeamRaw, filteredSalesRecordsFinal, activeSettings, isDateFiltered, activeMonthStart, activeMonthEnd, activeQuarterStart, activeQuarterEnd]);

  const enrichedSalesTeam = useMemo(() => {
    return enrichSalesTeamData(salesTeamLive, activeSettings);
  }, [salesTeamLive, activeSettings]);

  const periodStart = periodMode === 'quarter' ? activeQuarterStart : activeMonthStart;
  const periodEnd = periodMode === 'quarter' ? activeQuarterEnd : activeMonthEnd;

  // Filter members dynamically based on their visibility in the selected period
  const visibleEnrichedSalesTeam = useMemo(() => {
    return getVisibleMembersForPeriod(enrichedSalesTeam, filteredSalesRecordsFinal, periodStart, periodEnd);
  }, [enrichedSalesTeam, filteredSalesRecordsFinal, periodStart, periodEnd]);

  // For Admin tables managing members
  const adminFilteredSalesTeam = useMemo(() => {
  if (memberStatusFilter === 'period') return visibleEnrichedSalesTeam;
  if (memberStatusFilter === 'active') return enrichedSalesTeam.filter(m => m.is_archived !== true);
  if (memberStatusFilter === 'archived') return enrichedSalesTeam.filter(m => m.is_archived === true);
  return enrichedSalesTeam;
}, [enrichedSalesTeam, visibleEnrichedSalesTeam, memberStatusFilter]);

  const teamStats = useMemo(() => {
    return calculateSalesStats(visibleEnrichedSalesTeam, activeSettings);
  }, [visibleEnrichedSalesTeam, activeSettings]);

  const comparisonData = useMemo(() => {
    let residential = 0;
    let commercial = 0;
    let bpp = 0;
    const startD = periodMode === 'quarter' ? activeQuarterStart : activeMonthStart;
    const endD = periodMode === 'quarter' ? activeQuarterEnd : activeMonthEnd;
    
    filteredSalesRecordsFinal.forEach(r => {
      const recordDate = validateDate(new Date(r.created_at));
      if (!recordDate || recordDate < startD || recordDate > endD) return;
      
      const type = (r.property_type || '').trim().toUpperCase();
      const value = parseFloat(r.value) || 0;
      
      if (type.includes('RESIDENCIAL') || type === 'RESIDENTIAL') {
        residential += value;
      } else if (type === 'BPP' || type.includes('BUSINESS PERSONAL PROPERTY')) {
        bpp += value;
      } else {
        commercial += value;
      }
    });
    
    return { residential, commercial, bpp };
  }, [filteredSalesRecordsFinal, periodMode, activeQuarterStart, activeQuarterEnd, activeMonthStart, activeMonthEnd]);

  const weeklyData = useMemo(() => {
      if (!validateDate(activeQuarterStart) || !validateDate(activeQuarterEnd)) return [];
      const quarterGoal = parseFloat(activeSettings.team_quarterly_target) || 0;
      const weeks = [];
      let currentDate = new Date(activeQuarterStart);
      while (currentDate.getDay() !== 5) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      while (currentDate <= activeQuarterEnd) {
        const weekEnding = new Date(currentDate);
        weekEnding.setHours(23, 59, 59, 999);
        weeks.push(weekEnding);
        currentDate.setDate(currentDate.getDate() + 7);
      }
      const totalWeeks = weeks.length || 1;
      const today = new Date();
      return weeks.map((friday, index) => {
        const weekNumber = index + 1;
        const cumulativeGoal = (weekNumber / totalWeeks) * quarterGoal;
        const cumulativeAccomplished = filteredSalesRecordsFinal.reduce((sum, record) => {
          const recordDate = validateDate(new Date(record.created_at));
          if (recordDate && recordDate >= activeQuarterStart && recordDate <= friday) {
            return sum + (parseFloat(record.value) || 0);
          }
          return sum;
        }, 0);
        const runRate = cumulativeGoal > 0 ? (cumulativeAccomplished / cumulativeGoal) * 100 : 0;
        const quarterAchievement = quarterGoal > 0 ? (cumulativeAccomplished / quarterGoal) * 100 : 0;
        return {
          weekEnding: safeFormat(friday, 'MMM d, yyyy'),
          weekNumber,
          goal: cumulativeGoal,
          accomplished: cumulativeAccomplished,
          runRate,
          quarterAchievement,
          isFuture: friday > today && (friday.getTime() - today.getTime() > 604800000)
        };
      });
  }, [filteredSalesRecordsFinal, activeSettings.team_quarterly_target, activeQuarterStart, activeQuarterEnd]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMember(prev => ({ ...prev, [name]: value }));
  };

  const resetAddMemberForm = () => {
    setNewMember({
      name: "",
      email: "",
      is_new_member: false,
      new_member_start_date: "",
      role: "member"
    });
  };

  const handleAddMemberSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!user) {
      toast({ title: "Acción Requerida", description: "Inicia sesión para añadir miembros.", variant: "default" });
      return;
    }
    
    if (!newMember.name || !newMember.email) {
      toast({ title: "Error", description: "El nombre y el correo electrónico son obligatorios.", variant: "destructive" });
      return;
    }

    if (!isValidEmail(newMember.email)) {
      toast({ title: "Error", description: "El formato del correo electrónico es inválido.", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-member', {
        body: {
          name: newMember.name,
          email: newMember.email,
          isNewMember: newMember.is_new_member,
          newMemberStartDate: newMember.new_member_start_date,
          role: newMember.role || "member"
        }
      });

      if (error) {
        throw new Error(error.message || "Error de red al invocar la función.");
      }

      if (data && data.error) {
        toast({ title: "Error al Añadir Miembro", description: data.error, variant: "destructive" });
        return;
      }
      
      if (data && data.success) {
        toast({ title: "Éxito", description: "El miembro ha sido creado exitosamente." });
        loadMembers();
        resetAddMemberForm();
        setShowAddMemberModal(false);
      }
    } catch (error) {
      toast({ title: "Error al Añadir Miembro", description: error.message, variant: "destructive" });
      console.error(error);
    }
  };

  const handleDeleteMember = (memberId) => {
    if (!user) return;
    const member = salesTeamRaw?.find(m => m.id === memberId);
    if (member) {
      setMemberPendingArchive(member);
      setIsArchiveModalOpen(true);
    }
  };

  const handleConfirmArchive = async ({ employment_end_date, archive_reason }) => {
    if (!user || !memberPendingArchive) return;
    setIsArchiving(true);
    try {
      await archiveSalesMember(memberPendingArchive.id, employment_end_date, archive_reason, user.id);
      toast({ title: "Miembro Archivado", description: "El miembro ha sido archivado exitosamente. Los datos históricos han sido conservados." });
      loadMembers();
      setIsArchiveModalOpen(false);
      setMemberPendingArchive(null);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreMember = async (memberId) => {
    if (!confirm("Are you sure you want to restore this member to the active team?")) return;
    try {
      await restoreSalesMember(memberId);
      toast({ title: "Miembro Restaurado", description: "El miembro está nuevamente activo." });
      loadMembers();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleOpenEditDialog = (member) => {
    setEditingMember({ ...member, photoFile: null });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedMember = async (updatedMemberData) => {
    if (!user || !editingMember) return;
    try {
      await updateSalesMember(editingMember, updatedMemberData, user.id);
      setIsEditDialogOpen(false);
      setEditingMember(null);
      toast({ title: "Miembro Actualizado", description: "La información ha sido actualizada." });
      loadMembers();
    } catch (error) {
      toast({ title: "Error al Actualizar", description: error.message, variant: "destructive" });
    }
  };
  
  const handleFileUpload = async (uploadedMembers) => {
    if (!user) return;
    try {
      const { successCount, errorCount } = await processExcelUpload(uploadedMembers, salesTeamRaw, user.id);
      if (successCount > 0) {
        toast({ title: "Carga Completada", description: `${successCount} miembros procesados.` });
        loadMembers();
      } else if (errorCount > 0) {
        toast({ title: "Error en Carga", description: "No se pudieron procesar los miembros.", variant: "destructive"});
      } else {
        toast({ title: "Sin Cambios", description: "No se encontraron nuevos datos para cargar."});
      }
    } catch (error) {
      toast({ title: "Error en Carga Masiva", description: error.message, variant: "destructive"});
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      await exportToExcelWithCharts(visibleEnrichedSalesTeam, activeSettings, filteredSalesRecordsFinal);
      toast({ title: "Exportación Exitosa", description: "Se ha generado el reporte optimizado." });
    } catch (error) {
      toast({ title: "Error en Exportación", description: "No se pudo generar el reporte.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPPT = async () => {
    if (!user || visibleEnrichedSalesTeam.length === 0) return;
    setIsGeneratingPPT(true);
    try {
      await generatePowerPointReport(visibleEnrichedSalesTeam, activeSettings, weeklyData, teamStats);
      toast({ title: "Reporte Generado", description: "La presentación se ha descargado correctamente." });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo generar el reporte PowerPoint.", variant: "destructive" });
    } finally {
      setIsGeneratingPPT(false);
    }
  };

  const handleSyncAll = async () => {
    if (!user || salesTeamRaw.length === 0) return;
    setIsSyncing(true);
    let successCount = 0;
    try {
        await Promise.all(salesTeamRaw.map(async (member) => {
            try { await syncMemberMonthlyMetrics(member.id); successCount++; } catch (err) {}
        }));
        await loadMembers();
        toast({ title: "Sincronización Completada", description: `Se han actualizado ${successCount} miembros.` });
    } catch (error) {
        toast({ title: "Error", description: "Hubo un problema al sincronizar.", variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };

  const renderQuarterWeeklyProgressTable = () => {
    return (
      <QuarterWeeklyProgressTable 
        weeklyData={weeklyData} 
        globalSettings={activeSettings}
        isLoading={isLoading}
        isMemberView={false}
        totalWeeks={weeklyData?.length || 13}
        effectiveQuarterGoals={effectiveQuarterGoals}
      />
    );
  };

  const unlinkedMembersCount = salesTeamRaw ? salesTeamRaw.filter(m => !m.linkedUserId).length : 0;

  if (isLoading) { 
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-custom-primary"/></div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-7xl mx-auto px-6 py-6 space-y-8 bg-custom-background"
    >
      <SalesFiltersBlock 
        dateFilter={dateFilter} 
        setDateFilter={setDateFilter} 
        includeResidential={includeResidential} 
        setIncludeResidential={setIncludeResidential} 
      />

      {user && unlinkedMembersCount > 0 && (
          <Alert variant="warning" className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 font-semibold">Cuentas no vinculadas</AlertTitle>
            <AlertDescription className="text-amber-700">
              Se han detectado {unlinkedMembersCount} miembros sin cuenta.
              <Button variant="link" className="text-amber-900 font-bold p-0 ml-2" onClick={() => setIsLinkDialogOpen(true)}>Vincular ahora</Button>
            </AlertDescription>
          </Alert>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <GlobalSettings 
            disabled={!user} 
            periodMode={periodMode} 
            periodKey={currentPeriodKey} 
            periodLabel={currentPeriodLabel} 
          />
          {isAdmin && (
            <QuarterSettingsDialog
              disabled={!user}
              globalSettings={globalSettings}
              fetchSettings={fetchSettings}
              updateGlobalSettings={updateGlobalSettings}
            />
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
            <Badge variant="outline" className="mr-1 bg-gray-50 border-gray-200 text-gray-600 font-medium">
              Mostrando: {currentPeriodLabel}
            </Badge>

            <Tabs value={periodMode} onValueChange={setPeriodMode} className="w-auto">
                <TabsList className="h-8 bg-gray-100/80">
                    <TabsTrigger value="quarter" className="text-xs px-3 h-6 data-[state=active]:bg-white">Trimestre</TabsTrigger>
                    <TabsTrigger value="month" className="text-xs px-3 h-6 data-[state=active]:bg-white">Mes</TabsTrigger>
                </TabsList>
            </Tabs>
            
            <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block"></div>

            {periodMode === 'quarter' ? (
                <Select value={selectedQuarterKey} onValueChange={setSelectedQuarterKey}>
                    <SelectTrigger className="h-8 w-[130px] text-xs border-none shadow-none focus:ring-0 bg-transparent hover:bg-gray-50">
                        <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="current">Actual</SelectItem>
                        {quarterOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            ) : (
                 <Select value={selectedMonthKey} onValueChange={setSelectedMonthKey}>
                    <SelectTrigger className="h-8 w-[130px] text-xs border-none shadow-none focus:ring-0 bg-transparent hover:bg-gray-50">
                        <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="current">Actual</SelectItem>
                        {monthOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
            
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700 ml-1" onClick={() => {
                if(periodMode === 'quarter') setSelectedQuarterKey('current');
                else setSelectedMonthKey('current');
            }}>
                <RefreshCw className="h-3.5 w-3.5" />
            </Button>
        </div>

        <div className="flex gap-2 ml-auto lg:ml-0">
            <Button variant="ghost" onClick={() => setShowDebug(!showDebug)} className={showDebug ? "bg-gray-200" : ""}>
                <Calculator className="w-4 h-4 mr-1" /> Debug Panel
            </Button>
            <Button variant="outline" onClick={handleSyncAll} disabled={!user || isSyncing} className="border-custom-primary text-custom-primary">
                 <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                 Sync Now
            </Button>
            <Button onClick={handleDownloadPPT} disabled={!user || isGeneratingPPT} className="bg-custom-primary hover:bg-custom-primary/90 text-white">
                {isGeneratingPPT ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Presentation className="mr-2 h-4 w-4" />}
                PPT Report
            </Button>
            <Button onClick={handleExport} disabled={!user || isExporting} className="bg-custom-secondary hover:bg-custom-secondary/90 text-white">
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Exportar Excel
            </Button>
        </div>
      </div>
      
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto flex flex-wrap h-auto">
            <TabsTrigger value="dashboard" className="flex-1 sm:flex-none">Dashboard Principal</TabsTrigger>
            <TabsTrigger value="progress" className="flex-1 sm:flex-none"><BarChart2 className="h-4 w-4 mr-2 hidden md:block" /> Progreso Trimestral</TabsTrigger>
            <TabsTrigger value="records" className="flex-1 sm:flex-none">Registro Histórico</TabsTrigger>
            <TabsTrigger value="overrides" className="flex-1 sm:flex-none"><Settings className="h-4 w-4 mr-2 hidden md:block" /> Config. Cuotas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" forceMount className="space-y-8 p-1">
            <section>
              <SummaryCards 
                totalMonthlySales={teamStats.totalMonthlySales} 
                totalQuarterlySales={teamStats.totalQuarterlySales}
                totalMonthlyNonResSales={teamStats.totalMonthlyNonResSales}
                totalQuarterlyNonResSales={teamStats.totalQuarterlyNonResSales}
                averageMonthlySales={teamStats.averageMonthlySales}
                averageQuarterlySales={teamStats.averageQuarterlySales}
                topPerformer={teamStats.topPerformerMonthly ? { name: teamStats.topPerformerMonthly.name, sales: parseFloat(teamStats.topPerformerMonthly.monthlySales) } : null}
                salesTeamCount={visibleEnrichedSalesTeam.length}
                teamMonthlyAchievement={teamStats.teamMonthlyAchievement}
              />
              <div className="mt-8">
                <TimeProgressChart quarterDefinitions={activeSettings.quarter_definitions} />
              </div>
            </section>
            
            <section>
              <TeamOverallProgressCharts
                  salesTeam={visibleEnrichedSalesTeam}
                  globalSettings={activeSettings}
                  totalMonthlySales={teamStats.totalMonthlySales}
                  totalQuarterlySales={teamStats.totalQuarterlySales}
                  totalMonthlyNonResSales={teamStats.totalMonthlyNonResSales}
                  totalQuarterlyNonResSales={teamStats.totalQuarterlyNonResSales}
              />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                  <AddSaleForm mode="admin" salesTeam={visibleEnrichedSalesTeam} onSaleAdded={refreshData} />
                  <AddMemberForm 
                      newMember={newMember}
                      onInputChange={handleInputChange}
                      onAddMember={handleAddMemberSubmit}
                      disabled={!user}
                  />
                  <ExcelUploader onFileUpload={handleFileUpload} disabled={!user} />
                  <CommissionRangesTable />
                </div>
                
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Gestión de Equipo</h3>
                      <p className="text-sm text-gray-500">Administra los miembros y sus metas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="whitespace-nowrap text-sm text-gray-600">Estado:</Label>
                      <Select value={memberStatusFilter} onValueChange={setMemberStatusFilter}>
                        <SelectTrigger className="w-[140px] h-9">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                         <SelectItem value="period">Período seleccionado</SelectItem>
                           <SelectItem value="active">Activos</SelectItem>
                           <SelectItem value="archived">Archivados</SelectItem>
                            <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <SalesTeamTable 
                      salesTeam={adminFilteredSalesTeam}
                      globalSettings={activeSettings}
                      onDeleteMember={(id) => handleDeleteMember(id)}
                      onEditMember={handleOpenEditDialog}
                      onSetPassword={handleOpenSetPasswordModal}
                      disabled={!user}
                      effectiveMonthGoals={effectiveMonthGoals}
                      effectiveQuarterGoals={effectiveQuarterGoals}
                      periodMode={periodMode}
                  />
                  <SalesTeamTableQuarterly 
                      salesTeam={adminFilteredSalesTeam}
                      globalSettings={activeSettings}
                      onDeleteMember={(id) => handleDeleteMember(id)}
                      onEditMember={handleOpenEditDialog}
                      onSetPassword={handleOpenSetPasswordModal}
                      disabled={!user}
                      effectiveMonthGoals={effectiveMonthGoals}
                      effectiveQuarterGoals={effectiveQuarterGoals}
                      periodMode={periodMode}
                  />
                  {memberStatusFilter === 'archived' && (
                     <div className="mt-8">
                       <h3 className="text-lg font-bold mb-4">Registro de Miembros Archivados</h3>
                       <ArchivedMembersTable members={adminFilteredSalesTeam.filter(m => m.is_archived)} onRestore={handleRestoreMember} />
                     </div>
                  )}
                </div>
            </section>
        </TabsContent>

        <TabsContent value="progress" forceMount className="p-1 mt-6 space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <QuarterlyTexasVsOutOfStateChart 
                  selectedQuarter={selectedQuarterKey} 
                  includeResidential={includeResidential} 
               />
               <QuarterGoalDistributionChart 
                quarterGoal={parseFloat(activeSettings.team_quarterly_target) || 0} 
                />
               </div>

                <section>
                 <PropertyTypeComparisonChart comparisonData={comparisonData} />
               </section>

          {renderQuarterWeeklyProgressTable()}
        </TabsContent>

        <TabsContent value="records" forceMount className="p-1 mt-6">
             <AllSalesRecordsTable />
        </TabsContent>

        <TabsContent value="overrides" forceMount className="p-1 mt-6">
          {isAdmin ? (
            <MemberOverridesManager />
          ) : (
            <Alert className="bg-amber-50 text-amber-800 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Acceso Denegado</AlertTitle>
              <AlertDescription>Solo los administradores pueden gestionar las cuotas personalizadas de los miembros.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="audit" forceMount className="p-1 mt-6">
             <AuditPanel />
        </TabsContent>
      </Tabs>

      {editingMember && (
        <EditMemberDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          member={editingMember}
          onSave={handleSaveEditedMember}
          onSetPassword={handleOpenSetPasswordModal}
          currentPhotoUrl={editingMember.photo_url}
        />
      )}

      <ArchiveMemberModal 
        isOpen={isArchiveModalOpen}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setMemberPendingArchive(null);
        }}
        onArchive={handleConfirmArchive}
        isProcessing={isArchiving}
        memberName={memberPendingArchive?.name}
      />

      <LinkUserDialog 
         isOpen={isLinkDialogOpen}
         onOpenChange={setIsLinkDialogOpen}
         salesTeam={salesTeamRaw}
         onLinkSuccess={refreshData}
      />

      <Dialog open={showSetPasswordModal} onOpenChange={setShowSetPasswordModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Establecer Contraseña Temporal</DialogTitle>
            <DialogDescription>
              Asigna una contraseña temporal para que el miembro pueda iniciar sesión en el dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email del Miembro</Label>
              <Input 
                value={selectedMemberForPassword?.email || ''} 
                disabled 
                className="bg-gray-100 text-gray-700"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nueva Contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  type="password" 
                  value={passwordFormData.password} 
                  onChange={(e) => setPasswordFormData({...passwordFormData, password: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-9 text-gray-900"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Confirmar Contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  type="password" 
                  value={passwordFormData.confirmPassword} 
                  onChange={(e) => setPasswordFormData({...passwordFormData, confirmPassword: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-9 text-gray-900"
                />
              </div>
              {passwordFormData.password && passwordFormData.confirmPassword && passwordFormData.password !== passwordFormData.confirmPassword && (
                <p className="text-sm font-medium text-red-500 mt-1">
                  Las contraseñas no coinciden.
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSetPasswordModal} disabled={isSettingPassword}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSetPassword} 
              disabled={
                isSettingPassword || 
                !passwordFormData.password || 
                passwordFormData.password.length < 6 || 
                passwordFormData.password !== passwordFormData.confirmPassword
              }
              className="bg-custom-primary text-white hover:bg-custom-primary/90"
            >
              {isSettingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Establecer Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SalesMetrics;