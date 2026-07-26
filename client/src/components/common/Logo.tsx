import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showIcon?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = "md", className = "", showIcon = false }) => {
  const sizeClasses = {
    sm: "text-lg gap-0.5",
    md: "text-2xl gap-0.5",
    lg: "text-4xl gap-1",
    xl: "text-6xl gap-1.5",
  };

  const dotSizes = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-4 w-4",
    xl: "h-6 w-6",
  };

  return (
    <div className={`inline-flex items-center font-extrabold tracking-tight select-none ${sizeClasses[size]} ${className}`}>
      {/* Brand Text: Class<🔴ra> */}
      <span className="bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
        Class
      </span>
      <span className="text-cyan-400 font-mono font-bold">&lt;</span>
      <span className="relative inline-flex items-center justify-center mx-0.5">
        <span className={`animate-ping absolute inline-flex rounded-full bg-rose-400 opacity-80 ${dotSizes[size]}`}></span>
        <span className={`relative inline-flex rounded-full bg-rose-500 shadow-md shadow-rose-500/50 ${dotSizes[size]}`}></span>
      </span>
      <span className="bg-gradient-to-r from-slate-200 via-indigo-200 to-blue-300 bg-clip-text text-transparent">
        ra
      </span>
      <span className="text-cyan-400 font-mono font-bold">&gt;</span>
    </div>
  );
};
