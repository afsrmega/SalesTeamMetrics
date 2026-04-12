
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CalendarClock } from 'lucide-react';
import { formatM } from '@/lib/formatters';

const RapportMetrics = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card className="border-red-200 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Touchpoints Overdue
            </p>
            <div className="mt-2">
              <span className="text-2xl font-bold text-red-700">{metrics.overdueCount}</span>
              <span className="text-sm text-muted-foreground ml-2">
                (${formatM(metrics.overdueValue)})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-blue-200 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 flex items-center">
              <CalendarClock className="w-4 h-4 mr-2" />
              Next 7 Days
            </p>
            <div className="mt-2">
              <span className="text-2xl font-bold text-blue-700">{metrics.upcomingCount}</span>
              <span className="text-sm text-muted-foreground ml-2">
                (${formatM(metrics.upcomingValue)})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RapportMetrics;
