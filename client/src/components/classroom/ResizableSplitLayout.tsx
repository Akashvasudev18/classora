import React, { useState, useRef, useCallback, useEffect } from "react";
import { GripVertical } from "lucide-react";

interface ResizableSplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialRatio?: number; // Initial left width percentage (0 to 100), default 50
  minRatio?: number; // Min percentage (default 25)
  maxRatio?: number; // Max percentage (default 75)
}

export const ResizableSplitLayout: React.FC<ResizableSplitLayoutProps> = ({
  left,
  right,
  initialRatio = 50,
  minRatio = 25,
  maxRatio = 75,
}) => {
  const [leftRatio, setLeftRatio] = useState<number>(initialRatio);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = clientX - rect.left;
      const newRatio = (newLeftWidth / rect.width) * 100;

      if (newRatio >= minRatio && newRatio <= maxRatio) {
        setLeftRatio(newRatio);
      }
    },
    [minRatio, maxRatio]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    },
    [isDragging, handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    },
    [isDragging, handleMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col lg:flex-row w-full select-none gap-4 lg:gap-0 relative"
    >
      {/* Left Panel: Teacher Live Broadcast */}
      <div
        style={{ width: `${leftRatio}%` }}
        className="w-full lg:w-auto flex-1 lg:flex-initial min-w-0"
      >
        {left}
      </div>

      {/* Resizable Divider (Visible on Desktop) */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`hidden lg:flex w-3 hover:w-4 group cursor-col-resize items-center justify-center relative z-20 transition-all ${
          isDragging ? "bg-cyan-500/20" : "hover:bg-slate-800/80"
        }`}
        title="Drag to resize split workspace"
      >
        <div className="h-12 w-1.5 rounded-full bg-slate-700 group-hover:bg-cyan-400 group-hover:shadow-lg group-hover:shadow-cyan-500/50 flex items-center justify-center transition-colors">
          <GripVertical className="w-3 h-3 text-slate-950 opacity-70" />
        </div>
      </div>

      {/* Right Panel: Student Practice Workspace */}
      <div
        style={{ width: `${100 - leftRatio}%` }}
        className="w-full lg:w-auto flex-1 lg:flex-initial min-w-0"
      >
        {right}
      </div>
    </div>
  );
};
