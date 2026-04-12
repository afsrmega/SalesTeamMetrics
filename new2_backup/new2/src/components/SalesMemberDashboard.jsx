
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatCurrency, getCustomQuarter } from '@/lib/salesUtils';
import { getQuarterDateRange } from '@/lib/getQuarterDateRange';
import { validateBillingRates } from '@/lib/validateBillingRates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Target, Calendar, RefreshCw, Loader2, LayoutDashboard, Wrench, AlertTriangle, Palette, TrendingUp, TrendingDown, Minus, LineChart, AlertCircle, Info } from "lucide-react";
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
import { saveGoalsByPeriod, resolveMemberDashboardGoal } from '@/lib/goalsService';

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

import { useRealTimeSalesData } from "@/hooks/useRealTimeSalesData";
import { syncMemberMonthlyMetrics } from "@/lib/salesService";
import { calculateDateRange, filterSalesRecords, applyResidentialToggle } from "@/lib/filterSalesRecords";
import { convertAndFormatCOP } from '@/lib/currencyUtils';
import { calculateFullCommissionForMemberPeriod } from '@/lib/commissionEngine';

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
  console.log('✅ AUDIT COMPLETE: sales_team.user_id identity fixes applied');
  const { user, globalSettings, isAdmin } = useAuth();
  const { toast } = useToast();
  useColorPreferences();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  // Edit Goal State
  const [isEditGoalDialogOpen, setIsEditGoalDialogOpen] = useState(false);
  const [editGoalValue, setEditGoalValue] = useState("");

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

  const { salesTeam, salesRecords, loading } = useRealTimeSalesData(user?.id);

  const memberData = useMemo(() => {
    if (!salesTeam || !user) return null;
    const found = salesTeam.find(m => m.linkedUserId === user.id);
    if (found) {
      console.log(`✅ Using linked_user_id for member lookup. Found memberData.id: ${found.id}`);
      console.log('AUDIT FIX: Member dashboard now uses linked_user_id for member matching');
    }
    return found;
  }, [salesTeam, user]);

  const activeRange = useMemo(() => calculateDateRange(dateFilter.mode, dateFilter.startDate, dateFilter.endDate), [dateFilter]);
  const isDateFiltered = dateFilter.mode !== 'reset';
  
  const memberSalesRecordsFiltered = useMemo(() => {
    if (!memberData) return [];
    console.log(`✅ Filtering sales using eq('sales_member_id', memberRow.id): ${memberData.id}`);
    const personalRecords = (salesRecords || []).filter(r => r.sales_member_id === memberData.id);
    return filterSalesRecords(personalRecords, activeRange, includeResidential);
  }, [salesRecords, memberData, activeRange, includeResidential]);

  const ranking = useMemo(() => {
    if (!memberData || !salesTeam) return { month: 0, quarter: 0 };
    const sortedByMonth = [...salesTeam].sort((a, b) => parseFloat(b.monthlySales || 0) - parseFloat(a.monthlySales || 0));
    const sortedByQuarter = [...salesTeam].sort((a, b) => parseFloat(b.quarterlySales || 0) - parseFloat(a.quarterlySales || 0));
    return { 
      month: sortedByMonth.findIndex(m => m.id === memberData.id) + 1, 
      quarter: sortedByQuarter.findIndex(m => m.id === memberData.id) + 1 
    };
  }, [salesTeam, memberData]);

  const currentQInfo = useMemo(() => getCustomQuarter(new Date()), []);
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
    const current = startOfMonth(currentMonthDate);
    for(let i = 12; i >= -11; i--) {
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
      if (isNaN(year) || isNaN(quarterNumber)) throw new Error('Invalid quarter key format');
      const quarterData = getQuarterDateRange(year, quarterNumber);
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
    return { activeQuarterStart: qStart, activeQuarterEnd: qEnd, activeQuarterLabel: qLabel, computedQuarterKey: cKey };
  }, [selectedQuarterKey, currentQInfo]);

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
    return { activeMonthStart: mStart, activeMonthEnd: mEnd, activeMonthLabel: mLabel, computedMonthKey: cKey };
  }, [selectedMonthKey, currentMonthDate]);

  const currentPeriodKey = periodMode === 'quarter' ? computedQuarterKey : computedMonthKey;

  const [dashboardMonthlyGoal, setDashboardMonthlyGoal] = useState(0);
  const [dashboardQuarterlyGoal, setDashboardQuarterlyGoal] = useState(0);
  const [resolvingGoals, setResolvingGoals] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchGoals = async () => {
      if (!memberData) return;
      setResolvingGoals(true);
      try {
        const mGoal = await resolveMemberDashboardGoal({
          memberRow: memberData,
          periodKey: computedMonthKey,
          periodMode: 'month'
        });
        const qGoal = await resolveMemberDashboardGoal({
          memberRow: memberData,
          periodKey: computedQuarterKey,
          periodMode: 'quarter'
        });
        
        if (isMounted) {
          setDashboardMonthlyGoal(mGoal);
          setDashboardQuarterlyGoal(qGoal);
        }
      } catch (err) {
        console.error("Error resolving dashboard goals", err);
      } finally {
        if (isMounted) setResolvingGoals(false);
      }
    };
    fetchGoals();
    return () => { isMounted = false; };
  }, [memberData, computedMonthKey, computedQuarterKey]);

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
      toast({ title: "Error", description: "Por favor ingresa un valor válido mayor a 0.", variant: "destructive" });
      return;
    }
    try {
      await saveGoalsByPeriod(periodMode, currentPeriodKey, null, val, user.id); 
      setIsEditGoalDialogOpen(false);
      toast({ title: "Meta actualizada", description: "La meta para este período ha sido guardada." });
    } catch (error) {
      toast({ title: "Error", description: "Hubo un problema al guardar la meta.", variant: "destructive" });
    }
  };

  const commissionMTDMetrics = useMemo(() => {
    const monthStart = activeMonthStart || new Date();
    const monthEnd = activeMonthEnd || new Date();

    if (!memberData || !salesRecords || !validateDate(monthStart)) {
      return { monthStart, monthEnd, goal: null, totalSalesValue: 0, totalBillingAmount: 0, achievementPercent: null, bonusPercent: null, commission: null, tierRange: "None" };
    }

    console.log(`✅ Filtering sales using eq('sales_member_id', memberRow.id): ${memberData.id}`);
    const memberSalesRecords = salesRecords.filter(r => r.sales_member_id === memberData.id);
    const toggledRecords = applyResidentialToggle(memberSalesRecords, includeResidential);
    
    const monthlyRecords = toggledRecords.filter(r => {
        const d = validateDate(new Date(r.created_at));
        return d && d >= monthStart && d <= monthEnd && r.is_valid !== false && r.is_deleted !== true;
    });

    console.log(`✅ Commission calculation using memberRow.id: ${memberData.id} for month with resolved goal: ${dashboardMonthlyGoal}`);
    const engineResult = calculateFullCommissionForMemberPeriod({
      member: { ...memberData, monthly_quota_override_enabled: false },
      periodGoals: { individual_goal: dashboardMonthlyGoal },
      records: monthlyRecords,
      globalSettings,
      periodType: 'month'
    });

    return {
      monthStart,
      monthEnd,
      ...engineResult
    };
  }, [salesRecords, memberData, includeResidential, activeMonthStart, activeMonthEnd, globalSettings, dashboardMonthlyGoal]);

  const quarterlyMetrics = useMemo(() => {
    if (!validateDate(activeQuarterStart) || !validateDate(activeQuarterEnd) || !memberData || !salesRecords) {
      return { goal: null, totalSalesValue: 0, achievementPercent: null };
    }
    
    console.log(`✅ Filtering sales using eq('sales_member_id', memberRow.id): ${memberData.id}`);
    const memberSalesRecords = salesRecords.filter(r => r.sales_member_id === memberData.id);
    const memberSalesRecordsFiltered = applyResidentialToggle(memberSalesRecords, includeResidential);
    
    const quarterlyRecords = memberSalesRecordsFiltered.filter(r => {
      const recordDate = validateDate(new Date(r.created_at));
      return recordDate && recordDate >= activeQuarterStart && recordDate <= activeQuarterEnd;
    });
    
    console.log(`✅ Commission calculation using memberRow.id: ${memberData.id} for quarter with resolved goal: ${dashboardQuarterlyGoal}`);
    const engineResult = calculateFullCommissionForMemberPeriod({
      member: { ...memberData, monthly_quota_override_enabled: false },
      periodGoals: { individual_goal: dashboardQuarterlyGoal },
      records: quarterlyRecords,
      globalSettings,
      periodType: 'quarter'
    });
    
    return engineResult;
  }, [salesRecords, memberData, activeQuarterStart, activeQuarterEnd, includeResidential, globalSettings, dashboardQuarterlyGoal]);

  const monthlyMetrics = useMemo(() => {
     if (!validateDate(activeMonthStart) || !validateDate(activeMonthEnd) || !memberData || !salesRecords) {
         return { activeMonthStart, activeMonthEnd, monthlyAchieved: 0, last7Achieved: 0, prev7Achieved: 0 };
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

     const last7Achieved = toggledRecords.filter(r => {
         const d = validateDate(new Date(r.created_at));
         return d && d >= last7Start && d <= last7End;
     }).reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

     const prev7Achieved = toggledRecords.filter(r => {
         const d = validateDate(new Date(r.created_at));
         return d && d >= prev7Start && d <= prev7End;
     }).reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

     return {
         activeMonthStart,
         activeMonthEnd,
         monthlyQuota: commissionMTDMetrics.goal,
         monthlyAchieved: commissionMTDMetrics.totalSalesValue,
         monthlyPercentage: commissionMTDMetrics.achievementPercent,
         monthlyRemaining: commissionMTDMetrics.goal ? Math.max(0, commissionMTDMetrics.goal - commissionMTDMetrics.totalSalesValue) : null,
         last7Achieved,
         prev7Achieved,
         last7Start,
         last7End
     };
  }, [salesRecords, memberData, commissionMTDMetrics, includeResidential, activeMonthStart, activeMonthEnd]);

  const quarterWeeklyData = useMemo(() => {
     if (!validateDate(activeQuarterStart) || !validateDate(activeQuarterEnd)) return { data: [], totalWeeks: 1 };

     const quarterGoal = quarterlyMetrics.goal || null;
     const weeks = [];
     let loopFriday = new Date(activeQuarterStart);
     while (loopFriday.getDay() !== 5) loopFriday.setDate(loopFriday.getDate() + 1);
     let weekNum = 1;
     while (loopFriday <= activeQuarterEnd) {
         weeks.push({ date: new Date(loopFriday), num: weekNum });
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
     return { data, totalWeeks: totalWks };
  }, [memberSalesRecordsFiltered, quarterlyMetrics.goal, activeQuarterStart, activeQuarterEnd]);

  const monthlyWeeklyData = useMemo(() => {
     if (!validateDate(activeMonthStart) || !validateDate(activeMonthEnd)) return [];

     const monthGoal = commissionMTDMetrics.goal || null;
     const fridays = [];
     let loopFriday = new Date(activeMonthStart);
     while (loopFriday.getDay() !== 5) loopFriday.setDate(loopFriday.getDate() + 1);
     let weekNum = 1;
     while (loopFriday <= activeMonthEnd) {
         fridays.push({ date: new Date(loopFriday), num: weekNum });
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
          const wStart = startOfWeek(date, { weekStartsOn: 1 });
          const key = wStart.toISOString();
          if (!grouped[key]) grouped[key] = { start: wStart, records: [] };
          grouped[key].records.push(r);
      });
      
      return Object.keys(grouped).sort().map((key, i) => {
          const group = grouped[key];
          const wEnd = endOfWeek(group.start, { weekStartsOn: 1 });
          const total = group.records.reduce((sum, r) => sum + (parseFloat(r.value)||0), 0);
          return {
              id: key,
              weekLabel: `Semana ${i+1}`,
              dateRange: `${safeFormat(group.start, 'MMM d')} - ${safeFormat(wEnd, 'MMM d')}`,
              totalSales: total,
              count: group.records.length,
              average: group.records.length > 0 ? total / group.records.length : 0,
              residentialCount: group.records.filter(r => { const pt = (r.property_type||'').toLowerCase(); return pt === 'residential' || pt === 'residencial'; }).length,
              commercialCount: group.records.filter(r => { const pt = (r.property_type||'').toLowerCase(); return pt !== 'residential' && pt !== 'residencial'; }).length
          };
      });
  }, [memberSalesRecordsFiltered]);

  const handleManualSync = async () => {
    if (!memberData?.id) return;
    setIsSyncing(true);
    try {
        await syncMemberMonthlyMetrics(memberData.id);
        toast({ title: "Datos Sincronizados", description: "Tus métricas están actualizándose." });
    } catch (error) {
        toast({ title: "Error", description: "No se pudieron sincronizar los datos.", variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };

  const copRate = globalSettings?.usd_to_cop_rate || 4200;

  if (loading || resolvingGoals) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin rounded-full h-12 w-12 text-custom-primary" /></div>;

  if (!memberData) return (
      <div className="container mx-auto p-4 mt-10"><Alert variant="destructive"><AlertTitle>Cuenta no vinculada</AlertTitle><AlertDescription>Contacta al administrador para vincular tu usuario.</AlertDescription></Alert></div>
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl relative pb-20 bg-custom-background min-h-screen">
      <SalesFiltersBlock 
        dateFilter={dateFilter} 
        setDateFilter={setDateFilter} 
        includeResidential={includeResidential} 
        setIncludeResidential={setIncludeResidential} 
      />

      <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-custom-text">Hola, {memberData.name}</h1>
          <p className="text-custom-text opacity-70 mb-3">Panel de Ventas y Comisiones</p>
          
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 w-fit">
              <Tabs value={periodMode} onValueChange={setPeriodMode} className="w-auto">
                  <TabsList className="h-8 bg-gray-100/80">
                      <TabsTrigger value="quarter" className="text-xs px-3 h-6 data-[state=active]:bg-white">Trimestre</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs px-3 h-6 data-[state=active]:bg-white">Mes</TabsTrigger>
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
                          {quarterOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                      </SelectContent>
                  </Select>
              ) : (
                   <Select value={selectedMonthKey} onValueChange={setSelectedMonthKey}>
                      <SelectTrigger className="h-8 w-[130px] text-xs border-none shadow-none focus:ring-0 bg-transparent hover:bg-gray-50">
                          <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="dropdown-scroll">
                          <SelectItem value="current">Actual</SelectItem>
                          {monthOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                      </SelectContent>
                  </Select>
              )}
              
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700" onClick={() => {
                  if(periodMode === 'quarter') setSelectedQuarterKey('current');
                  else setSelectedMonthKey('current');
              }}>
                  <RefreshCw className="h-3.5 w-3.5" />
              </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleEditGoalClick} className="border-custom-primary text-custom-primary">
                  <Target className="mr-2 h-4 w-4" />
                  Editar Meta
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => setIsColorModalOpen(true)} className="border-custom-primary text-custom-primary hover:bg-custom-primary hover:text-white">
                <Palette className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleManualSync} disabled={isSyncing} className="border-custom-primary text-custom-primary">
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Data
            </Button>
            {memberData.photo_url && <img src={memberData.photo_url} alt="Profile" className="w-16 h-16 rounded-full border-2 border-custom-primary shadow-sm object-cover" />}
        </div>
      </motion.div>

       {user && !validation.isValid && (
        <Alert variant="destructive" className="mb-4">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Error en Datos Globales</AlertTitle>
           <AlertDescription>Contacta a tu administrador. Faltan datos críticos.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-8 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="dashboard"><LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard</TabsTrigger>
          <TabsTrigger value="projection"><LineChart className="w-4 h-4 mr-2" /> Projection</TabsTrigger>
          <TabsTrigger value="tools"><Wrench className="w-4 h-4 mr-2" /> Herramientas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-8">
          <AddSaleForm memberId={memberData.id} onSalesChange={() => {}} />

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
                  <Badge variant="outline" className="border-custom-primary text-custom-primary bg-white">
                      {safeFormat(commissionMTDMetrics.monthStart, 'MMM yyyy')}
                  </Badge>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                <div>
                    <span className="text-gray-500 block text-xs uppercase">Logrado (Base)</span>
                    <span className="font-bold text-lg text-custom-text">{formatCurrency(commissionMTDMetrics.totalBillingAmount)}</span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs uppercase">Meta (Quota)</span>
                    <span className="font-bold text-lg text-custom-text flex items-center gap-1">
                        {commissionMTDMetrics.goal > 0 ? formatCurrency(commissionMTDMetrics.goal) : "Meta no configurada"}
                        {isMonthlyOverride && <AlertCircle className="w-3 h-3 text-amber-500" title="Usando cuota individual desde tu perfil" />}
                    </span>
                </div>
                
                {commissionMTDMetrics.goal > 0 ? (
                  <>
                    <div>
                        <span className="text-gray-500 block text-xs uppercase">% Cumplimiento</span>
                        <span className="font-bold text-lg text-custom-primary">{`${(commissionMTDMetrics.achievementPercent || 0).toFixed(2)}%`}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs uppercase">Tasa Aplicada</span>
                        <span className="font-bold text-lg text-custom-text">{`${commissionMTDMetrics.bonusPercent}%`}</span>
                        <span className="text-[10px] text-gray-500 block">Rango: {commissionMTDMetrics.tierRange}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-gray-500 block text-xs uppercase">Resultado (COP)</span>
                        <span className="font-bold text-lg text-custom-secondary">{convertAndFormatCOP(commissionMTDMetrics.commission, copRate)}</span>
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
                            {!isDateFiltered && <Badge variant="outline" className="border-custom-primary text-custom-primary bg-white">Rank #{ranking.month}</Badge>}
                        </div>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      Meta Ind. (Mensual): {monthlyMetrics.monthlyQuota > 0 ? formatCurrency(monthlyMetrics.monthlyQuota) : 'Meta no configurada'}
                      {isMonthlyOverride && <Badge variant="secondary" className="text-[10px] py-0 px-1 ml-1 bg-amber-100 text-amber-800">Override</Badge>}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                    <div className="flex justify-between items-end border-b pb-4 border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Volumen Total (Mensual)</p>
                            <p className="text-3xl font-bold text-custom-text">{formatCurrency(monthlyMetrics.monthlyAchieved)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Faltante</p>
                            <p className="text-xl font-semibold text-gray-400">{monthlyMetrics.monthlyRemaining !== null ? formatCurrency(monthlyMetrics.monthlyRemaining) : 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase mb-1">Últimos 7 días (Actual)</p>
                            <p className="text-lg font-semibold text-slate-700">{formatCurrency(monthlyMetrics.last7Achieved)}</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <p className="text-xs text-slate-400 mb-1">vs 7 días previos</p>
                            <div className={`flex items-center text-sm font-medium ${
                                monthlyMetrics.last7Achieved > monthlyMetrics.prev7Achieved ? 'text-green-600' :
                                monthlyMetrics.last7Achieved < monthlyMetrics.prev7Achieved ? 'text-red-500' : 'text-slate-500'
                            }`}>
                                {monthlyMetrics.last7Achieved > monthlyMetrics.prev7Achieved ? <TrendingUp className="w-4 h-4 mr-1" /> :
                                 monthlyMetrics.last7Achieved < monthlyMetrics.prev7Achieved ? <TrendingDown className="w-4 h-4 mr-1" /> : <Minus className="w-4 h-4 mr-1" />}
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
                            {!isDateFiltered && <Badge variant="outline" className="border-custom-secondary text-custom-secondary bg-white">Rank #{ranking.quarter}</Badge>}
                        </div>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      Meta Ind. (TOTAL): {quarterlyMetrics.goal > 0 ? formatCurrency(quarterlyMetrics.goal) : 'Meta no configurada'}
                      {isQuarterlyOverride && <Badge variant="secondary" className="text-[10px] py-0 px-1 ml-1 bg-amber-100 text-amber-800">Override</Badge>}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                    <div className="flex justify-between items-end border-b pb-4 border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Logrado Trimestre (TOTAL)</p>
                            <p className="text-3xl font-bold text-custom-text">{formatCurrency(quarterlyMetrics.totalSalesValue)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Faltante</p>
                            <p className="text-xl font-semibold text-gray-400">{quarterlyMetrics.goal > 0 ? formatCurrency(Math.max(0, quarterlyMetrics.goal - quarterlyMetrics.totalSalesValue)) : 'N/A'}</p>
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

        <TabsContent value="projection" className="focus-visible:outline-none focus-visible:ring-0">
          <ProjectionForecast 
            user={user} 
            salesTeamMember={memberData} 
            globalSettings={globalSettings} 
          />
        </TabsContent>

        <TabsContent value="tools" className="focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2"><PropertyCalculator /></div>
            <div className="lg:col-span-1"><div className="sticky top-6"><PhoneIdentifier /></div></div>
          </div>
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
              <Label htmlFor="goal-value" className="mb-2 block text-sm font-medium">Meta para {periodMode === 'quarter' ? activeQuarterLabel : activeMonthLabel}</Label>
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
              <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
              <Button onClick={handleSaveGoal}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SalesMemberDashboard;
