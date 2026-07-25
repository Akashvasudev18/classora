import React from "react";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  variant?: "blue" | "indigo" | "emerald" | "amber" | "rose";
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = "md",
  variant = "blue",
}) => {
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base font-bold",
  }[size];

  const variantClasses = {
    blue: "bg-blue-600/20 text-blue-400 border-blue-500/30",
    indigo: "bg-indigo-600/20 text-indigo-400 border-indigo-500/30",
    emerald: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-600/20 text-amber-300 border-amber-500/30",
    rose: "bg-rose-600/20 text-rose-400 border-rose-500/30",
  }[variant];

  return (
    <div
      className={`${sizeClasses} ${variantClasses} rounded-full flex items-center justify-center font-bold border shrink-0 shadow-sm`}
    >
      {initial}
    </div>
  );
};
