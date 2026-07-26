import React, { useState, useEffect, useRef } from "react";
import { Logo } from "./Logo";
import { Sparkles, Code2, Users } from "lucide-react";

export const MacBookShowcase: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetProgress = useRef<number>(0);
  const currentProgress = useRef<number>(0);
  const [smoothProgress, setSmoothProgress] = useState<number>(0);
  const [slideIndex, setSlideIndex] = useState<number>(0);

  useEffect(() => {
    let animFrameId: number;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      // Expanded scroll range for gradual, luxurious motion:
      // Starts opening/zooming when element top reaches 115% window height
      // Reaches full open & zoomed-in state when element top reaches 20% window height
      const startPoint = windowHeight * 1.15;
      const endPoint = windowHeight * 0.20;

      const current = rect.top;
      const raw = (startPoint - current) / (startPoint - endPoint);
      targetProgress.current = Math.min(1, Math.max(0, raw));
    };

    // Smooth Lerp Physics loop (Linear Interpolation for Apple-grade fluid momentum)
    const updateLerp = () => {
      const diff = targetProgress.current - currentProgress.current;
      currentProgress.current += diff * 0.075; // 0.075 dampening factor for ultra-smooth gliding

      setSmoothProgress(currentProgress.current);
      animFrameId = requestAnimationFrame(updateLerp);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    animFrameId = requestAnimationFrame(updateLerp);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % 3);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Compute rotateX angle: -88.5deg (closed flat) -> 0deg (open upright)
  const rotateX = -88.5 + smoothProgress * 88.5;

  // Compute dramatic scale zoom: 0.55 (compact / zoomed out) -> 1.25 (prominent / zoomed in)
  const scale = 0.55 + smoothProgress * 0.70;

  // Compute perspective: 2200px down to 1000px
  const perspective = 2200 - smoothProgress * 1200;

  return (
    <div ref={containerRef} className="macbook-container py-12 overflow-hidden w-full flex justify-center min-h-[500px]">
      <div
        className="laptop-wrapper"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <div className="laptop">
          <div
            className="screen-scrollable"
            style={{
              transform: `perspective(${perspective}px) rotateX(${rotateX}deg)`,
              willChange: "transform",
            }}
          >
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
    </div>
  );
};
