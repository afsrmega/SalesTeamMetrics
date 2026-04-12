
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tags } from 'lucide-react';

const TopTagsMetrics = ({ filteredProspects = [], isLoading }) => {
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const tagMetrics = useMemo(() => {
    const metrics = {};
    
    filteredProspects.forEach(p => {
      const val = Number(p.estimated_property_value || 0);
      const tags = p.prospect_tags?.map(pt => pt.tags).filter(Boolean) || [];
      
      tags.forEach(tag => {
        if (!metrics[tag.id]) {
          metrics[tag.id] = { tag, totalValue: 0, count: 0 };
        }
        metrics[tag.id].totalValue += val;
        metrics[tag.id].count += 1;
      });
    });

    const resultList = Object.values(metrics).map(m => ({
      ...m,
      avgValue: m.totalValue / m.count
    }));

    return resultList;
  }, [filteredProspects]);

  const topByValue = [...tagMetrics].sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);
  const topByCount = [...tagMetrics].sort((a, b) => b.count - a.count).slice(0, 10);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (tagMetrics.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tags className="h-5 w-5 text-custom-primary" /> Top Tags por Valor Estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead className="text-right">Volumen</TableHead>
                <TableHead className="text-right">Prospectos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topByValue.map(m => (
                <TableRow key={m.tag.id}>
                  <TableCell>
                    <Badge style={{backgroundColor: m.tag.color, color: '#fff'}}>{m.tag.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(m.totalValue)}</TableCell>
                  <TableCell className="text-right">{m.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tags className="h-5 w-5 text-custom-secondary" /> Top Tags por Cantidad (#)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead className="text-right">Prospectos</TableHead>
                <TableHead className="text-right">Promedio Est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topByCount.map(m => (
                <TableRow key={m.tag.id}>
                  <TableCell>
                    <Badge style={{backgroundColor: m.tag.color, color: '#fff'}}>{m.tag.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{m.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.avgValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TopTagsMetrics;
