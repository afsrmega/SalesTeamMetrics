
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from 'lucide-react';

const UrgentFollowUps = ({ overdue, upcoming, isLoading }) => {
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  
  const overdueCount = (overdue.prospects?.length || 0) + (overdue.clients?.length || 0);
  const overdueValue = (overdue.prospects || []).reduce((s, p) => s + Number(p.estimated_property_value||0), 0) + 
                       (overdue.clients || []).reduce((s, c) => s + Number(c.estimated_property_value||0), 0);

  const upcomingCount = (upcoming.prospects?.length || 0) + (upcoming.clients?.length || 0);
  const upcomingValue = (upcoming.prospects || []).reduce((s, p) => s + Number(p.estimated_property_value||0), 0) + 
                        (upcoming.clients || []).reduce((s, c) => s + Number(c.estimated_property_value||0), 0);

  if (isLoading) return <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" /> Seguimientos (Follow-ups)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <h4 className="font-semibold text-red-900">Atrasados</h4>
              <p className="text-sm text-red-700">{overdueCount} registros requieren atención inmediata.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-red-900">{formatCurrency(overdueValue)}</div>
            <div className="text-xs text-red-700">Valor en riesgo</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <h4 className="font-semibold text-blue-900">Próximos 7 días</h4>
              <p className="text-sm text-blue-700">{upcomingCount} seguimientos programados.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-blue-900">{formatCurrency(upcomingValue)}</div>
            <div className="text-xs text-blue-700">Valor potencial</div>
          </div>
        </div>

        {overdue.prospects?.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold mb-2 text-muted-foreground">Prospectos Atrasados Prioritarios</h5>
            <div className="space-y-2">
              {overdue.prospects.sort((a,b) => b.qualification - a.qualification).slice(0, 3).map(p => (
                <div key={p.id} className="flex justify-between items-center text-sm p-2 border rounded">
                  <span className="font-medium">ID: {p.external_id}</span>
                  <Badge variant="destructive">Calif: {p.qualification}</Badge>
                  <span>{formatCurrency(p.estimated_property_value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default UrgentFollowUps;
