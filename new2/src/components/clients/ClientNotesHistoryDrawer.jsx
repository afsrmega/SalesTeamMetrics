
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { updateClientWithHistory, getClientHistory } from '@/lib/clientsService';
import { Loader2, Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const ClientNotesHistoryDrawer = ({ isOpen, onClose, client, onSave, onEditClick, onFollowUpClick }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  const [clientNotes, setClientNotes] = useState('');
  const [pendingFinancials, setPendingFinancials] = useState(false);
  const [effectiveAt, setEffectiveAt] = useState('');

  useEffect(() => {
    if (client && isOpen) {
      setClientNotes(client.client_notes || '');
      setPendingFinancials(client.pending_for_financials || false);
      setEffectiveAt(new Date().toISOString().slice(0, 16));
      fetchHistory();
    }
  }, [client, isOpen]);

  const fetchHistory = async () => {
    if (!client) return;
    setHistoryLoading(true);
    try {
      const data = await getClientHistory(client.id);
      setHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!effectiveAt) {
      toast({ title: "Error", description: "Fecha efectiva es obligatoria", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const updates = {
        client_notes: clientNotes,
        pending_for_financials: pendingFinancials
      };
      
      await updateClientWithHistory(client.id, updates, new Date(effectiveAt).toISOString(), "Actualización de notas");
      
      toast({ title: "Éxito", description: "Notes updated successfully" });
      onSave();
      fetchHistory();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto z-50">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">
            {client.prospect_name || client.client_name || 'Cliente'}
          </SheetTitle>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => onEditClick(client)}>
              <Edit className="w-4 h-4 mr-2" /> Edit Client
            </Button>
            <Button variant="outline" size="sm" onClick={() => onFollowUpClick(client)}>
              <Calendar className="w-4 h-4 mr-2" /> Update Follow-up
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-8">
          {/* Section 1: Notes & Status */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Notas y Estado</h3>
            
            <div className="grid gap-2">
              <Label>Notas del Cliente</Label>
              <Textarea 
                value={clientNotes} 
                onChange={(e) => setClientNotes(e.target.value)} 
                rows={4}
                className="text-gray-900"
              />
            </div>

            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
              <Label className="cursor-pointer font-medium text-gray-900">Pendiente de Finanzas</Label>
              <Switch 
                checked={pendingFinancials} 
                onCheckedChange={setPendingFinancials} 
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-blue-600 font-semibold">Fecha Efectiva (Requerido para guardar)</Label>
              <Input 
                type="datetime-local" 
                value={effectiveAt} 
                onChange={(e) => setEffectiveAt(e.target.value)} 
                required
                className="text-gray-900"
              />
            </div>

            <Button onClick={handleSaveNotes} disabled={loading || !effectiveAt} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Notes
            </Button>
          </section>

          {/* Section 2: History Timeline */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Historial de Cambios</h3>
            
            {historyLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
            ) : history.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No history found for this client.</p>
            ) : (
              <div className="space-y-4">
                {history.map((record) => (
                  <div key={record.id} className="border rounded-md p-3 bg-white shadow-sm text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-700">
                        {format(new Date(record.created_at || record.effective_at), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    {record.note && (
                      <p className="text-gray-600 mb-2 italic">"{record.note}"</p>
                    )}
                    <div className="space-y-1 mt-2">
                      {record.changes && Object.entries(record.changes).map(([field, details]) => (
                        <div key={field} className="flex flex-wrap items-center gap-1 text-xs">
                          <Badge variant="secondary" className="capitalize">{field.replace(/_/g, ' ')}</Badge>
                          <span className="text-gray-500">changed from</span>
                          <span className="font-mono text-gray-400 line-through truncate max-w-[100px]">
                            {String(details.from ?? 'null')}
                          </span>
                          <span className="text-gray-500">to</span>
                          <span className="font-mono text-green-600 font-medium truncate max-w-[100px]">
                            {String(details.to ?? 'null')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClientNotesHistoryDrawer;
