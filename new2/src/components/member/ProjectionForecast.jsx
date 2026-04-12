import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, RotateCcw, BarChart3, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getCommissionPlan, upsertCommissionPlan } from '@/lib/commissionPlansService';
import { useEffectiveGoals } from '@/hooks/useEffectiveGoals';
import { formatCurrency } from '@/lib/salesUtils';
import { calculateMonthlyCommission } from '@/lib/commissionCalculationUtils';
import { convertUsdToCop, convertAndFormatCOP, formatCOP } from '@/lib/currencyUtils';

const generateQuarters = () => {
  const qs = [];
  const now = new Date();
  let y = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;
  
  for (let i = 0; i < 5; i++) {
    qs.push({ year: y, quarter: q, key: `FY${y}-Q${q}` });
    q++;
    if (q > 4) {
      q = 1;
      y++;
    }
  }
  return qs;
};

const getMonthKeysForQuarter = (year, quarter) => {
  const startMonth = (quarter - 1) * 3 + 1;
  return [
    { num: startMonth, key: `${year}-${String(startMonth).padStart(2, '0')}` },
    { num: startMonth + 1, key: `${year}-${String(startMonth + 1).padStart(2, '0')}` },
    { num: startMonth + 2, key: `${year}-${String(startMonth + 2).padStart(2, '0')}` },
  ];
};

const getMonthName = (monthNum, year) => {
  const date = new Date(year, monthNum - 1, 1);
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase();
};

const ProjectionForecast = ({ user, salesTeamMember, globalSettings }) => {
  const { toast } = useToast();
  const quarters = useMemo(() => generateQuarters(), []);
  
  const [selectedQuarterKey, setSelectedQuarterKey] = useState(quarters[0].key);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const [plannedSalesTxM1, setPlannedSalesTxM1] = useState(0);
  const [plannedSalesTxM2, setPlannedSalesTxM2] = useState(0);
  const [plannedSalesTxM3, setPlannedSalesTxM3] = useState(0);

  const [plannedSalesOutM1, setPlannedSalesOutM1] = useState(0);
  const [plannedSalesOutM2, setPlannedSalesOutM2] = useState(0);
  const [plannedSalesOutM3, setPlannedSalesOutM3] = useState(0);

  const [billingPropertyTypeMode, setBillingPropertyTypeMode] = useState('Commercial');
  
  const [goalOverrideM1, setGoalOverrideM1] = useState(null);
  const [goalOverrideM2, setGoalOverrideM2] = useState(null);
  const [goalOverrideM3, setGoalOverrideM3] = useState(null);
  
  const [notes, setNotes] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);

  const activeQuarter = useMemo(() => quarters.find(q => q.key === selectedQuarterKey), [quarters, selectedQuarterKey]);
  const activeMonths = useMemo(() => getMonthKeysForQuarter(activeQuarter.year, activeQuarter.quarter), [activeQuarter]);

  const { memberGoal: goalM1, loading: loadingM1 } = useEffectiveGoals('month', activeMonths[0].key, user?.id);
  const { memberGoal: goalM2, loading: loadingM2 } = useEffectiveGoals('month', activeMonths[1].key, user?.id);
  const { memberGoal: goalM3, loading: loadingM3 } = useEffectiveGoals('month', activeMonths[2].key, user?.id);

  const isFetchingGoal = loadingM1 || loadingM2 || loadingM3;
  const realMonthlyGoal = goalM1 || goalM2 || goalM3;

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadPlan = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setHasUnsavedChanges(false);
    try {
      const plan = await getCommissionPlan(user.id, selectedQuarterKey);
      if (plan) {
        setPlannedSalesTxM1(Number(plan.planned_sales_tx_m1) || 0);
        setPlannedSalesTxM2(Number(plan.planned_sales_tx_m2) || 0);
        setPlannedSalesTxM3(Number(plan.planned_sales_tx_m3) || 0);
        setPlannedSalesOutM1(Number(plan.planned_sales_out_m1) || 0);
        setPlannedSalesOutM2(Number(plan.planned_sales_out_m2) || 0);
        setPlannedSalesOutM3(Number(plan.planned_sales_out_m3) || 0);
        setBillingPropertyTypeMode(plan.billing_property_type_mode || 'Commercial');
        setGoalOverrideM1(plan.goal_override_m1 !== null ? Number(plan.goal_override_m1) : null);
        setGoalOverrideM2(plan.goal_override_m2 !== null ? Number(plan.goal_override_m2) : null);
        setGoalOverrideM3(plan.goal_override_m3 !== null ? Number(plan.goal_override_m3) : null);
        setNotes(plan.notes || '');
        setLastSavedAt(plan.updated_at);
      } else {
        setPlannedSalesTxM1(0);
        setPlannedSalesTxM2(0);
        setPlannedSalesTxM3(0);
        setPlannedSalesOutM1(0);
        setPlannedSalesOutM2(0);
        setPlannedSalesOutM3(0);
        setBillingPropertyTypeMode('Commercial');
        setGoalOverrideM1(null);
        setGoalOverrideM2(null);
        setGoalOverrideM3(null);
        setNotes('');
        setLastSavedAt(null);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo cargar la proyección.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedQuarterKey, toast]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleSave = async () => {
    if (!user) return;
    if (plannedSalesTxM1 < 0 || plannedSalesTxM2 < 0 || plannedSalesTxM3 < 0 ||
        plannedSalesOutM1 < 0 || plannedSalesOutM2 < 0 || plannedSalesOutM3 < 0) {
      toast({ title: "Error", description: "Las ventas planeadas no pueden ser negativas.", variant: "destructive" });
      return;
    }
    if ((goalOverrideM1 !== null && goalOverrideM1 < 0) || 
        (goalOverrideM2 !== null && goalOverrideM2 < 0) || 
        (goalOverrideM3 !== null && goalOverrideM3 < 0)) {
      toast({ title: "Error", description: "Las metas no pueden ser negativas.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await upsertCommissionPlan(
        user.id,
        selectedQuarterKey,
        activeMonths[0].key,
        activeMonths[1].key,
        activeMonths[2].key,
        plannedSalesTxM1, plannedSalesTxM2, plannedSalesTxM3,
        plannedSalesOutM1, plannedSalesOutM2, plannedSalesOutM3,
        billingPropertyTypeMode,
        goalOverrideM1, goalOverrideM2, goalOverrideM3,
        false, notes
      );
      setLastSavedAt(saved.updated_at);
      setHasUnsavedChanges(false);
      toast({ title: "Proyección guardada", description: "Plan guardado exitosamente." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo guardar la proyección.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmReset = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      setPlannedSalesTxM1(0); setPlannedSalesTxM2(0); setPlannedSalesTxM3(0);
      setPlannedSalesOutM1(0); setPlannedSalesOutM2(0); setPlannedSalesOutM3(0);
      setGoalOverrideM1(null); setGoalOverrideM2(null); setGoalOverrideM3(null);
      
      const saved = await upsertCommissionPlan(
        user.id,
        selectedQuarterKey,
        activeMonths[0].key, activeMonths[1].key, activeMonths[2].key,
        0, 0, 0, 0, 0, 0,
        billingPropertyTypeMode,
        null, null, null,
        false, notes
      );
      setLastSavedAt(saved.updated_at);
      setHasUnsavedChanges(false);
      toast({ title: "Plan reiniciado", description: "El plan ha sido restablecido a valores por defecto." });
      setShowResetDialog(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo reiniciar el plan.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (setter, val) => {
    setter(Number(val) || 0);
    setHasUnsavedChanges(true);
  };

  const updateOverrideField = (setter, val) => {
    if (val === '' || val === null) {
      setter(null);
    } else {
      setter(Number(val));
    }
    setHasUnsavedChanges(true);
  };

  const effectiveGoalM1 = goalOverrideM1 !== null ? goalOverrideM1 : goalM1;
  const effectiveGoalM2 = goalOverrideM2 !== null ? goalOverrideM2 : goalM2;
  const effectiveGoalM3 = goalOverrideM3 !== null ? goalOverrideM3 : goalM3;

  const txRate = billingPropertyTypeMode === 'Commercial' ? (globalSettings?.tx_comm_rate || 0.000251) : (globalSettings?.tx_res_rate || 0.000254);
  const natlRate = billingPropertyTypeMode === 'Commercial' ? (globalSettings?.natl_comm_rate || 0.000054) : (globalSettings?.natl_res_rate || 0.000038);
  const copRate = Number(globalSettings?.usd_to_cop_rate) || 4200;

  const getCalc = (tx, out, goal) => {
    if (!goal || goal <= 0) {
      return {
        totalSales: tx + out,
        billingBase: (tx * txRate) + (out * natlRate),
        achievementPct: 0,
        appliedRate: 0,
        estimatedCommission: 0
      };
    }
    return calculateMonthlyCommission({
      plannedSalesTx: tx,
      plannedSalesOut: out,
      monthlyGoal: goal,
      txBillingRate: txRate,
      natlBillingRate: natlRate,
      commissionTiers: globalSettings?.commission_tiers
    });
  };

  const calcM1 = getCalc(plannedSalesTxM1, plannedSalesOutM1, effectiveGoalM1);
  const calcM2 = getCalc(plannedSalesTxM2, plannedSalesOutM2, effectiveGoalM2);
  const calcM3 = getCalc(plannedSalesTxM3, plannedSalesOutM3, effectiveGoalM3);

  const totalTxQtr = plannedSalesTxM1 + plannedSalesTxM2 + plannedSalesTxM3;
  const totalOutQtr = plannedSalesOutM1 + plannedSalesOutM2 + plannedSalesOutM3;
  const totalSalesQtr = calcM1.totalSales + calcM2.totalSales + calcM3.totalSales;
  const totalBillingBaseQtr = calcM1.billingBase + calcM2.billingBase + calcM3.billingBase;
  const totalCommissionQtr = calcM1.estimatedCommission + calcM2.estimatedCommission + calcM3.estimatedCommission;

  const commM1Cop = convertUsdToCop(calcM1.estimatedCommission, copRate);
  const commM2Cop = convertUsdToCop(calcM2.estimatedCommission, copRate);
  const commM3Cop = convertUsdToCop(calcM3.estimatedCommission, copRate);

  const chartData = [
    { name: getMonthName(activeMonths[0].num, activeQuarter.year), Goal: effectiveGoalM1 || 0, BillingBase: calcM1.billingBase, comm: commM1Cop, cumulativeComm: commM1Cop },
    { name: getMonthName(activeMonths[1].num, activeQuarter.year), Goal: effectiveGoalM2 || 0, BillingBase: calcM2.billingBase, comm: commM2Cop, cumulativeComm: commM1Cop + commM2Cop },
    { name: getMonthName(activeMonths[2].num, activeQuarter.year), Goal: effectiveGoalM3 || 0, BillingBase: calcM3.billingBase, comm: commM3Cop, cumulativeComm: commM1Cop + commM2Cop + commM3Cop },
  ];

  if (isLoading || isFetchingGoal) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Projection & Forecast
          </h2>
          <p className="text-slate-500 text-sm">Planifica tus ventas por estado y estima tus comisiones trimestrales.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedQuarterKey} onValueChange={(val) => {
            if (hasUnsavedChanges) {
              if (!window.confirm("Tienes cambios sin guardar. ¿Deseas cambiar de trimestre de todos modos?")) return;
            }
            setSelectedQuarterKey(val);
          }}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Select Quarter" />
            </SelectTrigger>
            <SelectContent className="dropdown-scroll">
              {quarters.map(q => (
                <SelectItem key={q.key} value={q.key}>{q.key}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={billingPropertyTypeMode} onValueChange={(val) => { setBillingPropertyTypeMode(val); setHasUnsavedChanges(true); }}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent className="dropdown-scroll">
              <SelectItem value="Commercial">Commercial</SelectItem>
              <SelectItem value="Residential">Residential</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(!realMonthlyGoal || realMonthlyGoal <= 0) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Meta no configurada</AlertTitle>
          <AlertDescription>
            No se ha encontrado una meta mensual configurada para ti. Las proyecciones de comisiones no se pueden calcular adecuadamente sin una meta válida. Por favor, contacta a tu administrador.
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <CardTitle className="text-lg">Tabla de Proyección</CardTitle>
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Cambios sin guardar
                </Badge>
              )}
              {lastSavedAt && <span className="text-xs text-slate-400 hidden md:inline">Guardado: {new Date(lastSavedAt).toLocaleString()}</span>}
              <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}><RotateCcw className="w-4 h-4 mr-2" /> Reset</Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Plan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold rounded-tl-lg">Mes</th>
                <th className="py-3 px-4 font-semibold text-right">Meta Mensual ($)</th>
                <th className="py-3 px-4 font-semibold text-right">Planned Sales TX ($)</th>
                <th className="py-3 px-4 font-semibold text-right">Planned Sales Out of TX ($)</th>
                <th className="py-3 px-4 font-semibold text-right text-primary">Total Sales ($)</th>
                <th className="py-3 px-4 font-semibold text-right">Billing Base ($)</th>
                <th className="py-3 px-4 font-semibold text-right">% Cumplimiento</th>
                <th className="py-3 px-4 font-semibold text-right">Rate</th>
                <th className="py-3 px-4 font-semibold text-right rounded-tr-lg">Comisión Estimada (COP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-medium">{getMonthName(activeMonths[0].num, activeQuarter.year)}</td>
                <td className="py-3 px-4 text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input type="number" min="0" step="1000" placeholder={goalM1 ? `Real: ${formatCurrency(goalM1)}` : "Meta no conf."} 
                          className={`w-32 ml-auto text-right ${goalOverrideM1 !== null ? 'font-semibold text-blue-600 border-blue-200 bg-blue-50/50' : 'text-slate-500'}`} 
                          value={goalOverrideM1 ?? ''} onChange={(e) => updateOverrideField(setGoalOverrideM1, e.target.value)} 
                        />
                      </TooltipTrigger>
                      <TooltipContent><p>Meta editable solo para simulación. No cambia metas reales.</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="py-3 px-4 text-right">
                  <Input type="number" min="0" step="1000" className="w-32 ml-auto text-right font-semibold" value={plannedSalesTxM1 || ''} onChange={(e) => updateField(setPlannedSalesTxM1, e.target.value)} />
                </td>
                <td className="py-3 px-4 text-right">
                  <Input type="number" min="0" step="1000" className="w-32 ml-auto text-right font-semibold" value={plannedSalesOutM1 || ''} onChange={(e) => updateField(setPlannedSalesOutM1, e.target.value)} />
                </td>
                <td className="py-3 px-4 text-right font-bold text-primary">{formatCurrency(calcM1.totalSales)}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">{formatCurrency(calcM1.billingBase)}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">{calcM1.achievementPct.toFixed(1)}%</td>
                <td className="py-3 px-4 text-right"><Badge variant="outline" className="text-primary border-primary/30">{calcM1.appliedRate}%</Badge></td>
                <td className="py-3 px-4 text-right font-bold text-emerald-600">{convertAndFormatCOP(calcM1.estimatedCommission, copRate)}</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-medium">{getMonthName(activeMonths[1].num, activeQuarter.year)}</td>
                <td className="py-3 px-4 text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input type="number" min="0" step="1000" placeholder={goalM2 ? `Real: ${formatCurrency(goalM2)}` : "Meta no conf."} 
                          className={`w-32 ml-auto text-right ${goalOverrideM2 !== null ? 'font-semibold text-blue-600 border-blue-200 bg-blue-50/50' : 'text-slate-500'}`} 
                          value={goalOverrideM2 ?? ''} onChange={(e) => updateOverrideField(setGoalOverrideM2, e.target.value)} 
                        />
                      </TooltipTrigger>
                      <TooltipContent><p>Meta editable solo para simulación. No cambia metas reales.</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="py-3 px-4 text-right">
                  <Input type="number" min="0" step="1000" className="w-32 ml-auto text-right font-semibold" value={plannedSalesTxM2 || ''} onChange={(e) => updateField(setPlannedSalesTxM2, e.target.value)} />
                </td>
                <td className="py-3 px-4 text-right">
                  <Input type="number" min="0" step="1000" className="w-32 ml-auto text-right font-semibold" value={plannedSalesOutM2 || ''} onChange={(e) => updateField(setPlannedSalesOutM2, e.target.value)} />
                </td>
                <td className="py-3 px-4 text-right font-bold text-primary">{formatCurrency(calcM2.totalSales)}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">{formatCurrency(calcM2.billingBase)}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">{calcM2.achievementPct.toFixed(1)}%</td>
                <td className="py-3 px-4 text-right"><Badge variant="outline" className="text-primary border-primary/30">{calcM2.appliedRate}%</Badge></td>
                <td className="py-3 px-4 text-right font-bold text-emerald-600">{convertAndFormatCOP(calcM2.estimatedCommission, copRate)}</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-medium">{getMonthName(activeMonths[2].num, activeQuarter.year)}</td>
                <td className="py-3 px-4 text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input type="number" min="0" step="1000" placeholder={goalM3 ? `Real: ${formatCurrency(goalM3)}` : "Meta no conf."} 
                          className={`w-32 ml-auto text-right ${goalOverrideM3 !== null ? 'font-semibold text-blue-600 border-blue-200 bg-blue-50/50' : 'text-slate-500'}`} 
                          value={goalOverrideM3 ?? ''} onChange={(e) => updateOverrideField(setGoalOverrideM3, e.target.value)} 
                        />
                      </TooltipTrigger>
                      <TooltipContent><p>Meta editable solo para simulación. No cambia metas reales.</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="py-3 px-4 text-right">
                  <Input type="number" min="0" step="1000" className="w-32 ml-auto text-right font-semibold" value={plannedSalesTxM3 || ''} onChange={(e) => updateField(setPlannedSalesTxM3, e.target.value)} />
                </td>
                <td className="py-3 px-4 text-right">
                  <Input type="number" min="0" step="1000" className="w-32 ml-auto text-right font-semibold" value={plannedSalesOutM3 || ''} onChange={(e) => updateField(setPlannedSalesOutM3, e.target.value)} />
                </td>
                <td className="py-3 px-4 text-right font-bold text-primary">{formatCurrency(calcM3.totalSales)}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">{formatCurrency(calcM3.billingBase)}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">{calcM3.achievementPct.toFixed(1)}%</td>
                <td className="py-3 px-4 text-right"><Badge variant="outline" className="text-primary border-primary/30">{calcM3.appliedRate}%</Badge></td>
                <td className="py-3 px-4 text-right font-bold text-emerald-600">{convertAndFormatCOP(calcM3.estimatedCommission, copRate)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-200">
              <tr>
                <td colSpan={2} className="py-4 px-4 text-slate-700">Totales del Trimestre</td>
                <td className="py-4 px-4 text-right text-primary">{formatCurrency(totalTxQtr)}</td>
                <td className="py-4 px-4 text-right text-primary">{formatCurrency(totalOutQtr)}</td>
                <td className="py-4 px-4 text-right text-lg text-primary">{formatCurrency(totalSalesQtr)}</td>
                <td className="py-4 px-4 text-right text-lg text-primary">{formatCurrency(totalBillingBaseQtr)}</td>
                <td colSpan={2}></td>
                <td className="py-4 px-4 text-right text-lg text-emerald-700">{convertAndFormatCOP(totalCommissionQtr, copRate)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-slate-700">Billing Base vs Goal</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value/1000}k`} />
                <RechartsTooltip 
                  formatter={(value) => formatCurrency(value)} 
                  cursor={{fill: '#f1f5f9'}} 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px'}} />
                <Bar dataKey="Goal" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="BillingBase" name="Billing Base" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-slate-700">Cumulative Commission (COP)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  tickFormatter={(value) => `COP ${value >= 1000000 ? (value/1000000).toFixed(1) + 'M' : (value/1000).toFixed(0) + 'k'}`} 
                />
                <RechartsTooltip 
                  formatter={(value) => formatCOP(value)} 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px'}} />
                <Line type="monotone" dataKey="cumulativeComm" name="Cumulative Comm." stroke="#10b981" strokeWidth={3} dot={{r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 7}} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="plan-notes" className="text-slate-700">Notas de Proyección</Label>
            <Textarea 
              id="plan-notes"
              placeholder="Ej. Esperando el cierre de 2 propiedades residenciales grandes..."
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setHasUnsavedChanges(true); }}
              className="min-h-[100px] resize-y bg-slate-50 focus-visible:ring-primary/20"
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto pondrá todas tus ventas planeadas en cero y eliminará cualquier meta personalizada que hayas ingresado para este trimestre. Esta acción se guardará inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectionForecast;