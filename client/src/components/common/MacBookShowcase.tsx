import React, { useState, useEffect } from "react";
import { Logo } from "./Logo";
import { Sparkles, Code2, Users } from "lucide-react";

export const MacBookShowcase: React.FC = () => {
  const [slideIndex, setSlideIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="macbook-container">
      <div className="laptop">
        <div className="screen">
          <div className="header"></div>

          {/* Dynamic MacBook Screen Wallpaper & Content Slider */}
          <div className="flex flex-col items-center justify-center space-y-4 px-6 text-center z-10 w-full">
            {slideIndex === 0 && (
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center space-y-2">
                <Logo size="lg" />
                <p className="text-xs font-mono font-semibold text-cyan-300 tracking-widest uppercase">
                  Live Interactive Classroom
                </p>
              </div>
            )}

            {slideIndex === 1 && (
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5" />
                  <span>Real-Time Mesh</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  COLLAB &amp; LEARN
                </h2>
                <p className="text-xs text-slate-300 max-w-xs">
                  Instant room approvals, live Monaco code sync, and voice streaming.
                </p>
              </div>
            )}

            {slideIndex === 2 && (
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>AI Powered</span>
                </div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-cyan-300 tracking-tight drop-shadow-md">
                  THE FUTURE OF CODING
                </h2>
                <p className="text-xs text-slate-300 max-w-xs">
                  Sub-millisecond Python execution &amp; AI progress analytics.
                </p>
              </div>
            )}

            {/* Screen Slide Dots Indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-4">
              {[0, 1, 2].map((idx) => (
                <span
                  key={idx}
                  onClick={() => setSlideIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    slideIndex === idx ? "w-6 bg-cyan-400" : "w-1.5 bg-slate-600 hover:bg-slate-400"
                  }`}
                ></span>
              ))}
            </div>
          </div>
        </div>
        <div className="keyboard"></div>
      </div>
    </div>
  );
};
