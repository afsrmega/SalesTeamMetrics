
import React, { useState } from 'react';
import { useProspectsData } from '@/hooks/useProspectsData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, History, ArrowRight } from 'lucide-react';
import ProspectHistoryDrawer from './ProspectHistoryDrawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertProspectToClient, updateProspectWithHistory } from '@/lib/prospectsService';

const ProspectsPage = () => {
  const { prospects, loading, refetch } = useProspectsData();
  const { toast } = useToast();
  
  const [selectedProspectForHistory, setSelectedProspectForHistory] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [prospectToConvert, setProspectToConvert] = useState(null);
  const [effectiveAt, setEffectiveAt] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const activeProspects = prospects.filter(p => p.status === 'active');
  const totalPotencial = activeProspects.reduce((sum, p) => sum + Number(p.estimated_property_value || 0), 0);
  const hotPipeline = activeProspects.filter(p => p.qualification >= 8).reduce((sum, p) => sum + Number(p.estimated_property_value || 0), 0);

  const handleConvertClick = (prospect) => {
    setProspectToConvert(prospect);
    setEffectiveAt(new Date().toISOString().slice(0, 16));
    setNote('');
    setConvertModalOpen(true);
  };

  const submitConversion = async () => {
    if (!effectiveAt) {
        toast({ title: "Error", description: "Fecha efectiva es obligatoria", variant: "destructive" });
        return;
    }
    setProcessing(true);
    try {
        await convertProspectToClient(prospectToConvert.id, new Date(effectiveAt).toISOString(), note);
        toast({ title: "Éxito", description: "Prospecto convertido a cliente." });
        setConvertModalOpen(false);
        refetch();
    } catch (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setProcessing(false);
    }
  };

  const handleUpdateQualification = async (prospect, newQual) => {
    try {
      await updateProspectWithHistory(prospect.id, { qualification: newQual }, new Date().toISOString(), 'Actualización rápida de calificación');
      toast({ title: "Actualizado", description: "Calificación guardada." });
      refetch();
    } catch (err) {
      toast({ title: "Error", description: "Fallo al actualizar calificación", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Mis Prospectos</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-gray-500 font-semibold mb-1">Valor Potencial Total</h3>
          <p className="text-2xl font-bold">${totalPotencial.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-gray-500 font-semibold mb-1">Hot Pipeline (Calificación 8-10)</h3>
          <p className="text-2xl font-bold text-orange-600">${hotPipeline.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Externo</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Tipo Propiedad</TableHead>
              <TableHead>Valor Est.</TableHead>
              <TableHead>Calificación (0-10)</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeProspects.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.external_id || 'N/A'}</TableCell>
                <TableCell>{p.source_lead || 'N/A'}</TableCell>
                <TableCell>{p.property_type || 'N/A'}</TableCell>
                <TableCell>${Number(p.estimated_property_value || 0).toLocaleString()}</TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    defaultValue={p.qualification || 0} 
                    className="w-20" 
                    min={0} max={10}
                    onBlur={(e) => handleUpdateQualification(p, Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedProspectForHistory(p.id); setIsHistoryOpen(true); }}>
                      <History className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => handleConvertClick(p)}>
                      <ArrowRight className="h-4 w-4 mr-1" /> Convertir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {activeProspects.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-500">No hay prospectos activos.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ProspectHistoryDrawer 
        open={isHistoryOpen} 
        onOpenChange={setIsHistoryOpen} 
        prospectId={selectedProspectForHistory} 
      />

      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir a Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fecha Efectiva (Obligatorio)</Label>
              <Input type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Nota Adicional</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Aceptó propuesta financiera" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertModalOpen(false)}>Cancelar</Button>
            <Button onClick={submitConversion} disabled={processing || !effectiveAt}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProspectsPage;
