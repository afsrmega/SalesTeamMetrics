
import React, { useMemo } from 'react';
import { formatCurrency } from '@/lib/salesUtils';
import { applyResidentialToggle } from '@/lib/filterSalesRecords';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from 'lucide-react';
import { getVisibleMembersForPeriod } from '@/lib/memberVisibilityUtils';

const LeaderboardTable = ({ title, data, emptyMessage }) => {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
        <CardTitle className="text-lg flex items-center text-slate-800">
          <Trophy className="w-5 h-5 mr-2 text-custom-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[80px] text-center">Rank</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Ventas Totales</TableHead>
              <TableHead className="text-right">Transacciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow 
                  key={item.id} 
                  className={item.isCurrentUser ? "bg-blue-50/50 hover:bg-blue-50" : ""}
                >
                  <TableCell className="text-center font-medium">
                    {item.rank === 1 ? <Trophy className="w-5 h-5 mx-auto text-yellow-500" /> :
                     item.rank === 2 ? <Medal className="w-5 h-5 mx-auto text-gray-400" /> :
                     item.rank === 3 ? <Award className="w-5 h-5 mx-auto text-amber-600" /> :
                     <span className="text-slate-500">{item.rank}</span>}
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {item.is_archived && (
                        <span className="badge-archived ml-1">Archived</span>
                      )}
                      {item.isCurrentUser && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none text-[10px] uppercase px-1.5 py-0">Tú</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-custom-primary">
                    {formatCurrency(item.totalSales)}
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {item.count}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const SalesLeaderboard = ({
  salesTeam,
  salesRecords,
  memberData,
  activeMonthStart,
  activeMonthEnd,
  activeMonthLabel,
  activeQuarterStart,
  activeQuarterEnd,
  activeQuarterLabel,
  includeResidential
}) => {

  const generateLeaderboardData = (startDate, endDate) => {
    if (!salesTeam || !salesRecords || !startDate || !endDate) return [];

    const visibleMembers = getVisibleMembersForPeriod(salesTeam, salesRecords, startDate, endDate);
    
    // Filter out admins
    const eligibleMembers = visibleMembers.filter(m => m.role !== 'admin' && m.is_admin !== true);
    
    // Filter records by date
    const timeFilteredRecords = salesRecords.filter(r => {
      const d = new Date(r.created_at);
      return d >= startDate && d <= endDate && r.is_valid !== false && r.is_deleted !== true;
    });

    // Apply residential toggle
    const toggledRecords = applyResidentialToggle(timeFilteredRecords, includeResidential);

    // Aggregate data
    const memberStats = {};
    eligibleMembers.forEach(m => {
      memberStats[m.id] = {
        id: m.id,
        name: m.name,
        is_archived: m.is_archived,
        totalSales: 0,
        count: 0,
        isCurrentUser: memberData?.id === m.id
      };
    });

    toggledRecords.forEach(r => {
      if (memberStats[r.sales_member_id]) {
        memberStats[r.sales_member_id].totalSales += (parseFloat(r.value) || 0);
        memberStats[r.sales_member_id].count += 1;
      }
    });

    // Convert to array, sort by sales, and assign rank
    return Object.values(memberStats)
      .filter(m => m.totalSales > 0 || m.isCurrentUser) // Only show people with sales OR the current user
      .sort((a, b) => b.totalSales - a.totalSales)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  };

  const monthlyLeaderboard = useMemo(() => {
    return generateLeaderboardData(activeMonthStart, activeMonthEnd);
  }, [salesTeam, salesRecords, memberData, activeMonthStart, activeMonthEnd, includeResidential]);

  const quarterlyLeaderboard = useMemo(() => {
    return generateLeaderboardData(activeQuarterStart, activeQuarterEnd);
  }, [salesTeam, salesRecords, memberData, activeQuarterStart, activeQuarterEnd, includeResidential]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <LeaderboardTable 
        title={`Top Vendedores del Mes (${activeMonthLabel})`}
        data={monthlyLeaderboard}
        emptyMessage="No hay ventas registradas para este mes."
      />
      <LeaderboardTable 
        title={`Top Vendedores del Trimestre (${activeQuarterLabel})`}
        data={quarterlyLeaderboard}
        emptyMessage="No hay ventas registradas para este trimestre."
      />
    </div>
  );
};

export default SalesLeaderboard;
