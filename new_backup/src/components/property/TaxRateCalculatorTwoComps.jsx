import React, { useState, useImperativeHandle, forwardRef } from "react";
import { motion } from "framer-motion";
import { PercentSquare, Calculator, TrendingUp, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const TaxRateResultDisplayTwoComps = ({ result }) => {
  if (!result) return null;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Valor Actual 2024:</span>
        <span className="font-medium text-gray-900">${result.currentValue2024.toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Promedio Comparables:</span>
        <span className="font-medium text-gray-900">${result.averageComparableSqFt.toLocaleString()}/sq ft</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Valor Propuesto (GBA * Promedio):</span>
        <span className="font-medium text-gray-900">${result.proposedValue.toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Diferencia (Actual - Propuesto):</span>
        <span className={`font-medium ${result.difference < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          ${result.difference.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Sobrepago Estimado:</span>
        <span className="font-medium text-gray-900">${result.estimatedOverpayment.toLocaleString()}</span>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center text-lg">
          <span className="text-gray-700 font-semibold">Tax Rate Calculado:</span>
          <span className="font-bold text-green-700">
            {result.taxRate > 0 ? `${(result.taxRate * 100).toFixed(3)}%` : 'N/A (Revisar datos)'}
          </span>
        </div>
      </div>
    </div>
  );
};

const TaxRateCalculatorTwoComps = forwardRef(({ disabled }, ref) => {
  const { toast } = useToast();
  const [gba, setGba] = useState("");
  const [currentValue2024, setCurrentValue2024] = useState("");
  const [comp1SqFt, setComp1SqFt] = useState("");
  const [comp2SqFt, setComp2SqFt] = useState("");
  const [estimatedOverpayment, setEstimatedOverpayment] = useState("");
  const [calculationResult, setCalculationResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatCurrency = (value) => `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercentage = (value) => `${parseFloat(value).toFixed(3)}%`;

  useImperativeHandle(ref, () => ({
    getResults: () => {
      if (!calculationResult) return null;
      return {
        "GBA (sq ft)": calculationResult.gba,
        "Current Value 2024": formatCurrency(calculationResult.currentValue2024),
        "Comparable 1 ($/sq ft)": formatCurrency(calculationResult.comp1SqFt),
        "Comparable 2 ($/sq ft)": formatCurrency(calculationResult.comp2SqFt),
        "Average Comparable ($/sq ft)": formatCurrency(calculationResult.averageComparableSqFt),
        "Proposed Value": formatCurrency(calculationResult.proposedValue),
        "Value Difference": formatCurrency(calculationResult.difference),
        "Estimated Overpayment": formatCurrency(calculationResult.estimatedOverpayment),
        "Calculated Tax Rate": calculationResult.taxRate > 0 ? formatPercentage(calculationResult.taxRate * 100) : 'N/A',
      };
    }
  }));

  const calculateTaxRate = () => {
    const gbaNum = parseFloat(gba);
    const currentValueNum = parseFloat(currentValue2024);
    const comp1Num = parseFloat(comp1SqFt);
    const comp2Num = parseFloat(comp2SqFt);
    const overpaymentNum = parseFloat(estimatedOverpayment);

    if (isNaN(gbaNum) || gbaNum <= 0 ||
        isNaN(currentValueNum) || currentValueNum <= 0 ||
        isNaN(comp1Num) || comp1Num <= 0 ||
        isNaN(comp2Num) || comp2Num <= 0 ||
        isNaN(overpaymentNum) || overpaymentNum < 0) {
      toast({
        title: "Error de Validación",
        description: "Todos los campos deben ser números positivos. El sobrepago puede ser cero.",
        variant: "destructive",
      });
      return;
    }

    const averageComparableSqFt = (comp1Num + comp2Num) / 2;
    const proposedValue = averageComparableSqFt * gbaNum;
    const difference = currentValueNum - proposedValue;
    
    let taxRate = 0;
    if (difference > 0 && overpaymentNum > 0) {
      taxRate = overpaymentNum / difference;
    } else if (difference <= 0 && overpaymentNum > 0) {
        toast({
            title: "Advertencia de Cálculo",
            description: "El valor propuesto es mayor o igual al valor actual. El Tax Rate no puede ser positivo con un sobrepago.",
            variant: "default",
            duration: 7000,
        });
    } else if (overpaymentNum === 0) {
        taxRate = 0;
    }

    const result = {
      gba: gbaNum,
      currentValue2024: currentValueNum,
      comp1SqFt: comp1Num,
      comp2SqFt: comp2Num,
      estimatedOverpayment: overpaymentNum,
      averageComparableSqFt,
      proposedValue,
      difference,
      taxRate,
    };
    setCalculationResult(result);
    toast({
      title: "Cálculo de Tax Rate (2 Comps) Completado",
      description: `El Tax Rate calculado es ${taxRate > 0 ? (taxRate * 100).toFixed(3) + '%' : 'N/A'}.`,
    });
  };

  return (
    <>
      <Card className="shadow-xl border-t-4 border-purple-600 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-gray-800">
            <PercentSquare className="h-7 w-7 text-purple-700" />
            Calculadora de Tax Rate (2 Comparables)
          </CardTitle>
          <CardDescription className="text-gray-600">
            Estima el Tax Rate usando el promedio de dos propiedades comparables.
            {disabled && <span className="text-red-500 ml-2">(Inicia sesión para usar)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gba-2comp" className="text-gray-700">Área (GBA)</Label>
                  <Input id="gba-2comp" type="number" placeholder="Ej: 2000" value={gba} onChange={(e) => setGba(e.target.value)} className="border-gray-300 focus:border-purple-500 focus:ring-purple-500" disabled={disabled} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentValue2024-2comp" className="text-gray-700">Valor Actual 2024 ($)</Label>
                  <Input id="currentValue2024-2comp" type="number" placeholder="Ej: 500000" value={currentValue2024} onChange={(e) => setCurrentValue2024(e.target.value)} className="border-gray-300 focus:border-purple-500 focus:ring-purple-500" disabled={disabled} />
                </div>
              </div>
              
              <Label className="text-gray-700 block pt-2">Valor por Pie Cuadrado de Comparables ($/sq ft)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="comp1SqFt-2comp" className="text-xs text-gray-600">Comparable 1</Label>
                  <Input id="comp1SqFt-2comp" type="number" placeholder="Ej: 250" value={comp1SqFt} onChange={(e) => setComp1SqFt(e.target.value)} className="border-gray-300 focus:border-purple-500 focus:ring-purple-500" disabled={disabled} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp2SqFt-2comp" className="text-xs text-gray-600">Comparable 2</Label>
                  <Input id="comp2SqFt-2comp" type="number" placeholder="Ej: 260" value={comp2SqFt} onChange={(e) => setComp2SqFt(e.target.value)} className="border-gray-300 focus:border-purple-500 focus:ring-purple-500" disabled={disabled} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedOverpayment-2comp" className="text-gray-700">Sobrepago Estimado ($)</Label>
                <Input id="estimatedOverpayment-2comp" type="number" placeholder="Ej: 5000" value={estimatedOverpayment} onChange={(e) => setEstimatedOverpayment(e.target.value)} className="border-gray-300 focus:border-purple-500 focus:ring-purple-500" disabled={disabled} />
              </div>
              
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base"
                onClick={calculateTaxRate}
                disabled={disabled}
              >
                <Calculator className="mr-2 h-5 w-5" />
                Calcular Tax Rate
              </Button>
            </div>

            {calculationResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-purple-50 p-6 rounded-lg shadow relative"
              >
                 <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(true)} className="absolute top-2 right-2 text-gray-500 hover:text-purple-600">
                  <Expand className="h-5 w-5" />
                </Button>
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2 text-purple-700" />
                  Resultado del Cálculo de Tax Rate
                </h3>
                <TaxRateResultDisplayTwoComps result={calculationResult} />
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {calculationResult && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white rounded-lg shadow-xl p-0">
            <DialogHeader className="bg-gray-50 p-4 border-b">
              <DialogTitle className="text-xl font-semibold text-gray-800">Resultado Detallado: Tax Rate (2 Comps)</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Visualización ampliada del cálculo de Tax Rate.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6">
              <TaxRateResultDisplayTwoComps result={calculationResult} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
});

export default TaxRateCalculatorTwoComps;