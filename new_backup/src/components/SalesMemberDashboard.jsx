
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getGoalsByPeriod } from '@/lib/goalsService';
import { formatCurrency, getCustomQuarter, calculateCommissionWithTiers, calculateBillingAmount } from '@/lib/salesUtils';
import { getQuarterDateRange } from '@/lib/getQuarterDateRange';
import { validateBillingRates } from '@/lib/validateBillingRates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DollarSign, Target, Calendar, Bell, RefreshCw, Loader2, LayoutDashboard, Wrench, AlertTriangle, Palette, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useColorPreferences } from "@/hooks/useColorPreferences";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, isValid } from 'date-fns';

import AddSaleForm from "@/components/sales/AddSaleForm";
import SalesHistoryTable from "@/components/sales/SalesHistoryTable";
import WeeklySalesTable from "@/components/sales/WeeklySalesTable"; 
import QuarterWeeklyProgressTable from "@/components/sales/QuarterWeeklyProgressTable"; 
import MonthlyWeeklyProgressTable from "@/components/sales/MonthlyWeeklyProgressTable"; 
import PropertyCalculator from "@/components/PropertyCalculator";
import PhoneIdentifier from "@/components/phone/PhoneIdentifier";
import ColorCustomizer from "@/components/sales/ColorCustomizer";
import SalesFiltersBlock from "@/components/sales/SalesFiltersBlock";

import { useRealTimeSalesData } from "@/hooks/useRealTimeSalesData";
import { syncMemberMonthlyMetrics } from "@/lib/salesService";
import { calculateDateRange, filterSalesRecords, applyResidentialToggle } from "@/lib/filterSalesRecords";

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
  const { user, globalSettings } = useAuth();
  const { toast } = useToast();
  useColorPreferences();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

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

  const [periodGoals, setPeriodGoals] = useState({ individual_goal: 0 });

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
    return salesTeam.find(m => m.linkedUserId === user.id);
  }, [salesTeam, user]);

  // Apply Global Filters
  const activeRange = useMemo(() => calculateDateRange(dateFilter.mode, dateFilter.startDate, dateFilter.endDate), [dateFilter]);
  const isDateFiltered = dateFilter.mode !== 'reset';
  
  const memberSalesRecordsFiltered = useMemo(() => {
    if (!memberData) return [];
    const personalRecords = (salesRecords || []).filter(r => r.sales_member_id === memberData.id);
    return filterSalesRecords(personalRecords, activeRange, includeResidential);
  }, [salesRecords, memberData, activeRange, includeResidential]);

  // Ranking
  const ranking = useMemo(() => {
    if (!memberData || !salesTeam) return { month: 0, quarter: 0 };
    const sortedByMonth = [...salesTeam].sort((a, b) => parseFloat(b.monthlySales || 0) - parseFloat(a.monthlySales || 0));
    const sortedByQuarter = [...salesTeam].sort((a, b) => parseFloat(b.quarterlySales || 0) - parseFloat(a.quarterlySales || 0));
    return { 
      month: sortedByMonth.findIndex(m => m.id === memberData.id) + 1, 
      quarter: sortedByQuarter.findIndex(m => m.id === memberData.id) + 1 
    };
  }, [salesTeam, memberData]);

  // Period Options Generators
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
    let d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
    for(let i=0; i<12; i++) {
        opts.push({ 
            key: `${d.getFullYear()}-${d.getMonth()}`, 
            label: format(d, 'MMM yyyy')
        });
        d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, [currentMonthDate]);

  // Active Period Dates Calculation
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
      if (!qStart || !qEnd) throw new Error('Invalid quarter dates generated');
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
      const month = parseInt(m, 10);
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

  const fetchGoals = async () => {
    if (!globalSettings) return;
    const goals = await getGoalsByPeriod(periodMode, currentPeriodKey, globalSettings);
    setPeriodGoals(goals);
  };

  useEffect(() => {
    fetchGoals();
    const handleUpdate = () => fetchGoals();
    window.addEventListener('goalsUpdated', handleUpdate);
    return () => window.removeEventListener('goalsUpdated', handleUpdate);
  }, [periodMode, currentPeriodKey, globalSettings]);

  const quarterlyTarget = periodMode === 'quarter' && periodGoals.isCustom ? periodGoals.individual_goal : (memberData?.quarterly_quota || globalSettings?.individual_quarterly_target || 15000);
  const monthlyTarget = periodMode === 'month' && periodGoals.isCustom ? periodGoals.individual_goal : (memberData?.monthly_quota || globalSettings?.individual_monthly_commission_threshold || 5000);

  // STRICT MTD METRICS 
  const monthlyMetrics = useMemo(() => {
     if (!validateDate(activeMonthStart) || !validateDate(activeMonthEnd)) {
         return { 
             activeMonthStart: new Date(), activeMonthEnd: new Date(), monthlyQuota: 0, 
             monthlyAchieved: 0, monthlyPercentage: 0, monthlyRemaining: 0,
             last7Achieved: 0, prev7Achieved: 0, last7Start: new Date(), last7End: new Date()
         };
     }

     if (!memberData || !salesRecords) {
         return { 
             activeMonthStart, activeMonthEnd, monthlyQuota: 0, 
             monthlyAchieved: 0, monthlyPercentage: 0, monthlyRemaining: 0,
             last7Achieved: 0, prev7Achieved: 0, last7Start: new Date(), last7End: new Date()
         };
     }

     const now = new Date();
     const memberSalesRecords = salesRecords.filter(r => r.sales_member_id === memberData.id);
     const toggledRecords = applyResidentialToggle(memberSalesRecords, includeResidential);

     const monthlyRecords = toggledRecords.filter(r => {
         const d = validateDate(new Date(r.created_at));
         return d && d >= activeMonthStart && d <= activeMonthEnd;
     });

     const monthlyQuota = parseFloat(monthlyTarget);
     const monthlyAchieved = monthlyRecords.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
     
     const monthlyPercentage = monthlyQuota > 0 ? (monthlyAchieved / monthlyQuota) * 100 : 0;
     const monthlyRemaining = Math.max(0, monthlyQuota - monthlyAchieved);

     // 7 days metrics calculation (STRICTLY relative to NOW, not selected period)
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

     const last7Records = toggledRecords.filter(r => {
         const d = validateDate(new Date(r.created_at));
         return d && d >= last7Start && d <= last7End;
     });
     const last7Achieved = last7Records.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

     const prev7Records = toggledRecords.filter(r => {
         const d = validateDate(new Date(r.created_at));
         return d && d >= prev7Start && d <= prev7End;
     });
     const prev7Achieved = prev7Records.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

     return {
         activeMonthStart,
         activeMonthEnd,
         monthlyQuota,
         monthlyAchieved,
         monthlyPercentage,
         monthlyRemaining,
         last7Achieved,
         prev7Achieved,
         last7Start,
         last7End
     };
  }, [salesRecords, memberData?.id, monthlyTarget, includeResidential, activeMonthStart, activeMonthEnd]);

  // STRICT QTD METRICS
  const quarterlyMetrics = useMemo(() => {
    if (!validateDate(activeQuarterStart) || !validateDate(activeQuarterEnd)) {
      return { achievedQtdFiltered: 0, quarterGoal: 0, quotaPct: 0 };
    }

    if (!memberData || !salesRecords) {
      return { achievedQtdFiltered: 0, quarterGoal: 0, quotaPct: 0 };
    }
    
    const memberSalesRecords = salesRecords.filter(r => r.sales_member_id === memberData.id);
    const memberSalesRecordsFiltered = applyResidentialToggle(memberSalesRecords, includeResidential);
    
    const quarterlyRecords = memberSalesRecordsFiltered.filter(r => {
      const recordDate = validateDate(new Date(r.created_at));
      return recordDate && recordDate >= activeQuarterStart && recordDate <= activeQuarterEnd;
    });
    
    const achievedQtdFiltered = quarterlyRecords.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
    const quarterGoal = parseFloat(quarterlyTarget);
    const quotaPct = quarterGoal > 0 ? (achievedQtdFiltered / quarterGoal) * 100 : 0;
    
    return { achievedQtdFiltered, quarterGoal, quotaPct };
  }, [salesRecords, memberData?.id, quarterlyTarget, activeQuarterStart, activeQuarterEnd, includeResidential]);

  // MTD Commission Metrics
  const commissionMTDMetrics = useMemo(() => {
    if (!validateDate(activeMonthStart) || !validateDate(activeMonthEnd)) {
      return { activeMonthStart: new Date(), activeMonthEnd: new Date(), achievedBaseMTD: 0, monthlyGoal: 0, percentAchievement: 0, appliedRate: 0, commission: 0, tierRange: "None" };
    }

    if (!memberData || !salesRecords) {
        return { activeMonthStart, activeMonthEnd, achievedBaseMTD: 0, monthlyGoal: 0, percentAchievement: 0, appliedRate: 0, commission: 0, tierRange: "None" };
    }

    const memberSalesRecords = salesRecords.filter(r => r.sales_member_id === memberData.id);
    
    const monthlyRecords = memberSalesRecords.filter(r => {
        const d = validateDate(new Date(r.created_at));
        return d && d >= activeMonthStart && d <= activeMonthEnd && r.is_valid !== false && r.is_deleted !== true;
    });

    const achievedBaseMTD = monthlyRecords.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
    const monthlyGoal = parseFloat(monthlyTarget);
    const percentAchievement = monthlyGoal > 0 ? (achievedBaseMTD / monthlyGoal) * 100 : 0;

    let appliedRate = 0;
    let tierRange = "None";
    const tiers = globalSettings?.commission_tiers || [];

    if (tiers.length > 0) {
        const sortedTiers = [...tiers].sort((a, b) => parseFloat(a.min) - parseFloat(b.min));
        const match = sortedTiers.reverse().find(t => percentAchievement >= parseFloat(t.min));
        
        if (match) {
            appliedRate = parseFloat(match.rate);
            tierRange = match.max ? `${match.min}% - ${match.max}%` : `>= ${match.min}%`;
        }
    }

    const commission = achievedBaseMTD * (appliedRate / 100);

    return {
        activeMonthStart,
        activeMonthEnd,
        achievedBaseMTD,
        monthlyGoal,
        percentAchievement,
        appliedRate,
        commission,
        tierRange
    };
  }, [salesRecords, memberData?.id, monthlyTarget, globalSettings?.commission_tiers, activeMonthStart, activeMonthEnd]);

  const quarterWeeklyData = useMemo(() => {
     if (!validateDate(activeQuarterStart) || !validateDate(activeQuarterEnd)) return { data: [], totalWeeks: 1 };

     const quarterGoal = quarterlyTarget;
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
         const cumGoal = quarterGoal * (week.num / totalWks);
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
            runRate: cumGoal > 0 ? (accomplished / cumGoal * 100).toFixed(1) : "0.0",
            quarterAchievement: quarterGoal > 0 ? (accomplished / quarterGoal * 100).toFixed(1) : "0.0",
            isCurrentWeek: week.date >= today && week.date.getTime() - today.getTime() < 7 * 86400000
         };
     });
     return { data, totalWeeks: totalWks };
  }, [memberSalesRecordsFiltered, quarterlyTarget, activeQuarterStart, activeQuarterEnd]);

  const monthlyWeeklyData = useMemo(() => {
     if (!validateDate(activeMonthStart) || !validateDate(activeMonthEnd)) return [];

     const monthGoal = monthlyTarget;
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
         const cumGoal = monthGoal * (week.num / totalWks);
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
            runRate: cumGoal > 0 ? (accomplished / cumGoal * 100).toFixed(1) : "0.0",
            monthAchievement: monthGoal > 0 ? (accomplished / monthGoal * 100).toFixed(1) : "0.0",
            isCurrentWeek: week.date >= today && week.date.getTime() - today.getTime() < 7 * 86400000
         };
     });
  }, [memberSalesRecordsFiltered, monthlyTarget, activeMonthStart, activeMonthEnd]);

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

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin rounded-full h-12 w-12 text-custom-primary" /></div>;

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
          
          {/* Period Selection Control */}
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
              
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700" onClick={() => {
                  if(periodMode === 'quarter') setSelectedQuarterKey('current');
                  else setSelectedMonthKey('current');
              }}>
                  <RefreshCw className="h-3.5 w-3.5" />
              </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
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
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="dashboard"><LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard</TabsTrigger>
          <TabsTrigger value="tools"><Wrench className="w-4 h-4 mr-2" /> Herramientas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-8">
          <AddSaleForm memberId={memberData.id} onSalesChange={() => {}} />

          {/* Tiered Commission Details MTD */}
          <div className="rounded-lg p-4 mb-4 text-sm shadow-sm bg-white border-l-4 border-custom-primary relative">
             <div className="font-semibold mb-2 flex items-center justify-between text-custom-primary">
                <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Detalles de Comisión {isDateFiltered ? "(Rango Filtrado)" : "MTD"}
                </div>
                <Badge variant="outline" className="border-custom-primary text-custom-primary bg-white">
                    {activeMonthLabel}
                </Badge>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                <div>
                    <span className="text-gray-500 block text-xs uppercase">Logrado (Base)</span>
                    <span className="font-bold text-lg text-custom-text">{formatCurrency(commissionMTDMetrics.achievedBaseMTD)}</span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs uppercase">Meta (Quota)</span>
                    <span className="font-bold text-lg text-custom-text">{formatCurrency(commissionMTDMetrics.monthlyGoal)}</span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs uppercase">% Cumplimiento</span>
                    <span className="font-bold text-lg text-custom-primary">{`${(commissionMTDMetrics.percentAchievement || 0).toFixed(2)}%`}</span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs uppercase">Tasa Aplicada</span>
                    <span className="font-bold text-lg text-custom-text">{`${commissionMTDMetrics.appliedRate}%`}</span>
                    <span className="text-[10px] text-gray-500 block">Rango: {commissionMTDMetrics.tierRange}</span>
                </div>
                <div className="text-right">
                    <span className="text-gray-500 block text-xs uppercase">Resultado</span>
                    <span className="font-bold text-lg text-custom-secondary">{formatCurrency(commissionMTDMetrics.commission)}</span>
                </div>
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
                    <CardDescription>Meta Ind. (Mensual): {formatCurrency(monthlyMetrics.monthlyQuota)}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                    <div className="flex justify-between items-end border-b pb-4 border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Volumen Total (Mensual)</p>
                            <p className="text-3xl font-bold text-custom-text">{formatCurrency(monthlyMetrics.monthlyAchieved)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Faltante</p>
                            <p className="text-xl font-semibold text-gray-400">{formatCurrency(monthlyMetrics.monthlyRemaining)}</p>
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
                                 monthlyMetrics.monthlyPercentage >= 75 ? 'text-yellow-600' : 'text-red-500'
                             }`}>
                                 {monthlyMetrics.monthlyPercentage.toFixed(1)}%
                             </span>
                         </div>
                         <Progress 
                             value={Math.min(monthlyMetrics.monthlyPercentage, 100)} 
                             className={`h-2.5 ${
                                 monthlyMetrics.monthlyPercentage >= 100 ? '[&>div]:bg-green-500' : 
                                 monthlyMetrics.monthlyPercentage >= 75 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                             }`}
                         />
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
                    <CardDescription>Meta Ind. (TOTAL): {formatCurrency(quarterlyMetrics.quarterGoal)}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                    <div className="flex justify-between items-end border-b pb-4 border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Logrado Trimestre (TOTAL)</p>
                            <p className="text-3xl font-bold text-custom-text">{formatCurrency(quarterlyMetrics.achievedQtdFiltered)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Faltante</p>
                            <p className="text-xl font-semibold text-gray-400">{formatCurrency(Math.max(0, quarterlyMetrics.quarterGoal - quarterlyMetrics.achievedQtdFiltered))}</p>
                        </div>
                    </div>

                    <div>
                         <div className="flex justify-between text-sm mb-2">
                             <span className="text-gray-600 font-medium">% Cuota (Total)</span>
                             <span className={`font-bold ${
                                 quarterlyMetrics.quotaPct >= 100 ? 'text-green-600' :
                                 quarterlyMetrics.quotaPct >= 75 ? 'text-yellow-600' : 'text-red-500'
                             }`}>
                                 {quarterlyMetrics.quotaPct.toFixed(1)}%
                             </span>
                         </div>
                         <Progress 
                             value={Math.min(quarterlyMetrics.quotaPct, 100)} 
                             className={`h-2.5 ${
                                 quarterlyMetrics.quotaPct >= 100 ? '[&>div]:bg-green-500' : 
                                 quarterlyMetrics.quotaPct >= 75 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                             }`}
                         />
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
          />

          <MonthlyWeeklyProgressTable
              weeks={monthlyWeeklyData}
              globalSettings={globalSettings}
              isLoading={false}
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
    </div>
  );
};

export default SalesMemberDashboard;
