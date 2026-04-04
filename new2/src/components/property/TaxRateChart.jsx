import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TaxRateChart = ({ result }) => {
  if (!result) return null;

  const { currentValue2024, proposedValue, difference, estimatedOverpayment } = result;

  // A waterfall chart is created using floating bars. 
  // Each bar is an array [start, end].
  // Overpayment is removed from the chart and displayed separately.
  const data = {
    labels: ['Valor Propuesto', 'Diferencia', 'Valor Actual'],
    datasets: [
      {
        label: 'Valor en Dólares ($)',
        data: [
          [0, proposedValue], // Starts at 0, ends at proposedValue
          [proposedValue, proposedValue + difference], // Starts at proposedValue, ends at currentValue
          [0, currentValue2024], // Full bar for total
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',   // Green for Proposed Value
          'rgba(255, 159, 64, 0.6)',  // Orange for Difference
          'rgba(54, 162, 235, 0.6)',  // Blue for Actual Value
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Desglose de Valor (Gráfico de Cascada)',
        font: {
          size: 18,
          weight: 'bold',
        },
        color: '#334155',
        padding: {
            top: 10,
            bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const raw = context.raw;
            let value;
            if (label === 'Diferencia') {
                value = difference;
            } else if (raw && typeof raw[1] !== 'undefined' && typeof raw[0] !== 'undefined') {
                value = raw[1] - raw[0];
            } else {
                return '';
            }
            return `${label}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  return (
    <div className="mt-4 bg-gray-50 p-4 rounded-lg shadow-inner">
      <div className="h-80">
        <Bar data={data} options={options} />
      </div>
      <div className="mt-6 text-center">
        <p className="text-lg text-gray-700 font-semibold">Sobrepago Estimado:</p>
        <p className="text-4xl font-bold text-red-600 animate-pulse">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimatedOverpayment)}
        </p>
      </div>
    </div>
  );
};

export default TaxRateChart;