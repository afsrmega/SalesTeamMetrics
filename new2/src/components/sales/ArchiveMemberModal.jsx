
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const ArchiveMemberModal = ({ isOpen, onClose, onArchive, isProcessing, memberName }) => {
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setEndDate(today);
      setReason("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onArchive({ employment_end_date: endDate, archive_reason: reason });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Archive Member {memberName ? `- ${memberName}` : ''}</DialogTitle>
          <DialogDescription>
            This member will be archived. Historical sales data will be preserved, but the member will no longer appear as an active team member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Employment End Date <span className="text-red-500">*</span></Label>
            <Input 
              type="date" 
              required 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              disabled={isProcessing} 
            />
          </div>
          <div className="space-y-2">
            <Label>Archive Reason (Optional)</Label>
            <Textarea 
              placeholder="e.g., Left company, Transferred, etc." 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              disabled={isProcessing} 
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={isProcessing || !endDate}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ArchiveMemberModal;
