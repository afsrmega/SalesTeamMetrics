
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { saveValuationData, saveSharedValuation } from "@/lib/propertyService";
import ValuationResultDisplay from "@/components/property/ValuationResultDisplay";
import YearInput from "@/components/property/YearInput";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

const ValuationCalculator = ({ user, onValuationCalculated }) => {
  const { toast } = useToast();
  
  const [initialYear, setInitialYear] = useLocalStorageState("property-tools:valuation:initialYear", new Date().getFullYear() - 5);
  const [initialValue, setInitialValue] = useLocalStorageState("property-tools:valuation:initialValue", "");
  const [currentYear, setCurrentYear] = useLocalStorageState("property-tools:valuation:finalYear", new Date().getFullYear());
  const [currentValue, setCurrentValue] = useLocalStorageState("property-tools:valuation:finalValue", "");
  
  const [calculationResult, setCalculationResult] = useState(null);
  const [isSharing, setIsSharing] = useState(false);

  const currentYearLimit = new Date().getFullYear();

  const resetCalculator = () => {
    setInitialYear(new Date().getFullYear() - 5);
    setInitialValue("");
    setCurrentYear(new Date().getFullYear());
    setCurrentValue("");
    setCalculationResult(null);
    
    localStorage.removeItem("property-tools:valuation:initialYear");
    localStorage.removeItem("property-tools:valuation:initialValue");
    localStorage.removeItem("property-tools:valuation:finalYear");
    localStorage.removeItem("property-tools:valuation:finalValue");
  };

  const calculateValuation = () => {
    const iYear = parseInt(initialYear, 10);
    const iValue = parseFloat(initialValue);
    const cYear = parseInt(currentYear, 10);
    const cValue = parseFloat(currentValue);

    if (isNaN(iYear) || isNaN(iValue) || isNaN(cYear) || isNaN(cValue)) {
      toast({ title: "Error de Validación", description: "Todos los campos son requeridos y deben ser números.", variant: "destructive" });
      return;
    }
    if (iValue <= 0 || cValue <= 0) {
      toast({ title: "Error de Validación", description: "Los valores deben ser positivos.", variant: "destructive" });
      return;
    }
    if (iYear >= cYear) {
      toast({ title: "Error de Validación", description: "El año inicial debe ser menor que el año final.", variant: "destructive" });
      return;
    }

    const yearDifference = cYear - iYear;
    const valueDifference = cValue - iValue;
    const percentageIncrease = (valueDifference / iValue) * 100;
    const annualAppreciation = (Math.pow(cValue / iValue, 1 / yearDifference) - 1) * 100;

    const result = {
      initial_year: iYear,
      initial_value: iValue,
      current_year: cYear,
      current_value: cValue,
      year_difference: yearDifference,
      value_difference: valueDifference,
      percentage_increase: percentageIncrease,
      annual_appreciation: annualAppreciation,
    };
    setCalculationResult(result);
    toast({ title: "Cálculo Exitoso", description: "La valoración de la propiedad ha sido calculada." });
  };

  const handleShare = async () => {
    if (!calculationResult) {
      toast({ title: "Sin Resultados", description: "Calcula una valoración antes de compartir.", variant: "default" });
      return;
    }
    setIsSharing(true);
    try {
      const shareData = await saveSharedValuation(calculationResult);
      const shareUrl = `${window.location.origin}/share/valuation/${shareData.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Enlace Copiado",
        description: "El enlace para compartir ha sido copiado a tu portapapeles.",
      });
    } catch (error) {
      console.error("Error sharing valuation:", error);
      toast({ title: "Error al Compartir", description: "No se pudo crear el enlace para compartir.", variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  const handleSave = async () => {
    if (!calculationResult) {
      toast({ title: "Sin Resultados", description: "Calcula una valoración antes de guardar.", variant: "default" });
      return;
    }
    try {
      const data = await saveValuationData({ ...calculationResult, user_id: user.id });
      
      onValuationCalculated(data);
      toast({ title: "Guardado Exitoso", description: "La valoración ha sido guardada en tu historial." });
    } catch (error) {
      console.error("Error saving valuation:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar la valoración.", variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-xl border-t-4 border-green-600 bg-white">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle className="flex items-center gap-2 text-2xl text-gray-800">
            <TrendingUp className="h-7 w-7 text-green-700" />
            Calculadora de Valoración de Propiedad
          </CardTitle>
          <CardDescription className="text-gray-600 mt-1">
            Calcula la apreciación anual y el aumento de valor de una propiedad.
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetCalculator}
          className="text-gray-600 hover:text-red-600 flex items-center shrink-0"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Limpiar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial-year" className="text-gray-700">Año Inicial</Label>
                <YearInput
                  value={initialYear}
                  onChange={setInitialYear}
                  min={1980}
                  max={currentYearLimit - 1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial-value" className="text-gray-700">Valor Inicial ($)</Label>
                <Input id="initial-value" type="number" placeholder="Ej: 350000" value={initialValue} onChange={(e) => setInitialValue(e.target.value)} className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-gray-900" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current-year" className="text-gray-700">Año Final</Label>
                <YearInput
                  value={currentYear}
                  onChange={setCurrentYear}
                  min={1981}
                  max={currentYearLimit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current-value" className="text-gray-700">Valor Final ($)</Label>
                <Input id="current-value" type="number" placeholder="Ej: 500000" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-gray-900" />
              </div>
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base" onClick={calculateValuation}>
              <Calculator className="mr-2 h-5 w-5" />
              Calcular Valoración
            </Button>
          </div>

          {calculationResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-green-50 p-6 rounded-lg shadow"
            >
              <ValuationResultDisplay result={calculationResult} />
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button onClick={handleSave} className="flex-1 bg-gray-700 hover:bg-gray-800 text-white">
                  Guardar en Historial
                </Button>
                <Button onClick={handleShare} disabled={isSharing} className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  {isSharing ? "Compartiendo..." : "Compartir"}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ValuationCalculator;
