import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function StarRating({ value, onChange, disabled, className }: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = (hoverValue ?? value) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onMouseLeave={() => !disabled && setHoverValue(null)}
            onClick={() => !disabled && onChange?.(star)}
            className={cn(
              "p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-colors",
              disabled && "cursor-not-allowed opacity-70"
            )}
          >
            <Star
              className={cn(
                "w-6 h-6 transition-all duration-200",
                isFilled 
                  ? "fill-primary text-primary" 
                  : "fill-transparent text-muted-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
