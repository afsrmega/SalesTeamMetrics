import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import { formatM } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STAGES = [
  {
    id: 'all',
    name: 'All Prospects',
    min: 0,
    max: 10,
    gradient: 'from-cyan-400 to-blue-500',
    glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]',
    width: 'w-full',
  },
  {
    id: 'cold',
    name: 'Cold (1-4)',
    min: 1,
    max: 4,
    gradient: 'from-blue-500 to-indigo-500',
    glow: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]',
    width: 'w-11/12',
  },
  {
    id: 'warm',
    name: 'Warm (5-7)',
    min: 5,
    max: 7,
    gradient: 'from-purple-500 to-pink-500',
    glow: 'hover:shadow-[0_0_20px_rgba(236,72,153,0.6)]',
    width: 'w-5/6',
  },
  {
    id: 'hot',
    name: 'Hot (8-10)',
    min: 8,
    max: 10,
    gradient: 'from-pink-500 to-red-500',
    glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]',
    width: 'w-3/4',
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const ProspectsFunnel = ({ filteredProspects = [], onQuickFilter, activeQuickFilter }) => {
  const [mode, setMode] = useState('value'); // 'value' or 'count'

  const funnelData = useMemo(() => {
    const data = STAGES.map(stage => ({ ...stage, count: 0, totalValue: 0 }));

    if (!filteredProspects || filteredProspects.length === 0) {
      return data.map(d => ({ ...d, avgValue: 0, percentage: 0 }));
    }

    filteredProspects.forEach(p => {
      const q = p.qualification || 0;
      const val = Number(p.estimated_property_value || 0);

      // All prospects
      data[0].count += 1;
      data[0].totalValue += val;

      // Specific stages
      if (q >= 1 && q <= 4) {
        data[1].count += 1;
        data[1].totalValue += val;
      } else if (q >= 5 && q <= 7) {
        data[2].count += 1;
        data[2].totalValue += val;
      } else if (q >= 8 && q <= 10) {
        data[3].count += 1;
        data[3].totalValue += val;
      }
    });

    const totalAllCount = data[0].count || 1; // prevent div by zero
    const totalAllValue = data[0].totalValue || 1;

    return data.map(d => ({
      ...d,
      avgValue: d.count > 0 ? d.totalValue / d.count : 0,
      percentage: mode === 'count' 
        ? Math.round((d.count / totalAllCount) * 100)
        : Math.round((d.totalValue / totalAllValue) * 100)
    }));
  }, [filteredProspects, mode]);

  const handleStageClick = (stage) => {
    if (!onQuickFilter) return;
    if (activeQuickFilter?.id === stage.id) {
      onQuickFilter(null);
    } else {
      onQuickFilter(stage);
    }
  };

  return (
    <Card className="bg-slate-950 text-slate-50 border-slate-800 overflow-hidden relative">
      <CardHeader className="pb-2 border-b border-slate-800/50">
        <div className="flex justify-between items-center relative z-10">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <Filter className="h-5 w-5 text-cyan-400" /> Neon Funnel
          </CardTitle>
          <div className="flex bg-slate-900 rounded-md p-1 border border-slate-800">
            <button
              onClick={() => setMode('value')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-sm transition-all duration-300",
                mode === 'value' ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Valor ($)
            </button>
            <button
              onClick={() => setMode('count')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-sm transition-all duration-300",
                mode === 'count' ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Cantidad
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8 pb-10 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950/0 to-slate-950/0 pointer-events-none" />
        
        <TooltipProvider>
          <motion.div 
            className="flex flex-col items-center gap-2 max-w-2xl mx-auto relative z-10"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {funnelData.map((stage, i) => {
              const isActive = activeQuickFilter?.id === stage.id;
              const isFaded = activeQuickFilter && !isActive;

              return (
                <Tooltip key={stage.id} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <motion.div
                      variants={itemVariants}
                      onClick={() => handleStageClick(stage)}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "relative cursor-pointer transition-all duration-300 group",
                        stage.width,
                        isFaded ? "opacity-30 grayscale-[50%]" : "opacity-100",
                        isActive && "scale-[1.02] z-10"
                      )}
                      style={{ height: '60px' }}
                    >
                      <div 
                        className={cn(
                          "absolute inset-0 bg-gradient-to-r transition-all duration-300",
                          stage.gradient,
                          stage.glow,
                          isActive && "shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                        )}
                        style={{
                          clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)',
                          transform: `perspective(100px) rotateX(${i === 0 ? 0 : -5}deg)`,
                          transformOrigin: 'top center'
                        }}
                      />
                      
                      <div className="absolute inset-0 flex items-center justify-between px-6 sm:px-12 text-white font-bold drop-shadow-md z-10">
                        <div className="w-1/3 text-left truncate text-sm sm:text-base">
                          {stage.name}
                        </div>
                        <div className="w-1/3 text-center text-lg sm:text-xl tracking-wider">
                          {mode === 'value' ? `$${formatM(stage.totalValue)}` : stage.count}
                        </div>
                        <div className="w-1/3 text-right text-sm sm:text-base text-white/90">
                          {stage.percentage}%
                        </div>
                      </div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 border-slate-700 text-slate-100 shadow-xl p-4">
                    <div className="font-bold text-base mb-2 border-b border-slate-700 pb-2">{stage.name}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Prospectos:</span>
                        <span className="font-medium">{stage.count}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Valor Total:</span>
                        <span className="font-medium">${stage.totalValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Promedio:</span>
                        <span className="font-medium">${Math.round(stage.avgValue).toLocaleString()}</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </motion.div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default ProspectsFunnel;