import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { 
  getExpectedLeadsByTime, 
  getLeadPaceStatus, 
  getTodayDateString 
} from "@/utils/leadPaceCalculators";
import { TrendingUp, TrendingDown, Target, Clock, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const LeadPaceWidget = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [leadsWorked, setLeadsWorked] = useState(0);
  const [expectedLeads, setExpectedLeads] = useState(null);
  const [paceStatus, setPaceStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dailyGoal = 100;
  const todayDate = getTodayDateString();

  // Fetch saved leads from database
  const fetchLeadsData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('daily_lead_tracking')
        .select('leads_worked_today')
        .eq('user_id', user.id)
        .eq('date', todayDate)
        .maybeSingle();

      if (error) {
        console.error('Error fetching lead tracking data:', error);
        return;
      }

      if (data) {
        setLeadsWorked(data.leads_worked_today || 0);
      }
    } catch (error) {
      console.error('Unexpected error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, todayDate]);

  // Update expected leads and pace status
  const updatePaceMetrics = useCallback(() => {
    const expected = getExpectedLeadsByTime();
    setExpectedLeads(expected);
    
    const status = getLeadPaceStatus(leadsWorked, expected);
    setPaceStatus(status);
  }, [leadsWorked]);

  // Save leads to database
  const saveLeadsData = useCallback(async (newValue) => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('daily_lead_tracking')
        .upsert(
          {
            user_id: user.id,
            date: todayDate,
            leads_worked_today: newValue,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,date'
          }
        );

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving lead tracking data:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el progreso de leads.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [user?.id, todayDate, toast]);

  // Handle input change
  const handleLeadsChange = (e) => {
    const value = e.target.value;
    
    // Validate input
    if (value === '') {
      setLeadsWorked(0);
      saveLeadsData(0);
      return;
    }

    const numValue = parseInt(value, 10);
    
    // Prevent negative values and NaN
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    setLeadsWorked(numValue);
    saveLeadsData(numValue);
  };

  // Initial fetch
  useEffect(() => {
    fetchLeadsData();
  }, [fetchLeadsData]);

  // Update pace metrics when leads change or on mount
  useEffect(() => {
    updatePaceMetrics();
  }, [updatePaceMetrics]);

  // Update pace every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      updatePaceMetrics();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [updatePaceMetrics]);

  if (loading) {
    return (
      <Card className="shadow-md border-t-4 border-t-blue-500">
        <CardContent className="pt-6 flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  const difference = expectedLeads !== null ? leadsWorked - expectedLeads : 0;
  const progressPercentage = (leadsWorked / dailyGoal) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="shadow-md border-t-4 border-t-blue-500 relative overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center justify-between text-blue-900">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Ritmo de Leads del Día
            </div>
            {saving && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-5 space-y-4">
          {/* Input Field */}
          <div className="space-y-2">
            <Label htmlFor="leads-worked" className="text-sm font-medium text-gray-700">
              Leads trabajados hoy
            </Label>
            <Input
              id="leads-worked"
              type="number"
              min="0"
              value={leadsWorked}
              onChange={handleLeadsChange}
              className="text-lg font-semibold text-gray-900"
              placeholder="0"
            />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-500 uppercase font-medium">Meta diaria</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{dailyGoal}</p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-600 uppercase font-medium">Esperado ahora</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {expectedLeads !== null ? Math.round(expectedLeads) : '--'}
              </p>
            </div>
          </div>

          {/* Difference Badge */}
          {expectedLeads !== null && (
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-sm font-medium text-gray-700">Diferencia:</span>
              <Badge 
                variant={difference >= 0 ? "default" : "destructive"}
                className={`text-base font-bold ${
                  difference >= 0 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                {difference >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {difference >= 0 ? '+' : ''}{Math.round(difference)}
              </Badge>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Progreso del día</span>
              <span className="font-bold text-gray-900">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercentage >= 100 ? 'bg-green-500' :
                  progressPercentage >= 75 ? 'bg-blue-500' :
                  progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Status Alert */}
          {paceStatus && (
            <Alert 
              variant={paceStatus.variant}
              className={`border-l-4 ${
                paceStatus.variant === 'destructive' 
                  ? 'border-l-red-500 bg-red-50' 
                  : paceStatus.variant === 'success'
                  ? 'border-l-green-500 bg-green-50'
                  : 'border-l-blue-500 bg-blue-50'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                <div className="font-bold mb-1">{paceStatus.label}</div>
                <div className="text-sm">{paceStatus.message}</div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LeadPaceWidget;