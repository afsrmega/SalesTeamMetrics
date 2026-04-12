import React, { useState, useMemo, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import GlobalSettings from "@/components/sales/GlobalSettings";
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
import AddSaleForm from "@/components/sales/AddSaleForm";
import SalesFiltersBlock from "@/components/sales/SalesFiltersBlock";
import MemberOverridesManager from "@/components/sales/MemberOverridesManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/contexts/SupabaseAuthContext";
import { getGoalsByPeriod } from "@/lib/goalsService";
import { 
  calculateSalesStats, 
  enrichSalesTeamData, 
  addSalesMember, 
  updateSalesMember, 
  deleteSalesMemberById, 
  processExcelUpload,
  syncMemberMonthlyMetrics 
} from "@/lib/salesService";
import { useRealTimeSalesData } from "@/hooks/useRealTimeSalesData"; 
import { generatePowerPointReport } from "@/lib/powerPointGenerator";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileDown, Link as LinkIcon, AlertTriangle, RefreshCw, BarChart2, Presentation, Loader2, Calculator, Settings } from "lucide-react";
import { exportToExcelWithCharts } from "@/lib/exportToExcelWithCharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { calculateCommissionWithTiers, calculateBillingAmount, formatCurrency, getBillingRate, getCustomQuarter, getQuarterDateRange } from "@/lib/salesUtils";
import { validateBillingRates } from "@/lib/validateBillingRates";
import { useColorPreferences } from "@/hooks/useColorPreferences";
import { calculateDateRange, filterSalesRecords } from "@/lib/filterSalesRecords";
import { format } from "date-fns";

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

const SalesMetrics = () => {
  const { toast } = useToast();
  const { user, globalSettings, fetchSettings, isAdmin } = useAuth(); 
  useColorPreferences();

  // Filters State & Persistence
  const [dateFilter, setDateFilter] = useState(() => {
    const saved = localStorage.getItem('adminDashboardFilters_date');
    return saved ? JSON.parse(saved) : { mode: 'reset', startDate: null, endDate: null };
  });
  const [includeResidential, setIncludeResidential] = useState(() => {
    const saved = localStorage.getItem('adminDashboardFilters_res');
    return saved ? JSON.parse(saved) : false;
  });

  // Period Selection State
  const [periodMode, setPeriodMode] = useState(() => localStorage.getItem('adminPeriodMode') || 'quarter');
  const [selectedQuarterKey, setSelectedQuarterKey] = useState(() => localStorage.getItem('adminSelectedQuarterKey') || 'current');
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => localStorage.getItem('adminSelectedMonthKey') || 'current');

  const [effectiveMonthGoals, setEffectiveMonthGoals] = useState(null);
  const [effectiveQuarterGoals, setEffectiveQuarterGoals] = useState(null);

  useEffect(() => {
    localStorage.setItem('adminDashboardFilters_date', JSON.stringify(dateFilter));
    localStorage.setItem('adminDashboardFilters_res', JSON.stringify(includeResidential));
    localStorage.setItem('adminPeriodMode', periodMode);
    localStorage.setItem('adminSelectedQuarterKey', selectedQuarterKey);
    localStorage.setItem('adminSelectedMonthKey', selectedMonthKey);
  }, [dateFilter, includeResidential, periodMode, selectedQuarterKey, selectedMonthKey]);

  const [newMember, setNewMember] = useState({ name: "", monthlySales: "", quarterlySales: "", photoFile: null, photoUrl: null });
  const [editingMember, setEditingMember] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const { 
    salesTeam: salesTeamRaw, 
    salesRecords,
    loading: isLoading, 
    refresh: refreshData 
  } = useRealTimeSalesData(user?.id);

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

  // Apply Global Filters
  const activeRange = useMemo(() => calculateDateRange(dateFilter.mode, dateFilter.startDate, dateFilter.endDate), [dateFilter]);
  const isDateFiltered = dateFilter.mode !== 'reset';
  const filteredSalesRecordsFinal = useMemo(() => filterSalesRecords(salesRecords, activeRange, includeResidential), [salesRecords, activeRange, includeResidential]);

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
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 
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
    console.log('📊 [SalesMetrics] Fetching effective goals for both periods independently...');
    
    const monthGoals = await getGoalsByPeriod('month', computedMonthKey, safeGlobalSettings);
    console.log('📊 [SalesMetrics] (1) effectiveMonthGoals loaded:', JSON.stringify(monthGoals));
    setEffectiveMonthGoals(monthGoals);
    
    const quarterGoals = await getGoalsByPeriod('quarter', computedQuarterKey, safeGlobalSettings);
    console.log('📊 [SalesMetrics] (2) effectiveQuarterGoals loaded:', JSON.stringify(quarterGoals));
    setEffectiveQuarterGoals(quarterGoals);
  };

  useEffect(() => {
    fetchGoals();
    const handleUpdate = () => fetchGoals();
    window.addEventListener('goalsUpdated', handleUpdate);
    return () => window.removeEventListener('goalsUpdated', handleUpdate);
  }, [computedMonthKey, computedQuarterKey, safeGlobalSettings]); // independent of periodMode

  useEffect(() => {
    console.log('📊 [SalesMetrics] (4) periodMode changed to:', String(periodMode));
  }, [periodMode]);

  // Override global settings with period goals for calculations
  const activeSettings = useMemo(() => {
    const settings = {
      ...safeGlobalSettings,
      team_monthly_target: effectiveMonthGoals?.team_goal > 0 ? effectiveMonthGoals.team_goal : safeGlobalSettings.team_monthly_target,
      individual_monthly_commission_threshold: effectiveMonthGoals?.individual_goal > 0 ? effectiveMonthGoals.individual_goal : safeGlobalSettings.individual_monthly_commission_threshold,
      team_quarterly_target: effectiveQuarterGoals?.team_goal > 0 ? effectiveQuarterGoals.team_goal : safeGlobalSettings.team_quarterly_target,
      individual_quarterly_target: effectiveQuarterGoals?.individual_goal > 0 ? effectiveQuarterGoals.individual_goal : safeGlobalSettings.individual_quarterly_target,
    };
    console.log('📊 [SalesMetrics] (3) activeSettings constructed with all four goal values:', JSON.stringify(settings));
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

  const teamStats = useMemo(() => {
    return calculateSalesStats(enrichedSalesTeam, activeSettings);
  }, [enrichedSalesTeam, activeSettings]);

  const comparisonData = useMemo(() => {
    let residential = 0;
    let commercial = 0;
    const activeStart = periodMode === 'quarter' ? activeQuarterStart : activeQuarterEnd; // Note: keeping as it was, but looks like activeMonthStart is needed if month. Actually logic in orig was periodMode check.
    const startD = periodMode === 'quarter' ? activeQuarterStart : activeMonthStart;
    const endD = periodMode === 'quarter' ? activeQuarterEnd : activeMonthEnd;
    
    filteredSalesRecordsFinal.forEach(r => {
      const recordDate = validateDate(new Date(r.created_at));
      if (!recordDate || recordDate < startD || recordDate > endD) return;
      const type = (r.property_type || '').toLowerCase().trim();
      if (type === 'residential' || type === 'residencial') {
        residential += parseFloat(r.value) || 0;
      } else {
        commercial += parseFloat(r.value) || 0;
      }
    });
    return { residential, commercial };
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
          weekEnding: safeFormat(friday, 'MMM d, yyyy'), // CONVERTED TO STRING HERE
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

  const handleNewMemberPhotoChange = (photoFile) => {
    setNewMember(prev => ({ ...prev, photoFile: photoFile, photoUrl: photoFile ? URL.createObjectURL(photoFile) : null }));
  };

  const handleAddMember = async (memberDataOverride = {}) => {
    if (!user) {
      toast({ title: "Acción Requerida", description: "Inicia sesión para añadir miembros.", variant: "default" });
      return;
    }
    try {
      const dataToSave = { ...newMember, ...memberDataOverride };
      await addSalesMember(dataToSave, user.id, toast);
      setNewMember({ name: "", monthlySales: "", quarterlySales: "", photoFile: null, photoUrl: null });
    } catch (error) {
      toast({ title: "Error al Añadir Miembro", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteMember = async (id) => {
    if (!user) return;
    try {
      await deleteSalesMemberById(id, user.id, salesTeamRaw.find(m => m.id === id)?.photo_url);
      toast({ title: "Miembro Eliminado", description: "El miembro ha sido eliminado." });
    } catch (error) {
      toast({ title: "Error al Eliminar", description: error.message, variant: "destructive" });
    }
  };

  const handleOpenEditDialog = (member) => {
    setEditingMember({ ...member, photoFile: null });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedMember = async (updatedMemberData) => {
    if (!user || !editingMember) return;
    try {
      await updateSalesMember(editingMember, updatedMemberData, user.id, toast);
      setIsEditDialogOpen(false);
      setEditingMember(null);
      toast({ title: "Miembro Actualizado", description: "La información ha sido actualizada." });
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
        refreshData();
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
      await exportToExcelWithCharts(enrichedSalesTeam, activeSettings, filteredSalesRecordsFinal);
      toast({ title: "Exportación Exitosa", description: "Se ha generado el reporte optimizado." });
    } catch (error) {
      toast({ title: "Error en Exportación", description: "No se pudo generar el reporte.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPPT = async () => {
    if (!user || enrichedSalesTeam.length === 0) return;
    setIsGeneratingPPT(true);
    try {
      await generatePowerPointReport(enrichedSalesTeam, activeSettings, weeklyData, teamStats);
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
        await refreshData();
        toast({ title: "Sincronización Completada", description: `Se han actualizado ${successCount} miembros.` });
    } catch (error) {
        toast({ title: "Error", description: "Hubo un problema al sincronizar.", variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };

  const renderQuarterWeeklyProgressTable = () => {
    console.log('📊 [SalesMetrics] Passing effectiveQuarterGoals to QuarterWeeklyProgressTable:', JSON.stringify(effectiveQuarterGoals));
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
        <GlobalSettings 
          disabled={!user} 
          periodMode={periodMode} 
          periodKey={currentPeriodKey} 
          periodLabel={currentPeriodLabel} 
        />
        
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
            <TabsTrigger value="audit" className="flex-1 sm:flex-none"><AlertTriangle className="h-4 w-4 text-custom-accent mr-2 hidden md:block" /> Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-8 p-1">
            <section>
              <SummaryCards 
                totalMonthlySales={teamStats.totalMonthlySales} 
                totalQuarterlySales={teamStats.totalQuarterlySales}
                totalMonthlyNonResSales={teamStats.totalMonthlyNonResSales}
                totalQuarterlyNonResSales={teamStats.totalQuarterlyNonResSales}
                averageMonthlySales={teamStats.averageMonthlySales}
                averageQuarterlySales={teamStats.averageQuarterlySales}
                topPerformer={teamStats.topPerformerMonthly ? { name: teamStats.topPerformerMonthly.name, sales: parseFloat(teamStats.topPerformerMonthly.monthlySales) } : null}
                salesTeamCount={enrichedSalesTeam.length}
                teamMonthlyAchievement={teamStats.teamMonthlyAchievement}
              />
              <div className="mt-8">
                <TimeProgressChart />
              </div>
            </section>
            
            <section>
              <TeamOverallProgressCharts
                  salesTeam={enrichedSalesTeam}
                  globalSettings={activeSettings}
                  totalMonthlySales={teamStats.totalMonthlySales}
                  totalQuarterlySales={teamStats.totalQuarterlySales}
                  totalMonthlyNonResSales={teamStats.totalMonthlyNonResSales}
                  totalQuarterlyNonResSales={teamStats.totalQuarterlyNonResSales}
              />
            </section>

             <section>
              <TexasVsOutOfStateChart 
                selectedMonth={activeMonthStart}
                periodMode={dateFilter.mode === 'reset' ? 'month' : 'custom'}
                includeResidential={includeResidential}
                customStartDate={dateFilter.startDate}
                customEndDate={dateFilter.endDate}
              />
            </section>

            <section>
              <PropertyTypeComparisonChart comparisonData={comparisonData} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                  <AddSaleForm mode="admin" salesTeam={enrichedSalesTeam} onSaleAdded={refreshData} />
                  <AddMemberForm 
                      newMember={newMember}
                      onInputChange={handleInputChange}
                      onAddMember={handleAddMember}
                      onPhotoChange={handleNewMemberPhotoChange}
                      disabled={!user}
                  />
                  <ExcelUploader onFileUpload={handleFileUpload} disabled={!user} />
                  <CommissionRangesTable />
                </div>
                
                <div className="lg:col-span-2 space-y-8">
                  <SalesTeamTable 
                      salesTeam={enrichedSalesTeam}
                      globalSettings={activeSettings}
                      onDeleteMember={handleDeleteMember}
                      onEditMember={handleOpenEditDialog}
                      disabled={!user}
                      effectiveMonthGoals={effectiveMonthGoals}
                      effectiveQuarterGoals={effectiveQuarterGoals}
                      periodMode={periodMode}
                  />
                  <SalesTeamTableQuarterly 
                      salesTeam={enrichedSalesTeam}
                      globalSettings={activeSettings}
                      onDeleteMember={handleDeleteMember}
                      onEditMember={handleOpenEditDialog}
                      disabled={!user}
                      effectiveMonthGoals={effectiveMonthGoals}
                      effectiveQuarterGoals={effectiveQuarterGoals}
                      periodMode={periodMode}
                  />
                </div>
            </section>
        </TabsContent>

        <TabsContent value="progress" className="p-1 mt-6">
          {renderQuarterWeeklyProgressTable()}
        </TabsContent>

        <TabsContent value="records" className="p-1 mt-6">
             <AllSalesRecordsTable />
        </TabsContent>

        <TabsContent value="overrides" className="p-1 mt-6">
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

        <TabsContent value="audit" className="p-1 mt-6">
             <AuditPanel />
        </TabsContent>
      </Tabs>

      {editingMember && (
        <EditMemberDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          member={editingMember}
          onSave={handleSaveEditedMember}
          currentPhotoUrl={editingMember.photo_url}
        />
      )}

      <LinkUserDialog 
         isOpen={isLinkDialogOpen}
         onOpenChange={setIsLinkDialogOpen}
         salesTeam={salesTeamRaw}
         onLinkSuccess={refreshData}
      />
    </motion.div>
  );
};

export default SalesMetrics;