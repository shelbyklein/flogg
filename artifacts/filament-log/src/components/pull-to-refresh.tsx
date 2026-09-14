import { useRef, useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 70;
const MAX_PULL = 100;

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, disabled }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 2 || isRefreshingRef.current) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || isRefreshingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        pullingRef.current = false;
        return;
      }
      if (dy > 8) e.preventDefault();
      const damped = Math.min(dy * 0.5, MAX_PULL);
      pullDistanceRef.current = damped;
      setPullDistance(damped);
    };

    const handleTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      const dist = pullDistanceRef.current;

      if (dist >= THRESHOLD * 0.55) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        pullDistanceRef.current = 54;
        setPullDistance(54);
        try {
          await onRefreshRef.current();
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled]);

  const isPulling = pullingRef.current;
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  // Indicator top position: slides in from -48px (hidden) to 8px (visible)
  const indicatorTop = -48 + pullDistance * 0.56;

  return (
    <>
      {/* Pull indicator — fixed, slides in from above */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: Math.min(indicatorTop, 12),
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 200,
          opacity: isRefreshing ? 1 : progress,
          transition: isPulling
            ? "none"
            : "top 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s",
          pointerEvents: "none",
        }}
      >
        <div className="bg-card border border-border shadow-md rounded-full p-2.5">
          <RefreshCw
            className={cn("w-4 h-4 text-primary", isRefreshing && "animate-spin")}
            style={{
              transform: isRefreshing ? undefined : `rotate(${progress * 270}deg)`,
              transition: isRefreshing ? "none" : undefined,
            }}
          />
        </div>
      </div>

      {children}
    </>
  );
}
