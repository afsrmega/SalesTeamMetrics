import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isBefore } from 'date-fns';
import { AlertCircle, Eye } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from 'date-fns';

const OverdueFollowUpsKPI = ({ filteredProspects }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const overdueProspects = filteredProspects.filter(p => 
    p.follow_up_at && isBefore(new Date(p.follow_up_at), new Date())
  );

  const count = overdueProspects.length;
  const totalValue = overdueProspects.reduce((sum, p) => sum + (Number(p.estimated_property_value) || 0), 0);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  if (count === 0) return null;

  return (
    <>
      <Card className="bg-red-50 border-red-200 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-full">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800">Overdue Follow-ups: {count}</h3>
              <p className="text-sm text-red-600 font-medium">Total Value: {formatCurrency(totalValue)}</p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setIsDrawerOpen(true)}>
            <Eye className="w-4 h-4 mr-2" /> View All
          </Button>
        </CardContent>
      </Card>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto z-50">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl text-red-600 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" /> Overdue Prospects
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {overdueProspects.map(p => (
              <div key={p.id} className="border border-red-100 rounded-lg p-4 bg-white shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg">{p.prospect_name || 'Sin Nombre'}</h4>
                    <p className="text-sm text-gray-500">ID: {p.external_id}</p>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">
                    Overdue
                  </span>
                </div>
                <div className="text-sm">
                  <p><span className="text-gray-500">Est. Value:</span> {formatCurrency(p.estimated_property_value)}</p>
                  <p><span className="text-red-500 font-medium">Was due:</span> {format(new Date(p.follow_up_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default OverdueFollowUpsKPI;