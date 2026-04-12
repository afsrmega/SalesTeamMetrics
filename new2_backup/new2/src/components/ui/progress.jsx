import React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef(({ className, value, indicatorClassName, max = 100, showMarker = false, markerPositionPercent = (100/150)*100, ...props }, ref) => {
  const progressValue = value !== null && value !== undefined ? Math.min(Math.max(value, 0), max) : 0;
  const percentage = max > 0 ? (progressValue / max) * 100 : 0;

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
      value={progressValue} 
      max={max}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
      {showMarker && max > 100 && (
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${markerPositionPercent}%` }}
          title="100% Umbral"
        />
      )}
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };