
import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getProspectHistory } from '@/lib/prospectsService';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const ProspectHistoryDrawer = ({ open, onOpenChange, prospectId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && prospectId) {
      setLoading(true);
      getProspectHistory(prospectId)
        .then(setHistory)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, prospectId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Historial del Prospecto</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-gray-500" /></div>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">No hay historial registrado.</p>
          ) : (
            history.map((record) => (
              <div key={record.id} className="border rounded-md p-4 bg-gray-50 text-sm">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Fecha Efectiva:</span>
                  <span className="text-gray-600">{format(new Date(record.effective_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-gray-700">Cambios:</span>
                  <pre className="text-xs mt-1 bg-white p-2 rounded overflow-x-auto border">
                    {JSON.stringify(record.changes, null, 2)}
                  </pre>
                </div>
                {record.note && (
                  <div>
                    <span className="font-semibold text-gray-700">Nota:</span>
                    <p className="mt-1 text-gray-600">{record.note}</p>
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

export default ProspectHistoryDrawer;
