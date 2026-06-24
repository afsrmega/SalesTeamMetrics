import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Edit, Calendar, FileText } from 'lucide-react';
import { getQualificationBucket } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const DayFollowUpsDrawer = ({ isOpen, onClose, selectedDate, dayProspects, onReschedule, onEdit, onNotes }) => {
  const { isAdmin } = useAuth();
  
  if (!selectedDate) return null;

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto z-50">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">
            Follow-ups - {format(selectedDate, 'MMM d, yyyy')}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {dayProspects.length === 0 ? (
            <p className="text-gray-500 italic">No follow-ups for this day.</p>
          ) : (
            dayProspects.map(p => {
              const bucket = getQualificationBucket(p.qualification);
              let bucketColor = "bg-gray-100 text-gray-800";
              if (bucket === 'Cold') bucketColor = "bg-blue-100 text-blue-800";
              if (bucket === 'Warm') bucketColor = "bg-amber-100 text-amber-800";
              if (bucket === 'Hot') bucketColor = "bg-red-100 text-red-800";

              return (
                <div key={p.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg">{p.prospect_name || 'Sin Nombre'}</h4>
                      <p className="text-sm text-gray-500">ID: {p.external_id}</p>
                      {isAdmin && p.owner_user_id && (
                        <p className="text-xs text-gray-400 mt-1">Owner ID: {p.owner_user_id}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${bucketColor}`}>
                        {bucket} ({p.qualification}/10)
                      </span>
                      {p.documents_sent && <Badge variant="outline" className="text-green-600 border-green-600 text-[10px]">Docs Sent</Badge>}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <p><span className="text-gray-500">Est. Value:</span> {formatCurrency(p.estimated_property_value)}</p>
                    <p><span className="text-gray-500">Time:</span> {format(new Date(p.follow_up_at), 'HH:mm')}</p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(p); }}>
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { onClose(); onReschedule(p); }}>
                      <Calendar className="w-4 h-4 mr-1" /> Reschedule
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { onClose(); onNotes(p); }}>
                      <FileText className="w-4 h-4 mr-1" /> Notes
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DayFollowUpsDrawer;