import React from "react";

export const BrowserPreviewLoader: React.FC = () => {
  return (
    <div className="uiverse-main-container w-full max-w-4xl mx-auto rounded-3xl overflow-hidden p-2 sm:p-4">
      <svg
        id="browser"
        className="uiverse-loader w-full h-auto max-h-[460px]"
        viewBox="0 0 600 380"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="traceGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="traceGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="traceGradient3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="1" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="traceGradient4" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Background Grid Pattern */}
        <g className="grid">
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={i * 20} x2="600" y2={i * 20} className="grid-line" />
          ))}
          {Array.from({ length: 30 }).map((_, i) => (
            <line key={`v-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="380" className="grid-line" />
          ))}
        </g>

        {/* Outer Browser Frame */}
        <rect className="browser-frame" x="15" y="15" width="570" height="350" rx="14" ry="14" />

        {/* Browser Top Navigation Bar */}
        <path
          className="browser-top"
          d="M 15 29 A 14 14 0 0 1 29 15 L 571 15 A 14 14 0 0 1 585 29 L 585 55 L 15 55 Z"
        />

        {/* Window Dots (Red, Yellow, Green) */}
        <circle cx="38" cy="35" r="5" fill="#f87171" />
        <circle cx="54" cy="35" r="5" fill="#fbbf24" />
        <circle cx="70" cy="35" r="5" fill="#34d399" />

        {/* Browser URL / Status Bar Capsule */}
        <rect x="90" y="24" width="300" height="22" rx="6" ry="6" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />

        {/* JOINING CALL... Status Text Requested by User */}
        <text x="105" y="39" className="loading-text">
          JOINING CALL...
        </text>

        {/* Live Indicator Pulse Dot on Right Bar */}
        <circle cx="555" cy="35" r="4" fill="#38bdf8" />
        <circle cx="555" cy="35" r="8" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.6">
          <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Left Voice / Sidebar Skeleton Panel */}
        <rect className="skeleton" x="35" y="75" width="45" height="270" rx="8" />
        <rect className="skeleton" x="43" y="90" width="29" height="29" rx="6" />
        <rect className="skeleton" x="53" y="130" width="9" height="120" rx="4" />
        <rect className="skeleton" x="43" y="265" width="29" height="29" rx="6" />
        <rect className="skeleton" x="43" y="305" width="29" height="29" rx="6" />

        {/* Center Main Code Editor Workspace Skeleton */}
        <rect className="skeleton" x="95" y="75" width="345" height="270" rx="8" />
        {/* Editor Code Lines */}
        <rect className="skeleton" x="115" y="95" width="180" height="10" />
        <rect className="skeleton" x="115" y="115" width="240" height="10" />
        <rect className="skeleton" x="135" y="135" width="140" height="10" />
        <rect className="skeleton" x="135" y="155" width="200" height="10" />
        <rect className="skeleton" x="115" y="175" width="90" height="10" />

        {/* Split Practice Window / Terminal Skeleton */}
        <rect className="skeleton" x="115" y="210" width="305" height="115" rx="6" />
        <rect className="skeleton" x="130" y="225" width="120" height="8" />
        <rect className="skeleton" x="130" y="240" width="260" height="8" />
        <rect className="skeleton" x="130" y="255" width="180" height="8" />
        <rect className="skeleton" x="130" y="280" width="80" height="24" rx="4" />

        {/* Right Connected Students Sidebar Skeleton */}
        <rect className="skeleton" x="455" y="75" width="115" height="270" rx="8" />
        <rect className="skeleton" x="467" y="90" width="91" height="16" />
        <rect className="skeleton" x="467" y="118" width="91" height="35" rx="6" />
        <rect className="skeleton" x="467" y="160" width="91" height="35" rx="6" />
        <rect className="skeleton" x="467" y="202" width="91" height="35" rx="6" />
        <rect className="skeleton" x="467" y="244" width="91" height="35" rx="6" />

        {/* Animated Flowing Circuit Trace Lines */}
        <g>
          <path className="trace-flow" d="M 43 105 L 115 105 L 115 135 L 275 135" />
          <path className="trace-flow" d="M 455 135 L 355 135 L 355 230 L 130 230" />
          <path className="trace-flow" d="M 130 292 L 420 292 L 420 175 L 467 175" />
          <path className="trace-flow" d="M 43 320 L 95 320 L 95 250 L 455 250" />
        </g>
      </svg>
    </div>
  );
};
