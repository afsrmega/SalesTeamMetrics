import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatCurrency, getCustomQuarter } from '@/lib/salesUtils';
import { getQuarterDateRange } from '@/lib/getQuarterDateRange';
import { validateBillingRates } from '@/lib/validateBillingRates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Target, Calendar, RefreshCw, Loader2, LayoutDashboard, Wrench, AlertTriangle, Palette, TrendingUp, TrendingDown, Minus, LineChart, AlertCircle, Info, KeyRound, Activity, FileSearch, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColorPreferences } from "@/hooks/useColorPreferences";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, isAfter, addMonths } from 'date-fns';
import { saveGoalsByPeriod, getGoalsByPeriod } from '@/lib/goalsService';

import AddSaleForm from "@/components/sales/AddSaleForm";
import SalesHistoryTable from "@/components/sales/SalesHistoryTable";
import WeeklySalesTable from "@/components/sales/WeeklySalesTable"; 
import QuarterWeeklyProgressTable from "@/components/sales/QuarterWeeklyProgressTable"; 
import MonthlyWeeklyProgressTable from "@/components/sales/MonthlyWeeklyProgressTable"; 
import PropertyCalculator from "@/components/PropertyCalculator";
import PhoneIdentifier from "@/components/phone/PhoneIdentifier";
import ColorCustomizer from "@/components/sales/ColorCustomizer";
import SalesFiltersBlock from "@/components/sales/SalesFiltersBlock";
import ProjectionForecast from "@/components/member/ProjectionForecast";
import LeadPaceWidget from "@/components/prospects/LeadPaceWidget";
import SalesLeaderboard from "@/components/member/SalesLeaderboard";
import SalesReconciliation from "@/components/member/SalesReconciliation";

import { useRealTimeSalesData } from "@/hooks/useRealTimeSalesData";
import { syncMemberMonthlyMetrics } from "@/lib/salesService";
import { calculateDateRange, filterSalesRecords, applyResidentialToggle } from "@/lib/filterSalesRecords";
import { convertAndFormatCOP } from '@/lib/currencyUtils';
import { calculateFullCommissionForMemberPeriod } from '@/lib/commissionEngine';
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

const SalesMemberDashboard = () => {
  const { user, globalSettings, isAdmin } = useAuth();
  const { toast } = useToast();
  useColorPreferences();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  // Edit Goal State
  const [isEditGoalDialogOpen, setIsEditGoalDialogOpen] = useState(false);
  const [editGoalValue, setEditGoalValue] = useState("");
  const [effectiveMonthGoals, setEffectiveMonthGoals] = useState(null);
  const [effectiveQuarterGoals, setEffectiveQuarterGoals] = useState(null);

  // Change Password State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordFormData, setChangePasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete Member State
  const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile Photo Upload State
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [localProfilePhotoUrl, setLocalProfilePhotoUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Filters State & Persistence
  const [dateFilter, setDateFilter] = useState(() => {
    const saved = localStorage.getItem('memberDashboardFilters_date');
    return saved ? JSON.parse(saved) : { mode: 'reset', startDate: null, endDate: null };
  });

  const [includeResidential, setIncludeResidential] = useState(() => {
    const saved = localStorage.getItem('memberDashboardFilters_res');
    return saved ? JSON.parse(saved) : false;
  });

  // Period Selection State
  const [periodMode, setPeriodMode] = useState(() => localStorage.getItem('memberPeriodMode') || 'quarter');
  const [selectedQuarterKey, setSelectedQuarterKey] = useState(() => localStorage.getItem('memberSelectedQuarterKey') || 'current');
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => localStorage.getItem('memberSelectedMonthKey') || 'current');

  useEffect(() => {
    localStorage.setItem('memberDashboardFilters_date', JSON.stringify(dateFilter));
    localStorage.setItem('memberDashboardFilters_res', JSON.stringify(includeResidential));
    localStorage.setItem('memberPeriodMode', periodMode);
    localStorage.setItem('memberSelectedQuarterKey', selectedQuarterKey);
    localStorage.setItem('memberSelectedMonthKey', selectedMonthKey);
  }, [dateFilter, includeResidential, periodMode, selectedQuarterKey, selectedMonthKey]);

  const validation = useMemo(() => validateBillingRates(globalSettings), [globalSettings]);

  const quarterDefinitions = useMemo(
    () => globalSettings?.quarter_definitions,
    [globalSettings?.quarter_definitions]
  );

  const { salesTeam, salesRecords, loading, refetch } = useRealTimeSalesData(user?.id);

  const memberData = useMemo(() => {
    if (!salesTeam || !user) return null;
    return salesTeam.find(m => m.linkedUserId === user.id);
  }, [salesTeam, user]);

  useEffect(() => {
    setLocalProfilePhotoUrl(memberData?.photo_url || null);
  }, [memberData?.photo_url]);

  const activeRange = useMemo(
    () => calculateDateRange(
      dateFilter.mode,
      dateFilter.startDate,
      dateFilter.endDate,
      quarterDefinitions
    ), 
    [dateFilter.mode, dateFilter.startDate, dateFilter.endDate, quarterDefinitions]
  );
  
  const isDateFiltered = dateFilter.mode !== 'reset';
  
  const memberSalesRecordsFiltered = useMemo(() => {
    if (!memberData) return [];
    const personalRecords = (salesRecords || []).filter(r => r.sales_member_id === memberData.id);
    return filterSalesRecords(personalRecords, activeRange, includeResidential);
  }, [salesRecords, memberData, activeRange, includeResidential]);

  const currentQInfo = useMemo(
    () => getCustomQuarter(new Date(), quarterDefinitions),
    [quarterDefinitions]
  );

  const currentMonthDate = useMemo(() => new Date(), []);

  const quarterOptions = useMemo(() => {
    const opts = [];
    let { year, quarter } = currentQInfo;
    for (let i = 0; i < 8; i++) {
      opts.push({ key: `${year}-${quarter}`, label: `Q${quarter} FY${year}` });
      quarter--;
      if (quarter === 0) {
        quarter = 4;
        year--;
      }
    }
    return opts;
  }, [currentQInfo]);

  const monthOptions = useMemo(() => {
    const opts = [];
    const current = startOfMonth(currentMonthDate);
    for (let i = 12; i >= -11; i--) {
      const d = addMonths(current, i);
      const isFutureMonth = isAfter(d, current);
      opts.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${format(d, 'MMM yyyy')}${isFutureMonth ? ' (Future)' : ''}`
      });
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

      if (isNaN(year) || isNaN(quarterNumber)) {
        throw new Error('Invalid quarter key format');
      }

      const quarterData = getQuarterDateRange(year, quarterNumber, quarterDefinitions);
      qStart = validateDate(quarterData.start);
      qEnd = validateDate(quarterData.end);
      qLabel = `Q${quarterNumber} FY${year}`;
      cKey = `FY${year}-Q${quarterNumber}`;
    } catch (error) {
      qStart = validateDate(currentQInfo.quarterStart) || new Date();
      qEnd = validateDate(currentQInfo.quarterEnd) || new Date();
      qLabel = currentQInfo.quarterLabel || 'Current Q';
      cKey = `FY${currentQInfo.year}-Q${currentQInfo.quarter}`;
    }

    return {
      activeQuarterStart: qStart,
      activeQuarterEnd: qEnd,
      activeQuarterLabel: qLabel,
      computedQuarterKey: cKey
    };
  }, [selectedQuarterKey, currentQInfo, quarterDefinitions]);

  const { activeMonthStart, activeMonthEnd, activeMonthLabel, computedMonthKey } = useMemo(() => {
    let mStart, mEnd, mLabel, cKey;

    try {
      if (selectedMonthKey === 'current') throw new Error('Use current month fallback');

      const [y, m] = selectedMonthKey.split('-');
      const year = parseInt(y, 10);
      const month = parseInt(m, 10) - 1;

      if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
        throw new Error('Invalid month key format');
      }

      mStart = new Date(year, month, 1);
      mStart.setHours(0, 0, 0, 0);

      mEnd = new Date(year, month + 1, 0);
      mEnd.setHours(23, 59, 59, 999);

      mLabel = safeFormat(mStart, 'MMM yyyy');
      cKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    } catch (error) {
      const now = new Date();

      mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      mStart.setHours(0, 0, 0, 0);

      mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      mEnd.setHours(23, 59, 59, 999);

      mLabel = safeFormat(mStart, 'MMM yyyy');
      cKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    return {
      activeMonthStart: mStart,
      activeMonthEnd: mEnd,
      activeMonthLabel: mLabel,
      computedMonthKey: cKey
    };
  }, [selectedMonthKey, currentMonthDate]);

  const currentPeriodKey = periodMode === 'quarter' ? computedQuarterKey : computedMonthKey;
  useEffect(() => {
    let isMounted = true;

    const fetchPeriodGoals = async () => {
      if (!globalSettings || !computedMonthKey || !computedQuarterKey) return;

      try {
        const [monthGoals, quarterGoals] = await Promise.all([
          getGoalsByPeriod('month', computedMonthKey, globalSettings),
          getGoalsByPeriod('quarter', computedQuarterKey, globalSettings)
        ]);

        if (!isMounted) return;

        setEffectiveMonthGoals(monthGoals);
        setEffectiveQuarterGoals(quarterGoals);
      } catch (error) {
        console.error("Error loading member dashboard period goals:", error);
      }
    };

    fetchPeriodGoals();

    const handleGoalsUpdated = () => {
      fetchPeriodGoals();
    };

    window.addEventListener('goalsUpdated', handleGoalsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('goalsUpdated', handleGoalsUpdated);
    };
  }, [globalSettings, computedMonthKey, computedQuarterKey]);

  const activeCommissionSettings = useMemo(() => {
    if (!globalSettings) return null;

    return {
      ...globalSettings,

      team_monthly_target:
        effectiveMonthGoals?.team_goal > 0
          ? effectiveMonthGoals.team_goal
          : globalSettings.team_monthly_target,

      individual_monthly_commission_threshold:
        effectiveMonthGoals?.individual_goal > 0
          ? effectiveMonthGoals.individual_goal
          : globalSettings.individual_monthly_commission_threshold,

      team_quarterly_target:
        effectiveQuarterGoals?.team_goal > 0
          ? effectiveQuarterGoals.team_goal
          : globalSettings.team_quarterly_target,

      individual_quarterly_target:
        effectiveQuarterGoals?.individual_goal > 0
          ? effectiveQuarterGoals.individual_goal
          : globalSettings.individual_quarterly_target,
    };
  }, [globalSettings, effectiveMonthGoals, effectiveQuarterGoals]);

  const periodStart = periodMode === 'quarter' ? activeQuarterStart : activeMonthStart;
  const periodEnd = periodMode === 'quarter' ? activeQuarterEnd : activeMonthEnd;

  const visibleSalesTeam = useMemo(() => {
    return getVisibleMembersForPeriod(salesTeam, salesRecords, periodStart, periodEnd);
  }, [salesTeam, salesRecords, periodStart, periodEnd]);

  const ranking = useMemo(() => {
    if (!memberData || !visibleSalesTeam) return { month: 0, quarter: 0 };
    const sortedByMonth = [...visibleSalesTeam].sort((a, b) => parseFloat(b.monthlySales || 0) - parseFloat(a.monthlySales || 0));
    const sortedByQuarter = [...visibleSalesTeam].sort((a, b) => parseFloat(b.quarterlySales || 0) - parseFloat(a.quarterlySales || 0));
    return { 
      month: sortedByMonth.findIndex(m => m.id === memberData.id) + 1, 
      quarter: sortedByQuarter.findIndex(m => m.id === memberData.id) + 1 
    };
  }, [visibleSalesTeam, memberData]);

  const isMonthlyOverride = memberData?.monthly_quota_override_enabled === true;
  const isQuarterlyOverride = memberData?.monthly_quota_override_enabled === true;

  const handleEditGoalClick = () => {
    if (!isAdmin) return;
    setEditGoalValue("");
    setIsEditGoalDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsEditGoalDialogOpen(false);
    setEditGoalValue("");
  };

  const handleSaveGoal = async () => {
    const val = parseFloat(editGoalValue);

    if (isNaN(val) || val < 0) {
      toast({
        title: "Error",
        description: "Por favor ingresa un valor válido mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    try {
      await saveGoalsByPeriod(periodMode, currentPeriodKey, null, val, user.id); 
      setIsEditGoalDialogOpen(false);

      toast({
        title: "Meta actualizada",
        description: "La meta para este período ha sido guardada."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al guardar la meta.",
        variant: "destructive"
      });
    }
  };

  // Profile Photo Handlers
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "El archivo debe ser una imagen JPG, PNG o WEBP.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe pesar más de 5MB.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error de autenticación",
        description: "No se pudo identificar tu usuario. Cierra sesión e ingresa nuevamente.",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      toast({
        title: "Error de autenticación",
        description: "No se pudo obtener la sesión. Cierra sesión e ingresa nuevamente.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "No se pudo subir la imagen.");
      }

      const { data: publicUrlData } = supabase.storage
        .from('member-photos')
        .getPublicUrl(fileName);

      const photoUrl = publicUrlData?.publicUrl;

      if (!photoUrl) {
        throw new Error("No se pudo obtener la URL pública de la imagen.");
      }

      const functionUrl = 'https://wvodcaxnrybfcnenccad.supabase.co/functions/v1/update-own-profile-photo';

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ photoUrl }),
      });

      const responseText = await response.text();

      let result = null;

      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(responseText);
        }
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
          result?.message ||
          `Error ${response.status}: no se pudo actualizar la foto.`
        );
      }

      setLocalProfilePhotoUrl(`${photoUrl}?t=${Date.now()}`);

      toast({
        title: "Foto actualizada",
        description: "Tu foto de perfil fue actualizada correctamente.",
      });

      if (refetch) {
        await refetch();
      }
    } catch (err) {
      toast({
        title: "Error al actualizar foto",
        description: err.message || "No se pudo actualizar la foto.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Change Password Handlers
  const handleOpenChangePasswordModal = () => {
    setChangePasswordFormData({
      newPassword: '',
      confirmPassword: ''
    });
    setShowChangePasswordModal(true);
  };

  const handleCloseChangePasswordModal = () => {
    setShowChangePasswordModal(false);
    setChangePasswordFormData({
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleChangePassword = async (e) => {
    if (e) e.preventDefault();

    const { newPassword, confirmPassword } = changePasswordFormData;
    
    if (!newPassword || newPassword.trim().length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim()
      });

      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Tu contraseña ha sido actualizada correctamente."
      });

      handleCloseChangePasswordModal();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la contraseña.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Delete Member Handlers
  const handleOpenDeleteMemberModal = () => {
    setShowDeleteMemberModal(true);
  };

  const handleCloseDeleteMemberModal = () => {
    setShowDeleteMemberModal(false);
  };

  const handleDeleteMember = async () => {
    if (!memberData?.id) {
      toast({
        title: "Error",
        description: "No se pudo identificar el miembro a eliminar.",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-member', {
        body: {
          memberId: memberData.id
        }
      });

      if (error) {
        throw new Error(error.message || 'Error al eliminar el miembro');
      }

      if (data?.success) {
        toast({
          title: "Éxito",
          description: data.message || "Miembro eliminado correctamente"
        });

        handleCloseDeleteMemberModal();
        
        await supabase.auth.signOut();
        window.location.href = '/';
      } else {
        throw new Error(data?.error || 'Error desconocido al eliminar el miembro');
      }
    } catch (error) {
      console.error('Delete member error:', error);

      toast({ 
        title: "Error", 
        description: error.message || "No se pudo eliminar el miembro. Por favor, intenta nuevamente.", 
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const commissionMTDMetrics = useMemo(() => {
    const monthStart = activeMonthStart || new Date();
    const monthEnd = activeMonthEnd || new Date();

    if (!memberData || !salesRecords || !validateDate(monthStart)) {
      return {
        monthStart,
        monthEnd,
        goal: null,
        baseGoal: null,
        totalSalesValue: 0,
        totalBillingAmount: 0,
        achievementPercent: null,
        bonusPercent: null,
        commission: null,
        tierRange: "None"
      };
    }

    const memberSalesRecords = salesRecords.filter(r => r.sales_member_id === memberData.id);
    const toggledRecords = applyResidentialToggle(memberSalesRecords, includeResidential);
    
    const monthlyRecords = toggledRecords.filter(r => {
      const d = validateDate(new Date(r.created_at));
      return d && d >= monthStart && d <= monthEnd && r.is_valid !== false && r.is_deleted !== true;
    });

    const engineResult = calculateFullCommissionForMemberPeriod({
      member: memberData,
      periodGoals: effectiveMonthGoals,
      records: monthlyRecords,
      globalSettings: activeCommissionSettings || globalSettings,
      periodType: 'month'
    });

    return {
      monthStart,
      monthEnd,
      ...engineResult
    };
  }, [salesRecords, memberData, includeResidential, activeMonthStart, activeMonthEnd, globalSettings, activeCommissionSettings, effectiveMonthGoals, globalSettings]);

  const quarterlyMetrics = useMemo(() => {
    if (!validateDate(activeQuarterStart) || !validateDate(activeQuarterEnd) || !memberData || !salesRecords) {
      return {
        goal: null,
        baseGoal: null,
        totalSalesValue: 0,
        achievementPercent: null
      };
    }
    
    const memberSalesRecords = salesRecords.filter(r => r.sales_member_id === memberData.id);
    const memberSalesRecordsFiltered = applyResidentialToggle(memberSalesRecords, includeResidential);
    
    const quarterlyRecords = memberSalesRecordsFiltered.filter(r => {
      const recordDate = validateDate(new Date(r.created_at));
      return recordDate && recordDate >= activeQuarterStart && recordDate <= activeQuarterEnd;
    });
    
    const engineResult = calculateFullCommissionForMemberPeriod({
      member: memberData,
      periodGoals: null, 
      records: quarterlyRecords,
      globalSettings,
      periodType: 'quarter'
    });
    
    return engineResult;
  }, [salesRecords, memberData, activeQuarterStart, activeQuarterEnd, includeResidential, globalSettings]);

  const monthlyMetrics = useMemo(() => {
    if (!validateDate(activeMonthStart) || !validateDate(activeMonthEnd) || !memberData || !salesRecords) {
      return {
        activeMonthStart,
        activeMonthEnd,
        monthlyAchieved: 0,
        last7Achieved: 0,
        prev7Achieved: 0
      };
    }

    const now = new Date();
    const memberSalesRecords = salesRecords.filter(r => r.sales_member_id === memberData.id);
    const toggledRecords = applyResidentialToggle(memberSalesRecords, includeResidential);

    const last7Start = new Date(now);
    last7Start.setDate(now.getDate() - 7);
    last7Start.setHours(0, 0, 0, 0);

    const last7End = new Date(now);
    last7End.setHours(23, 59, 59, 999);

    const prev7Start = new Date(last7Start);
    prev7Start.setDate(last7Start.getDate() - 7);
    prev7Start.setHours(0, 0, 0, 0);

    const prev7End = new Date(last7Start);
    prev7End.setMilliseconds(-1);

    const last7Achieved = toggledRecords
      .filter(r => {
        const d = validateDate(new Date(r.created_at));
        return d && d >= last7Start && d <= last7End;
      })
      .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

    const prev7Achieved = toggledRecords
      .filter(r => {
        const d = validateDate(new Date(r.created_at));
        return d && d >= prev7Start && d <= prev7End;
      })
      .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

    return {
      activeMonthStart,
      activeMonthEnd,
      monthlyQuota: commissionMTDMetrics.goal,
      monthlyAchieved: commissionMTDMetrics.totalSalesValue,
      monthlyPercentage: commissionMTDMetrics.achievementPercent,
      monthlyRemaining: commissionMTDMetrics.goal
        ? Math.max(0, commissionMTDMetrics.goal - commissionMTDMetrics.totalSalesValue)
        : null,
      last7Achieved,
      prev7Achieved,
      last7Start,
      last7End
    };
  }, [salesRecords, memberData, commissionMTDMetrics, includeResidential, activeMonthStart, activeMonthEnd]);

  const quarterWeeklyData = useMemo(() => {
    if (!validateDate(activeQuarterStart) || !validateDate(activeQuarterEnd)) {
      return {
        data: [],
        totalWeeks: 1
      };
    }

    const quarterGoal = quarterlyMetrics.goal || null;
    const weeks = [];
    let loopFriday = new Date(activeQuarterStart);

    while (loopFriday.getDay() !== 5) {
      loopFriday.setDate(loopFriday.getDate() + 1);
    }

    let weekNum = 1;

    while (loopFriday <= activeQuarterEnd) {
      weeks.push({
        date: new Date(loopFriday),
        num: weekNum
      });

      loopFriday.setDate(loopFriday.getDate() + 7);
      weekNum++;
    }

    const totalWks = weeks.length || 1;
    const today = new Date();

    const data = weeks.map(week => {
      const cumGoal = quarterGoal ? quarterGoal * (week.num / totalWks) : null;
      const endDateOfDay = new Date(week.date);
      endDateOfDay.setHours(23, 59, 59, 999);
      
      const accomplished = memberSalesRecordsFiltered
        .filter(r => {
          const d = validateDate(new Date(r.created_at));
          return d && d >= activeQuarterStart && d <= endDateOfDay;
        })
        .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
      
      return {
        weekEnding: safeFormat(week.date, 'MMM d, yyyy'),
        weekNumber: week.num,
        cumulativeGoal: cumGoal,
        accomplished,
        runRate: cumGoal ? (accomplished / cumGoal * 100).toFixed(1) : "0.0",
        quarterAchievement: quarterGoal ? (accomplished / quarterGoal * 100).toFixed(1) : "0.0",
        isCurrentWeek: week.date >= today && week.date.getTime() - today.getTime() < 7 * 86400000
      };
    });

    return {
      data,
      totalWeeks: totalWks
    };
  }, [memberSalesRecordsFiltered, quarterlyMetrics.goal, activeQuarterStart, activeQuarterEnd]);

  const monthlyWeeklyData = useMemo(() => {
    if (!validateDate(activeMonthStart) || !validateDate(activeMonthEnd)) return [];

    const monthGoal = commissionMTDMetrics.goal || null;
    const fridays = [];
    let loopFriday = new Date(activeMonthStart);

    while (loopFriday.getDay() !== 5) {
      loopFriday.setDate(loopFriday.getDate() + 1);
    }

    let weekNum = 1;

    while (loopFriday <= activeMonthEnd) {
      fridays.push({
        date: new Date(loopFriday),
        num: weekNum
      });

      loopFriday.setDate(loopFriday.getDate() + 7);
      weekNum++;
    }

    const totalWks = fridays.length || 4;
    const today = new Date();

    return fridays.map(week => {
      const cumGoal = monthGoal ? monthGoal * (week.num / totalWks) : null;
      const endDateOfDay = new Date(week.date);
      endDateOfDay.setHours(23, 59, 59, 999);

      const accomplished = memberSalesRecordsFiltered
        .filter(r => {
          const d = validateDate(new Date(r.created_at));
          return d && d >= activeMonthStart && d <= endDateOfDay;
        })
        .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

      return {
        weekEnding: safeFormat(week.date, 'MMM d, yyyy'),
        weekNumber: week.num,
        cumulativeGoal: cumGoal,
        accomplished,
        runRate: cumGoal ? (accomplished / cumGoal * 100).toFixed(1) : "0.0",
        monthAchievement: monthGoal ? (accomplished / monthGoal * 100).toFixed(1) : "0.0",
        isCurrentWeek: week.date >= today && week.date.getTime() - today.getTime() < 7 * 86400000
      };
    });
  }, [memberSalesRecordsFiltered, commissionMTDMetrics.goal, activeMonthStart, activeMonthEnd]);

  const weeklySalesDataArray = useMemo(() => {
    const grouped = {};

    memberSalesRecordsFiltered.forEach(r => {
      const date = validateDate(new Date(r.created_at));
      if (!date) return;

      const wStart = startOfWeek(date, {
        weekStartsOn: 1
      });

      const key = wStart.toISOString();

      if (!grouped[key]) {
        grouped[key] = {
          start: wStart,
          records: []
        };
      }

      grouped[key].records.push(r);
    });
    
    return Object.keys(grouped).sort().map((key, i) => {
      const group = grouped[key];
      const wEnd = endOfWeek(group.start, {
        weekStartsOn: 1
      });

      const total = group.records.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

      return {
        id: key,
        weekLabel: `Semana ${i + 1}`,
        dateRange: `${safeFormat(group.start, 'MMM d')} - ${safeFormat(wEnd, 'MMM d')}`,
        totalSales: total,
        count: group.records.length,
        average: group.records.length > 0 ? total / group.records.length : 0,
        residentialCount: group.records.filter(r => {
          const pt = (r.property_type || '').toLowerCase();
          return pt === 'residential' || pt === 'residencial';
        }).length,
        commercialCount: group.records.filter(r => {
          const pt = (r.property_type || '').toLowerCase();
          return pt !== 'residential' && pt !== 'residencial';
        }).length
      };
    });
  }, [memberSalesRecordsFiltered]);

  const handleManualSync = async () => {
    if (!memberData?.id) return;

    setIsSyncing(true);

    try {
      await syncMemberMonthlyMetrics(memberData.id, globalSettings);

      toast({
        title: "Datos Sincronizados",
        description: "Tus métricas están actualizándose."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron sincronizar los datos.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const copRate = globalSettings?.usd_to_cop_rate || 4200;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin rounded-full h-12 w-12 text-custom-primary" />
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="container mx-auto p-4 mt-10">
        <Alert variant="destructive">
          <AlertTitle>Cuenta no vinculada</AlertTitle>
          <AlertDescription>
            Contacta al administrador para vincular tu usuario.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl relative pb-20 bg-custom-background min-h-screen">
      <SalesFiltersBlock 
        dateFilter={dateFilter} 
        setDateFilter={setDateFilter} 
        includeResidential={includeResidential} 
        setIncludeResidential={setIncludeResidential} 
      />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-custom-text flex items-center gap-3">
            Hola, {memberData.name}
            {memberData.is_archived && <span className="badge-archived text-sm">Archived</span>}
          </h1>

          <p className="text-custom-text opacity-70 mb-3">
            Panel de Ventas y Comisiones
          </p>
          
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 w-fit">
            <Tabs value={periodMode} onValueChange={setPeriodMode} className="w-auto">
              <TabsList className="h-8 bg-gray-100/80">
                <TabsTrigger value="quarter" className="text-xs px-3 h-6 data-[state=active]:bg-white">
                  Trimestre
                </TabsTrigger>

                <TabsTrigger value="month" className="text-xs px-3 h-6 data-[state=active]:bg-white">
                  Mes
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="h-4 w-px bg-gray-200 mx-1"></div>

            {periodMode === 'quarter' ? (
              <Select value={selectedQuarterKey} onValueChange={setSelectedQuarterKey}>
                <SelectTrigger className="h-8 w-[130px] text-xs border-none shadow-none focus:ring-0 bg-transparent hover:bg-gray-50">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>

                <SelectContent className="dropdown-scroll">
                  <SelectItem value="current">Actual</SelectItem>
                  {quarterOptions.map(o => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={selectedMonthKey} onValueChange={setSelectedMonthKey}>
                <SelectTrigger className="h-8 w-[130px] text-xs border-none shadow-none focus:ring-0 bg-transparent hover:bg-gray-50">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>

                <SelectContent className="dropdown-scroll">
                  <SelectItem value="current">Actual</SelectItem>
                  {monthOptions.map(o => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-gray-700"
              onClick={() => {
                if (periodMode === 'quarter') setSelectedQuarterKey('current');
                else setSelectedMonthKey('current');
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenChangePasswordModal}
            className="border-custom-primary text-custom-primary"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Cambiar Contraseña
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditGoalClick}
              className="border-custom-primary text-custom-primary"
            >
              <Target className="mr-2 h-4 w-4" />
              Editar Meta
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsColorModalOpen(true)}
            className="border-custom-primary text-custom-primary hover:bg-custom-primary hover:text-white"
          >
            <Palette className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="border-custom-primary text-custom-primary"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
          
          <div 
            className="relative group cursor-pointer"
            title="Cambiar foto de perfil"
            onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
          >
            {(localProfilePhotoUrl || memberData?.photo_url) ? (
              <img 
                src={localProfilePhotoUrl || memberData?.photo_url} 
                alt="Profile" 
                className={`w-16 h-16 rounded-full border-2 border-custom-primary shadow-sm object-cover transition-opacity ${isUploadingPhoto ? 'opacity-50' : ''}`} 
              />
            ) : (
              <div className={`w-16 h-16 rounded-full border-2 border-custom-primary shadow-sm bg-gray-100 flex items-center justify-center transition-opacity ${isUploadingPhoto ? 'opacity-50' : ''}`}>
                <span className="text-xl font-bold text-gray-400">
                  {memberData.name?.charAt(0)}
                </span>
              </div>
            )}

            <div className={`absolute inset-0 flex items-center justify-center rounded-full transition-opacity ${isUploadingPhoto ? 'opacity-100 bg-black/30' : 'opacity-0 group-hover:opacity-100 bg-black/40'}`}>
              {isUploadingPhoto ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </div>

          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/png,image/jpeg,image/jpg,image/webp" 
            onChange={handlePhotoUpload} 
            style={{ display: 'none' }} 
          />
        </div>
      </motion.div>

      {user && !validation.isValid && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error en Datos Globales</AlertTitle>
          <AlertDescription>
            Contacta a tu administrador. Faltan datos críticos.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-[1200px] mb-8 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
          </TabsTrigger>

          <TabsTrigger value="productivity">
            <Activity className="w-4 h-4 mr-2" /> Productividad
          </TabsTrigger>

          <TabsTrigger value="projection">
            <LineChart className="w-4 h-4 mr-2" /> Projection
          </TabsTrigger>

          <TabsTrigger value="tools">
            <Wrench className="w-4 h-4 mr-2" /> Herramientas
          </TabsTrigger>

          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />Leaderboard
          </TabsTrigger>

          <TabsTrigger value="reconciliation">
            <FileSearch className="w-4 h-4 mr-2" />Conciliación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" forceMount className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <AddSaleForm memberId={memberData.id} onSalesChange={() => {}} />
          </div>

          <div className="rounded-lg p-4 mb-4 text-sm shadow-sm bg-white border-l-4 border-custom-primary relative">
            <div className="font-semibold mb-2 flex items-center justify-between text-custom-primary">
              <div className="flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Detalles de Comisión {isDateFiltered ? "(Rango Filtrado)" : "MTD"}
              </div>

              <div className="flex items-center gap-2">
                {isMonthlyOverride && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <Info className="w-3 h-3 mr-1" /> Cuota Personalizada Activa
                  </Badge>
                )}

                {memberData.is_new_member && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Info className="w-3 h-3 mr-1" /> Meta Ajustada (Onboarding)
                  </Badge>
                )}

                <Badge variant="outline" className="border-custom-primary text-custom-primary bg-white">
                  {safeFormat(commissionMTDMetrics.monthStart, 'MMM yyyy')}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
              <div>
                <span className="text-gray-500 block text-xs uppercase">Logrado (Base)</span>
                <span className="font-bold text-lg text-custom-text">
                  {formatCurrency(commissionMTDMetrics.totalBillingAmount)}
                </span>
              </div>

              <div>
                <span className="text-gray-500 block text-xs uppercase">Meta (Quota)</span>
                <span className="font-bold text-lg text-custom-text flex items-center gap-1">
                  {commissionMTDMetrics.goal > 0 ? formatCurrency(commissionMTDMetrics.goal) : "Meta no configurada"}
                  {isMonthlyOverride && (
                    <AlertCircle
                      className="w-3 h-3 text-amber-500"
                      title="Usando cuota individual desde tu perfil"
                    />
                  )}
                </span>
              </div>
              
              {commissionMTDMetrics.goal > 0 ? (
                <>
                  <div>
                    <span className="text-gray-500 block text-xs uppercase">% Cumplimiento</span>
                    <span className="font-bold text-lg text-custom-primary">
                      {`${(commissionMTDMetrics.achievementPercent || 0).toFixed(2)}%`}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block text-xs uppercase">Tasa Aplicada</span>
                    <span className="font-bold text-lg text-custom-text">
                      {`${commissionMTDMetrics.bonusPercent}%`}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      Rango: {commissionMTDMetrics.tierRange}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-gray-500 block text-xs uppercase">Resultado (COP)</span>
                    <span className="font-bold text-lg text-custom-secondary">
                      {convertAndFormatCOP(commissionMTDMetrics.commission, copRate)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="col-span-3 flex items-center text-sm text-amber-600 font-medium">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  No se puede calcular comisión sin una meta configurada. Por favor, contacta a tu administrador.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-full shadow-md border-t-4 border-t-custom-primary relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-custom-primary">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" /> 
                    Rendimiento Mensual ({activeMonthLabel})
                  </div>

                  <div className="flex items-center gap-2">
                    {!includeResidential && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-none">
                        Sin residenciales
                      </Badge>
                    )}

                    {!isDateFiltered && (
                      <Badge variant="outline" className="border-custom-primary text-custom-primary bg-white">
                        Rank #{ranking.month}
                      </Badge>
                    )}
                  </div>
                </CardTitle>

                <CardDescription className="flex items-center gap-1">
                  Meta Ind. (Mensual): {monthlyMetrics.monthlyQuota > 0 ? formatCurrency(monthlyMetrics.monthlyQuota) : 'Meta no configurada'}
                  {isMonthlyOverride && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1 ml-1 bg-amber-100 text-amber-800">
                      Override
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-5">
                <div className="flex justify-between items-end border-b pb-4 border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Volumen Total (Mensual)</p>
                    <p className="text-3xl font-bold text-custom-text">
                      {formatCurrency(monthlyMetrics.monthlyAchieved)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Faltante</p>
                    <p className="text-xl font-semibold text-gray-400">
                      {monthlyMetrics.monthlyRemaining !== null ? formatCurrency(monthlyMetrics.monthlyRemaining) : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase mb-1">Últimos 7 días (Actual)</p>
                    <p className="text-lg font-semibold text-slate-700">
                      {formatCurrency(monthlyMetrics.last7Achieved)}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <p className="text-xs text-slate-400 mb-1">vs 7 días previos</p>

                    <div className={`flex items-center text-sm font-medium ${
                      monthlyMetrics.last7Achieved > monthlyMetrics.prev7Achieved ? 'text-green-600' :
                      monthlyMetrics.last7Achieved < monthlyMetrics.prev7Achieved ? 'text-red-500' : 'text-slate-500'
                    }`}>
                      {monthlyMetrics.last7Achieved > monthlyMetrics.prev7Achieved ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : monthlyMetrics.last7Achieved < monthlyMetrics.prev7Achieved ? (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      ) : (
                        <Minus className="w-4 h-4 mr-1" />
                      )}

                      {formatCurrency(Math.abs(monthlyMetrics.last7Achieved - monthlyMetrics.prev7Achieved))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">% Cumplimiento</span>

                    <span className={`font-bold ${
                      monthlyMetrics.monthlyPercentage >= 100 ? 'text-green-600' :
                      (monthlyMetrics.monthlyPercentage !== null && monthlyMetrics.monthlyPercentage >= 75) ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {monthlyMetrics.monthlyPercentage !== null ? `${monthlyMetrics.monthlyPercentage.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>

                  {monthlyMetrics.monthlyPercentage !== null && (
                    <Progress 
                      value={Math.min(monthlyMetrics.monthlyPercentage, 100)} 
                      className={`h-2.5 ${
                        monthlyMetrics.monthlyPercentage >= 100 ? '[&>div]:bg-green-500' : 
                        monthlyMetrics.monthlyPercentage >= 75 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                      }`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="h-full shadow-md border-t-4 border-t-custom-secondary relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-custom-secondary">
                  <div className="flex items-center">
                    <Target className="mr-2 h-5 w-5" /> 
                    Rendimiento Trimestral ({activeQuarterLabel})
                  </div>

                  <div className="flex items-center gap-2">
                    {!includeResidential && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-none">
                        Sin residenciales
                      </Badge>
                    )}

                    {!isDateFiltered && (
                      <Badge variant="outline" className="border-custom-secondary text-custom-secondary bg-white">
                        Rank #{ranking.quarter}
                      </Badge>
                    )}
                  </div>
                </CardTitle>

                <CardDescription className="flex items-center gap-1">
                  Meta Ind. (TOTAL): {quarterlyMetrics.goal > 0 ? formatCurrency(quarterlyMetrics.goal) : 'Meta no configurada'}
                  {isQuarterlyOverride && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1 ml-1 bg-amber-100 text-amber-800">
                      Override
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-5">
                <div className="flex justify-between items-end border-b pb-4 border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Logrado Trimestre (TOTAL)</p>
                    <p className="text-3xl font-bold text-custom-text">
                      {formatCurrency(quarterlyMetrics.totalSalesValue)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Faltante</p>
                    <p className="text-xl font-semibold text-gray-400">
                      {quarterlyMetrics.goal > 0 ? formatCurrency(Math.max(0, quarterlyMetrics.goal - quarterlyMetrics.totalSalesValue)) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">% Cuota (Total)</span>

                    <span className={`font-bold ${
                      quarterlyMetrics.achievementPercent >= 100 ? 'text-green-600' :
                      (quarterlyMetrics.achievementPercent !== null && quarterlyMetrics.achievementPercent >= 75) ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {quarterlyMetrics.achievementPercent !== null ? `${quarterlyMetrics.achievementPercent.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>

                  {quarterlyMetrics.achievementPercent !== null && (
                    <Progress 
                      value={Math.min(quarterlyMetrics.achievementPercent, 100)} 
                      className={`h-2.5 ${
                        quarterlyMetrics.achievementPercent >= 100 ? '[&>div]:bg-green-500' : 
                        quarterlyMetrics.achievementPercent >= 75 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                      }`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <SalesHistoryTable memberId={memberData.id} onSalesChange={() => {}} />

          <WeeklySalesTable weeklyData={weeklySalesDataArray} loading={false} error={null} />

          <QuarterWeeklyProgressTable 
            weeklyData={quarterWeeklyData.data}
            globalSettings={globalSettings}
            isLoading={false}
            isMemberView={true}
            totalWeeks={quarterWeeklyData.totalWeeks}
            individualQuarterGoal={quarterlyMetrics.goal}
            memberId={memberData.id}
            selectedQuarter={computedQuarterKey}
            memberQuarterlyQuota={memberData.quarterlyQuota || memberData.quarterly_quota}
            overrideEnabled={isQuarterlyOverride}
          />

          <MonthlyWeeklyProgressTable
            weeks={monthlyWeeklyData}
            globalSettings={globalSettings}
            isLoading={false}
          />
        </TabsContent>

        <TabsContent value="productivity" forceMount className="focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <LeadPaceWidget />
          </div>
        </TabsContent>

        <TabsContent value="projection" forceMount className="focus-visible:outline-none focus-visible:ring-0">
          <ProjectionForecast 
            user={user} 
            salesTeamMember={memberData} 
            globalSettings={globalSettings} 
          />
        </TabsContent>

        <TabsContent value="tools" forceMount className="focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <PropertyCalculator />
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <PhoneIdentifier />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" forceMount className="focus-visible:outline-none focus-visible:ring-0">
          <SalesLeaderboard 
            salesTeam={visibleSalesTeam}
            salesRecords={salesRecords}
            memberData={memberData}
            activeMonthStart={activeMonthStart}
            activeMonthEnd={activeMonthEnd}
            activeMonthLabel={activeMonthLabel}
            activeQuarterStart={activeQuarterStart}
            activeQuarterEnd={activeQuarterEnd}
            activeQuarterLabel={activeQuarterLabel}
            includeResidential={includeResidential}
          />
        </TabsContent>

        <TabsContent value="reconciliation" forceMount className="focus-visible:outline-none focus-visible:ring-0">
          <SalesReconciliation />
        </TabsContent>
      </Tabs>

      <ColorCustomizer isOpen={isColorModalOpen} onClose={() => setIsColorModalOpen(false)} />

      {isAdmin && (
        <Dialog open={isEditGoalDialogOpen} onOpenChange={setIsEditGoalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Meta del Período</DialogTitle>
              <DialogDescription>
                Ajusta la meta individual base para todo el equipo en el período seleccionado ({periodMode === 'quarter' ? activeQuarterLabel : activeMonthLabel}). Esto modifica goals_by_period.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label htmlFor="goal-value" className="mb-2 block text-sm font-medium">
                Meta para {periodMode === 'quarter' ? activeQuarterLabel : activeMonthLabel}
              </Label>

              <Input 
                id="goal-value"
                type="number" 
                min="0"
                step="100"
                value={editGoalValue} 
                onChange={(e) => setEditGoalValue(e.target.value)} 
                placeholder="Ej. 15000"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>

              <Button onClick={handleSaveGoal}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Change Password Modal */}
      <Dialog open={showChangePasswordModal} onOpenChange={setShowChangePasswordModal}>
        <DialogContent className="sm:max-w-[425px] z-50">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nueva Contraseña</Label>

              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

                <Input 
                  type="password" 
                  value={changePasswordFormData.newPassword} 
                  onChange={(e) => setChangePasswordFormData({
                    ...changePasswordFormData,
                    newPassword: e.target.value
                  })}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-9"
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confirmar Contraseña</Label>

              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

                <Input 
                  type="password" 
                  value={changePasswordFormData.confirmPassword} 
                  onChange={(e) => setChangePasswordFormData({
                    ...changePasswordFormData,
                    confirmPassword: e.target.value
                  })}
                  placeholder="Confirmar nueva contraseña"
                  className="pl-9"
                  minLength={6}
                />
              </div>

              {changePasswordFormData.newPassword &&
                changePasswordFormData.confirmPassword &&
                changePasswordFormData.newPassword !== changePasswordFormData.confirmPassword && (
                  <p className="text-sm font-medium text-red-500 mt-1">
                    Las contraseñas no coinciden.
                  </p>
                )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseChangePasswordModal}
              disabled={isUpdatingPassword}
            >
              Cancelar
            </Button>

            <Button 
              onClick={handleChangePassword} 
              disabled={
                isUpdatingPassword || 
                !changePasswordFormData.newPassword || 
                changePasswordFormData.newPassword.trim().length < 6 || 
                changePasswordFormData.newPassword !== changePasswordFormData.confirmPassword
              }
              className="bg-custom-primary text-white hover:bg-custom-primary/90"
            >
              {isUpdatingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              {isUpdatingPassword ? "Actualizando..." : "Cambiar Contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Modal */}
      <Dialog open={showDeleteMemberModal} onOpenChange={setShowDeleteMemberModal}>
        <DialogContent className="sm:max-w-[425px] z-50">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Eliminar Cuenta
            </DialogTitle>

            <DialogDescription>
              Esta acción es permanente e irreversible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Advertencia</AlertTitle>
              <AlertDescription>
                Esto eliminará permanentemente tu cuenta ({memberData?.name}) y tu usuario de autenticación. No podrás volver a acceder a esta cuenta.
              </AlertDescription>
            </Alert>

            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.
            </p>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCloseDeleteMemberModal} 
              disabled={isDeleting}
            >
              Cancelar
            </Button>

            <Button 
              onClick={handleDeleteMember} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              {isDeleting ? "Eliminando..." : "Eliminar Cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesMemberDashboard;