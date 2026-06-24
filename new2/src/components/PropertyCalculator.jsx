import React, { useState, useEffect, useCallback, useRef } from "react";
import { FileDown, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { fetchValuationsData } from "@/lib/propertyService";
import ValuationCalculator from "@/components/property/ValuationCalculator";
import ValuationHistory from "@/components/property/ValuationHistory";
import TaxRateCalculator from "@/components/property/TaxRateCalculator";
import TaxRateCalculatorTwoComps from "@/components/property/TaxRateCalculatorTwoComps";
import TaxRateCalculatorThreeComps from "@/components/property/TaxRateCalculatorThreeComps";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const PropertyCalculator = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [propertiesHistory, setPropertiesHistory] = useState([]);

  const taxCalcRef = useRef();
  const taxCalcTwoCompsRef = useRef();
  const taxCalcThreeCompsRef = useRef();

  const loadValuations = useCallback(async (userId) => {
    if (!userId) {
      setIsLoading(false);
      setPropertiesHistory([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchValuationsData(userId);
      setPropertiesHistory(data);
    } catch (error) {
      toast({ title: "Error al cargar historial", description: error.message, variant: "destructive" });
      setPropertiesHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      loadValuations(user.id);
    } else {
      setIsLoading(false);
    }
  }, [user, loadValuations]);

  const onValuationCalculated = (newValuation) => {
    setPropertiesHistory(prev => [newValuation, ...prev.slice(0, 4)]);
  };

  const onValuationDeleted = (deletedId) => {
    setPropertiesHistory(prev => prev.filter(p => p.id !== deletedId));
  };

  const formatCurrency = (value) => `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercentage = (value) => `${parseFloat(value).toFixed(2)}%`;

  const handleExportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      if (propertiesHistory.length > 0) {
        let valuationData = [];
        propertiesHistory.forEach((p, index) => {
          valuationData.push([`Valuation ${index + 1}`]);
          valuationData.push(["Initial Year", p.initial_year]);
          valuationData.push(["Initial Value", formatCurrency(p.initial_value)]);
          valuationData.push(["Final Year", p.current_year]);
          valuationData.push(["Final Value", formatCurrency(p.current_value)]);
          valuationData.push(["Year Difference", `${p.year_difference} years`]);
          valuationData.push(["Value Difference", formatCurrency(p.value_difference)]);
          valuationData.push(["Increase %", formatPercentage(p.percentage_increase)]);
          valuationData.push(["Annual Appreciation %", formatPercentage(p.annual_appreciation)]);
          valuationData.push([]);
        });
        const ws1 = XLSX.utils.aoa_to_sheet(valuationData, {
          header: ["Field", "Value"],
          skipHeader: true
        });
        XLSX.utils.book_append_sheet(wb, ws1, "Property Valuations");
      }

      const getTaxResults = (ref, sheetName) => {
        if (ref.current && ref.current.getResults) {
          const results = ref.current.getResults();
          if (results) {
            const data = Object.entries(results).map(([key, value]) => [key, value]);
            const ws = XLSX.utils.aoa_to_sheet(data, {
              header: ["Field", "Value"],
              skipHeader: true
            });
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
          }
        }
      };

      getTaxResults(taxCalcRef, "Tax Rate (1 Comp)");
      getTaxResults(taxCalcTwoCompsRef, "Tax Rate (2 Comps)");
      getTaxResults(taxCalcThreeCompsRef, "Tax Rate (3 Comps)");

      if (wb.SheetNames.length === 0) {
        toast({ title: "No Data", description: "There are no calculations to export.", variant: "default" });
        return;
      }

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      const s2ab = (s) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      };
      saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), 'Property_Tools_Results.xlsx');
      toast({ title: "Export Successful", description: "The results have been exported to Excel." });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({ title: "Export Error", description: "Could not generate the Excel file.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><div className="text-lg font-semibold text-gray-600">Cargando...</div></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-red-300 rounded-lg bg-red-50 text-red-700">
        <ShieldAlert className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
        <p className="text-center">Por favor, inicia sesión para usar las herramientas de propiedades.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12">
      <div className="flex justify-end">
        <Button onClick={handleExportToExcel}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar Resultados a Excel
        </Button>
      </div>

      <ValuationCalculator
        user={user}
        onValuationCalculated={onValuationCalculated}
      />

      <ValuationHistory
        user={user}
        history={propertiesHistory}
        onDelete={onValuationDeleted}
      />

      <div>
  <TaxRateCalculator ref={taxCalcRef} disabled={!user} />
</div>

<div className="mt-12">
  <TaxRateCalculatorTwoComps ref={taxCalcTwoCompsRef} disabled={!user} />
</div>

<div className="mt-12">
  <TaxRateCalculatorThreeComps ref={taxCalcThreeCompsRef} disabled={!user} />
</div>
    </div>
  );
};

export default PropertyCalculator;