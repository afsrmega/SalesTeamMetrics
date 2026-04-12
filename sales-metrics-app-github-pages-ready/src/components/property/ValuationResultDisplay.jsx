import React from 'react';

const ValuationResultDisplay = ({ result }) => {
  if (!result) return null;

  const displayData = [
    { label: `Value in ${result.initial_year}:`, value: `$${parseFloat(result.initial_value).toLocaleString()}` },
    { label: `Value in ${result.current_year}:`, value: `$${parseFloat(result.current_value).toLocaleString()}` },
    { label: "Total Increase:", value: `$${parseFloat(result.value_difference).toLocaleString()}`, color: "text-emerald-600" },
    { label: "Period:", value: `${result.year_difference} years` },
    { label: "Percentage Increase:", value: `${parseFloat(result.percentage_increase).toFixed(2)}%`, color: "text-green-700 font-bold" },
    { label: "Avg. Annual Appreciation:", value: `${parseFloat(result.annual_appreciation).toFixed(2)}%`, color: "text-teal-700 font-bold" },
  ];

  return (
    <div className="space-y-3">
      {displayData.map(item => (
        <div key={item.label} className="flex justify-between items-center text-sm">
          <span className="text-gray-600">{item.label}</span>
          <span className={`font-medium ${item.color || 'text-gray-900'}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export default ValuationResultDisplay;