
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Calendar, Edit, Save } from 'lucide-react';
import { getProspectHistory } from '@/lib/prospectsService';

const NotesHistoryDrawer = ({ isOpen, onClose, prospect, onSaveNotes, onEdit, onFollowUp, isLoading }) => {
  const [notes, setNotes] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && prospect) {
      setNotes(prospect.notes || '');
      setEffectiveAt(new Date().toISOString().slice(0, 16));
      setChangeNote('');
      fetchHistory(prospect.id);
    }
  }, [isOpen, prospect]);

  const fetchHistory = async (id) => {
    setLoadingHistory(true);
    try {
      const data = await getProspectHistory(id);
      setHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = () => {
    if (!effectiveAt) return;
    onSaveNotes(
      prospect.id, 
      notes, 
      new Date(effectiveAt).toISOString(), 
      changeNote
    );
  };

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString() : 'N/A';

  if (!prospect) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <div className="p-6 border-b flex justify-between items-center bg-muted/30">
          <DialogTitle className="text-xl">Detalles y Notas - ID: {prospect.external_id}</DialogTitle>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => onFollowUp(prospect)}><Calendar className="h-4 w-4 mr-2"/> Follow-Up</Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(prospect)}><Edit className="h-4 w-4 mr-2"/> Editar</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center"><Edit className="h-5 w-5 mr-2"/> Notas Actuales</h3>
              <textarea 
                className="w-full min-h-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe notas sobre el prospecto aquí..."
              />
              <div className="bg-muted p-4 rounded-lg space-y-4 border">
                <h4 className="font-medium text-sm">Guardar Cambios en Notas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Efectiva *</Label>
                    <Input type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Razón (Opcional)</Label>
                    <Input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="Ej. Actualización de status" />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading || !effectiveAt} className="w-full">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Notas
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center"><Clock className="h-5 w-5 mr-2"/> Historial de Cambios</h3>
              {loadingHistory ? (
                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : history.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay historial registrado.</p>
              ) : (
                <div className="space-y-4 border-l-2 border-muted pl-4 ml-2">
                  {history.map((item) => (
                    <div key={item.id} className="relative">
                      <div className="absolute w-3 h-3 bg-primary rounded-full -left-[22px] top-1"></div>
                      <div className="bg-card border rounded-lg p-3 text-sm">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span className="font-medium text-foreground">{formatDate(item.effective_at)}</span>
                          <span>Usuario: {item.changed_by.substring(0, 8)}...</span>
                        </div>
                        {item.note && <p className="mb-2 font-medium">"{item.note}"</p>}
                        <div className="space-y-1">
                          {Object.entries(item.changes || {}).map(([key, change]) => (
                            <div key={key} className="text-xs bg-muted p-1 rounded">
                              <span className="font-medium capitalize">{key.replace('_', ' ')}: </span>
                              <span className="text-red-500 line-through mr-1">{String(change.from ?? 'N/A')}</span>
                              <span className="text-green-600">{String(change.to ?? 'N/A')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-1 border-l pl-6 space-y-6">
            <h3 className="font-semibold text-lg">Información Clave</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Calificación</Label>
                <div className="font-medium mt-1"><Badge variant={prospect.qualification >= 8 ? 'destructive' : 'secondary'}>{prospect.qualification}/10</Badge></div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Próximo Follow-Up</Label>
                <div className="font-medium mt-1 text-sm">{formatDate(prospect.follow_up_at)}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Documentos Enviados</Label>
                <div className="font-medium mt-1">
                  {prospect.documents_sent ? <Badge variant="outline" className="border-green-500 text-green-600">Sí</Badge> : <Badge variant="secondary">No</Badge>}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo Propiedad</Label>
                <div className="font-medium mt-1 text-sm">{prospect.property_type}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Portafolio</Label>
                <div className="font-medium mt-1 text-sm">{prospect.has_portfolio ? 'Sí' : 'No'}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Último Contacto</Label>
                <div className="font-medium mt-1 text-sm">{formatDate(prospect.last_contact_date)}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotesHistoryDrawer;
