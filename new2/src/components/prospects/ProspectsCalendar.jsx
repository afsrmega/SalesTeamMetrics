
import React from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getQualificationBucket } from '@/lib/dateUtils';

const ProspectsCalendar = ({ filteredProspects, currentMonth, onMonthChange, onDayClick }) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const prospectsByDay = filteredProspects.reduce((acc, prospect) => {
    if (!prospect.follow_up_at) return acc;
    const dateKey = format(new Date(prospect.follow_up_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(prospect);
    return acc;
  }, {});

  const todayStart = startOfDay(new Date());

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-gray-50 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2 text-center text-sm font-semibold text-gray-600">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
        {days.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayProspects = prospectsByDay[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isDayToday = isToday(day);
          
          let hasOverdue = false;
          let coldCount = 0;
          let warmCount = 0;
          let hotCount = 0;

          dayProspects.forEach(p => {
            const bucket = getQualificationBucket(p.qualification);
            if (bucket === 'Cold') coldCount++;
            if (bucket === 'Warm') warmCount++;
            if (bucket === 'Hot') hotCount++;
            
            if (isBefore(new Date(p.follow_up_at), new Date())) {
              hasOverdue = true;
            }
          });

          return (
            <div 
              key={idx} 
              onClick={() => onDayClick(day, dayProspects)}
              className={`min-h-[100px] bg-white p-2 cursor-pointer transition-colors hover:bg-gray-50 ${!isCurrentMonth ? 'text-gray-400 bg-gray-50' : 'text-gray-900'} ${isDayToday ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm font-medium ${isDayToday ? 'text-blue-600' : ''}`}>
                  {format(day, dateFormat)}
                </span>
                {hasOverdue && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Overdue</Badge>}
              </div>
              
              {dayProspects.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs font-semibold text-gray-700">{dayProspects.length} Follow-ups</div>
                  <div className="flex flex-wrap gap-1">
                    {coldCount > 0 && <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-medium">{coldCount} Cold</span>}
                    {warmCount > 0 && <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">{warmCount} Warm</span>}
                    {hotCount > 0 && <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-medium">{hotCount} Hot</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProspectsCalendar;
