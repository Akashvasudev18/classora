import React from "react";

interface StatusBadgeProps {
  isConnected: boolean;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isConnected,
  label,
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs shadow-inner">
      <span
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
        }`}
      />
      <span className="text-slate-300 font-medium">
        {label || (isConnected ? "Server Connected" : "Connecting...")}
      </span>
    </div>
  );
};
