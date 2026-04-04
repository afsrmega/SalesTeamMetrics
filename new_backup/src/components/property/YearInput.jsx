import React from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

const YearInput = ({ value, onChange, min, max, disabled }) => {
  const handleSliderChange = (sliderValue) => {
    onChange(sliderValue[0]);
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      onChange('');
      return;
    }
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  const handleInputBlur = (e) => {
    const numValue = parseInt(e.target.value, 10);
    if (isNaN(numValue) || numValue < min) {
      onChange(min);
    } else if (numValue > max) {
      onChange(max);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <Slider
        value={[value || min]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={1}
        className="w-[60%]"
        disabled={disabled}
      />
      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        min={min}
        max={max}
        className="w-[40%] border-gray-300 focus:border-green-500 focus:ring-green-500"
        disabled={disabled}
      />
    </div>
  );
};

export default YearInput;