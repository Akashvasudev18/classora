import React from "react";
import { ConnectionStatus } from "../../services/SocketService";

interface StatusBadgeProps {
  status?: ConnectionStatus;
  isConnected?: boolean;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = "connected",
  isConnected,
  label,
}) => {
  const currentStatus: ConnectionStatus =
    isConnected !== undefined ? (isConnected ? "connected" : "disconnected") : status;

  let dotColor = "bg-emerald-400 animate-pulse";
  let displayLabel = "Connected";

  switch (currentStatus) {
    case "connected":
      dotColor = "bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse";
      displayLabel = "Connected";
      break;
    case "connecting":
      dotColor = "bg-amber-400 animate-ping";
      displayLabel = "Connecting...";
      break;
    case "reconnecting":
      dotColor = "bg-amber-500 animate-pulse";
      displayLabel = "Reconnecting...";
      break;
    case "disconnected":
      dotColor = "bg-rose-500";
      displayLabel = "Disconnected";
      break;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs shadow-inner">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-slate-300 font-medium">{label || displayLabel}</span>
    </div>
  );
};
