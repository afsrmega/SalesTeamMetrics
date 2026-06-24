import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { updateProspectWithHistory } from '@/lib/prospectsService';
import { Loader2 } from 'lucide-react';

const RescheduleFollowUpModal = ({ isOpen, onClose, prospect, onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [followUpAt, setFollowUpAt] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (prospect && isOpen) {
      setFollowUpAt(prospect.follow_up_at ? new Date(prospect.follow_up_at).toISOString().slice(0, 16) : '');
      setEffectiveAt(new Date().toISOString().slice(0, 16));
      setNote('');
    }
  }, [prospect, isOpen]);

  const handleSubmit = async () => {
    if (!effectiveAt) {
      toast({ title: "Error", description: "Effective date is required", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const updates = {
        follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : null,
      };
      
      await updateProspectWithHistory(prospect.id, updates, new Date(effectiveAt).toISOString(), note);
      
      toast({ title: "Success", description: "Follow-up rescheduled" });
      onSave();
      onClose();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!prospect) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] z-50">
        <DialogHeader>
          <DialogTitle>Reschedule Follow-up - {prospect.prospect_name || 'Prospect'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>New Follow-up Date & Time</Label>
            <Input 
              type="datetime-local" 
              value={followUpAt} 
              onChange={(e) => setFollowUpAt(e.target.value)} 
              className="text-gray-900"
            />
          </div>

          <div className="grid gap-2 mt-4 pt-4 border-t border-gray-200">
            <Label className="text-blue-600 font-semibold">Effective Date (Required)</Label>
            <Input 
              type="datetime-local" 
              value={effectiveAt} 
              onChange={(e) => setEffectiveAt(e.target.value)} 
              required
              className="text-gray-900"
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Note (Optional)</Label>
            <Textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Reason for reschedule..."
              className="text-gray-900"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !effectiveAt}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleFollowUpModal;