import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, calculateAmountRemaining, calculateRunRateStatus } from '@/lib/salesUtils';

const RadialProgressChart = ({ value, goal, label, colorTheme, period }) => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const val = parseFloat(value) || 0;
  const tar = parseFloat(goal) || 1;
  const percentage = Math.min((val / tar) * 100, 100);
  const rawPercentage = (val / tar) * 100;
  
  const amountRemaining = calculateAmountRemaining(val, tar);
  const status = calculateRunRateStatus(val, tar, period);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isMounted ? circumference - (percentage / 100) * circumference : circumference;

  const isGreen = colorTheme === 'green';
  const strokeColor = isGreen ? 'url(#greenGradient)' : 'url(#purpleGradient)';
  const textColor = isGreen ? 'text-green-600' : 'text-purple-600';
  const badgeBg = isGreen ? 'bg-green-100' : 'bg-purple-100';
  
  const getStatusColor = (s) => {
    if (s === 'Adelantado') return 'text-green-600 bg-green-50 border-green-200';
    if (s === 'En línea') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="flex flex-col items-center w-full group relative">
      <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">{label}</h3>
      
      {/* Tooltip implementation */}
      <div className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white p-3 rounded-lg text-sm z-10 pointer-events-none -translate-y-8 shadow-xl">
        <p className="font-semibold mb-1 border-b border-gray-700 pb-1">{label} Details</p>
        <p>Current: {formatCurrency(val)}</p>
        <p>Goal: {formatCurrency(tar)}</p>
        <p>Progress: {rawPercentage.toFixed(1)}%</p>
        <p>Remaining: {formatCurrency(amountRemaining)}</p>
      </div>

      <div className="relative w-64 h-64 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#7E22CE" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="#F3F4F6"
            strokeWidth="8"
          />
          
          {/* Progress Ring */}
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            filter="url(#glow)"
          />
        </svg>

        {/* Inner Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <span className="text-2xl font-extrabold text-gray-900 leading-tight">
            {formatCurrency(val)}
          </span>
          <span className="text-xs text-gray-500 mt-1 font-medium">
            Meta: {formatCurrency(tar)}
          </span>
          <div className={`mt-2 px-3 py-1 rounded-full ${badgeBg} ${textColor} text-sm font-bold shadow-sm`}>
            {rawPercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Context Below */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-sm text-gray-600 font-medium">
          Faltan: <span className="font-bold text-gray-900">{formatCurrency(amountRemaining)}</span>
        </p>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>
    </div>
  );
};

export default RadialProgressChart;