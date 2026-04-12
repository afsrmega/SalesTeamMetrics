
import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, SkipForward, CalendarPlus as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getTouchpointsByClient, completeTouchpoint, rescheduleTouchpoint, skipTouchpoint } from '@/lib/clientTouchpointsService';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';

const RapportPlanDrawer = ({ isOpen, onClose, clientId, clientName }) => {
  const [touchpoints, setTouchpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeNotes, setActiveNotes] = useState({});
  const [rescheduleDates, setRescheduleDates] = useState({});
  const { toast } = useToast();

  const fetchTouchpoints = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await getTouchpointsByClient(clientId);
      setTouchpoints(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load rapport plan." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTouchpoints();
    }
  }, [isOpen, clientId]);

  useEffect(() => {
    if (!isOpen || !clientId) return;
    
    const channel = supabase.channel(`touchpoints_${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_touchpoints', filter: `client_id=eq.${clientId}` }, () => {
        fetchTouchpoints();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, clientId]);

  const handleAction = async (action, tp) => {
    try {
      const note = activeNotes[tp.id] || '';
      if (action === 'complete') {
        await completeTouchpoint(tp.id, note);
      } else if (action === 'skip') {
        await skipTouchpoint(tp.id, note);
      } else if (action === 'reschedule') {
        const date = rescheduleDates[tp.id];
        if (!date) return toast({ variant: "destructive", description: "Select a date" });
        await rescheduleTouchpoint(tp.id, new Date(date).toISOString(), note);
      }
      toast({ title: "Success", description: "Touchpoint updated" });
      setActiveNotes(prev => ({...prev, [tp.id]: ''}));
    } catch (error) {
      toast({ variant: "destructive", description: error.message });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'skipped': return <Badge variant="secondary" className="bg-gray-200 text-gray-800">Skipped</Badge>;
      case 'rescheduled': return <Badge className="bg-blue-500">Rescheduled</Badge>;
      default: return <Badge variant="outline">Scheduled</Badge>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Rapport Plan - {clientName}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : touchpoints.length === 0 ? (
            <p className="text-center text-muted-foreground">No rapport plan found.</p>
          ) : (
            touchpoints.map((tp) => (
              <div key={tp.id} className="border rounded-lg p-4 space-y-3 bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      Step {tp.step}: {tp.purpose.replace('_', ' ')}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {format(new Date(tp.due_at), 'PPP p')}
                    </p>
                  </div>
                  {getStatusBadge(tp.status)}
                </div>
                
                {['scheduled', 'rescheduled'].includes(tp.status) && (
                  <div className="space-y-3 pt-3 border-t">
                    <Input 
                      placeholder="Add a note (optional)..." 
                      value={activeNotes[tp.id] || ''}
                      onChange={(e) => setActiveNotes(prev => ({...prev, [tp.id]: e.target.value}))}
                      className="text-sm"
                    />
                    
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleAction('complete', tp)} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle className="h-4 w-4 mr-1" /> Complete
                      </Button>
                      
                      <div className="flex items-center gap-1 border rounded-md p-1">
                        <Input 
                          type="datetime-local" 
                          className="h-8 text-xs border-none w-[180px]"
                          value={rescheduleDates[tp.id] || ''}
                          onChange={(e) => setRescheduleDates(prev => ({...prev, [tp.id]: e.target.value}))}
                        />
                        <Button size="sm" variant="outline" onClick={() => handleAction('reschedule', tp)} className="h-8">
                           Reschedule
                        </Button>
                      </div>

                      <Button size="sm" variant="secondary" onClick={() => handleAction('skip', tp)}>
                        <SkipForward className="h-4 w-4 mr-1" /> Skip
                      </Button>
                    </div>
                  </div>
                )}
                
                {tp.note && (
                  <div className="bg-muted p-2 rounded text-sm mt-2">
                    <span className="font-medium text-xs text-muted-foreground block mb-1">Note:</span>
                    {tp.note}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RapportPlanDrawer;
