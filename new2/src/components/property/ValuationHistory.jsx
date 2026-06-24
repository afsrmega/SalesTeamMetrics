
import React, { useState } from "react";
import { Home, Info, Expand, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { deleteValuationData } from "@/lib/propertyService";
import ValuationResultDisplay from "@/components/property/ValuationResultDisplay";
import ValuationChart from "@/components/property/ValuationChart";

const ValuationHistory = ({ user, history, onDelete }) => {
  const { toast } = useToast();
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const handleDeleteProperty = async (id) => {
    if (!user) {
      toast({ title: "Acción Requerida", description: "Inicia sesión para eliminar cálculos.", variant: "default" });
      return;
    }
    try {
      await deleteValuationData(id, user.id);
      onDelete(id);
      toast({ title: "Cálculo Eliminado", description: "El cálculo ha sido eliminado del historial." });
    } catch (error) {
      toast({ title: "Error al Eliminar", description: error.message, variant: "destructive" });
    }
  };

  const openHistoryModal = (property) => {
    setSelectedHistoryItem(property);
    setIsHistoryModalOpen(true);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <>
      <div className="">
        <Card className="shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-gray-700"><Home className="h-6 w-6 text-gray-600" />Historial de Cálculos</CardTitle>
            <CardDescription className="text-gray-500">Últimos cálculos realizados (máximo 5).</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500"><Info className="mx-auto h-12 w-12 opacity-20 mb-2" /><p>No hay cálculos en el historial.</p></div>
            ) : (
              <div className="space-y-4">
                {history.map(property => (
                  <div key={property.id} className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-green-700">Cálculo: {property.initial_year} - {property.current_year} ({property.year_difference} años)</h3>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => openHistoryModal(property)} className="text-gray-500 hover:text-green-600 h-7 w-7 mr-1"><Expand className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProperty(property.id)} className="text-red-500 hover:text-red-700 hover:bg-red-100 h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-gray-500 block">Valor Inicial:</span><p className="font-medium text-gray-800">${parseFloat(property.initial_value).toLocaleString()}</p></div>
                      <div><span className="text-gray-500 block">Valor Final:</span><p className="font-medium text-gray-800">${parseFloat(property.current_value).toLocaleString()}</p></div>
                      <div className="md:text-right"><span className="text-gray-500 block">Incremento:</span><p className="font-bold text-emerald-600">{parseFloat(property.percentage_increase).toFixed(2)}%</p></div>
                      <div className="md:text-right"><span className="text-gray-500 block">Anual:</span><p className="font-bold text-teal-600">{parseFloat(property.annual_appreciation).toFixed(2)}%</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedHistoryItem && (
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white rounded-lg shadow-xl p-0">
            <DialogHeader className="bg-gray-50 p-4 border-b"><DialogTitle className="text-xl font-semibold text-gray-800">Detalle Historial: {selectedHistoryItem.initial_year} - {selectedHistoryItem.current_year}</DialogTitle><DialogDescription className="text-sm text-gray-500">Visualización de cálculo guardado.</DialogDescription></DialogHeader>
            <div className="p-6">
              <ValuationResultDisplay result={selectedHistoryItem} />
              <ValuationChart result={selectedHistoryItem} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ValuationHistory;
