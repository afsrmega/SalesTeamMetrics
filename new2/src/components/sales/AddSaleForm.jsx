
import React, { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import { syncMemberMonthlyMetrics, insertSaleRecord } from "@/lib/salesService";
import SearchableStateSelect from "./SearchableStateSelect";
import { useAuth } from '@/contexts/SupabaseAuthContext';

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const PROPERTY_TYPES = ["Comercial", "Residencial", "BPP"];

const COMMERCIAL_SUBTYPES = [
  "Office",
  "Retail",
  "Industrial",
  "Mixed Use",
  "Other"
];

const AddSaleForm = ({ memberId, onSalesChange, mode = "member", salesTeam = [], onSaleAdded }) => {
  const today = new Date().toISOString().split('T')[0];
  const { user } = useAuth();
  
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm({
    defaultValues: {
      selected_member_id: "",
      state: "",
      property_type: "",
      property_subtype: "",
      sale_date: today,
      account_number: ""
    }
  });
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectedPropertyType = useWatch({
    control,
    name: "property_type"
  });

  const selectedState = useWatch({
    control,
    name: "state"
  });

  const onSubmit = async (data) => {
    const targetMemberId = mode === 'admin' ? data.selected_member_id : memberId;
    
    if (mode === 'admin' && !targetMemberId) {
      toast({ title: "Error", description: "Please select a sales member", variant: "destructive" });
      return;
    }

    if (!targetMemberId) {
      toast({ title: "Error", description: "No se encontró el ID del miembro.", variant: "destructive" });
      return;
    }

    if (!data.state) {
        toast({ title: "Error", description: "El estado (US) es requerido para calcular la tasa de facturación.", variant: "destructive" });
        return;
    }
    if (!data.property_type) {
        toast({ title: "Error", description: "El tipo de propiedad es requerido para calcular la tasa de facturación.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      let finalCreatedAt = new Date().toISOString();
      
      if (data.sale_date) {
        const [year, month, day] = data.sale_date.split('-').map(Number);
        const saleDateObj = new Date(year, month - 1, day, 12, 0, 0);
        finalCreatedAt = saleDateObj.toISOString();
      }

      const payload = {
        sales_member_id: targetMemberId,
        state: data.state,
        value: parseFloat(data.value),
        property_type: data.property_type,
        client_number: data.client_number,
        account_number: data.account_number || null,
        property_subtype: data.property_type === 'Comercial' ? data.property_subtype : null,
        created_at: finalCreatedAt,
        is_valid: true
      };

      const adminUserId = mode === 'admin' ? user?.id : null;
      await insertSaleRecord(payload, adminUserId);

      const memberName = mode === 'admin' ? salesTeam.find(m => m.id === targetMemberId)?.name : '';
      toast({ title: "Venta Registrada", description: mode === 'admin' ? `Sale registered successfully for ${memberName}` : "Guardando y sincronizando totales..." });

      try {
        await syncMemberMonthlyMetrics(targetMemberId);
        
        if (onSalesChange) onSalesChange(); 
        if (onSaleAdded) onSaleAdded();

      } catch (syncErr) {
        console.error("Sync error after add:", syncErr);
        toast({ 
          title: "Advertencia", 
          description: "Venta guardada, pero hubo error al actualizar los totales.", 
          variant: "warning" 
        });
      }

      reset({
        selected_member_id: "",
        property_type: "",
        property_subtype: "",
        state: "",
        value: "",
        client_number: "",
        account_number: "",
        sale_date: today
      });
      setValue("selected_member_id", "");
      setValue("property_type", ""); 
      setValue("property_subtype", "");
      setValue("state", "");
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-green-100 shadow-sm">
      <CardHeader className="bg-green-50/50 pb-3">
        <CardTitle className="text-lg flex items-center text-green-800">
          <PlusCircle className="mr-2 h-5 w-5" />
          Registrar Nueva Venta {mode === 'admin' && 'para Miembro'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {mode === 'admin' && (
            <div className="space-y-2 mb-4">
               <Label htmlFor="selected_member_id">Select Sales Member <span className="text-red-500">*</span></Label>
               <Select onValueChange={(val) => setValue("selected_member_id", val, { shouldValidate: true })} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar Miembro..." />
                </SelectTrigger>
                <SelectContent className="dropdown-scroll">
                   {salesTeam.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                   ))}
                </SelectContent>
               </Select>
               <input type="hidden" {...register("selected_member_id", { required: mode === 'admin' })} />
               {errors.selected_member_id && <span className="text-xs text-red-500">Please select a sales member</span>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">Estado (US) <span className="text-red-500">*</span></Label>
              <SearchableStateSelect 
                states={US_STATES}
                value={selectedState}
                onChange={(val) => setValue("state", val, { shouldValidate: true })}
                disabled={loading}
              />
              <input 
                type="hidden" 
                {...register("state", { required: true })} 
              />
              {errors.state && <span className="text-xs text-red-500">Este campo es obligatorio</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor ($) <span className="text-red-500">*</span></Label>
              <Input 
                id="value" 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                {...register("value", { required: true, min: 0 })} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_number">Número Cliente <span className="text-red-500">*</span></Label>
              <Input 
                id="client_number" 
                placeholder="#12345" 
                {...register("client_number", { required: true })} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input 
                id="account_number" 
                placeholder="Opcional" 
                {...register("account_number")} 
              />
            </div>

            <div className="space-y-2">
               <Label htmlFor="property_type">Tipo de Propiedad <span className="text-red-500">*</span></Label>
               <Select onValueChange={(val) => {
                 setValue("property_type", val);
                 if(val !== 'Comercial') setValue("property_subtype", "");
               }} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar Tipo" />
                </SelectTrigger>
                <SelectContent className="dropdown-scroll">
                   {PROPERTY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                   ))}
                </SelectContent>
               </Select>
            </div>

            {selectedPropertyType === 'Comercial' && (
              <div className="space-y-2">
                 <Label htmlFor="property_subtype">Subtipo Comercial</Label>
                 <Select onValueChange={(val) => setValue("property_subtype", val)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar Subtipo" />
                  </SelectTrigger>
                  <SelectContent className="dropdown-scroll">
                     {COMMERCIAL_SUBTYPES.map(subtype => (
                        <SelectItem key={subtype} value={subtype}>{subtype}</SelectItem>
                     ))}
                  </SelectContent>
                 </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sale_date">Fecha de Venta</Label>
              <Input 
                id="sale_date" 
                type="date"
                max={today}
                className="w-full"
                {...register("sale_date")} 
              />
              {errors.sale_date && <span className="text-xs text-red-500">Fecha inválida</span>}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Registrar Venta
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddSaleForm;
