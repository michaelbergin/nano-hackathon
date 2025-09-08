"use client";

import { createPortal } from "react-dom";
import { Banana } from "lucide-react";

interface LoadingAnimationProps {
  isGenerating: boolean;
}

export function LoadingAnimation({ isGenerating }: LoadingAnimationProps) {
  if (!isGenerating) return null;

  return (
    <>
      {/* Custom CSS for scaling animations */}
      <style jsx>{`
        @keyframes spinScale {
          0%,
          100% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(90deg) scale(1.2);
          }
          50% {
            transform: rotate(180deg) scale(0.8);
          }
          75% {
            transform: rotate(270deg) scale(1.1);
          }
        }

        @keyframes spinScaleReverse {
          0%,
          100% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(-90deg) scale(1.15);
          }
          50% {
            transform: rotate(-180deg) scale(0.85);
          }
          75% {
            transform: rotate(-270deg) scale(1.05);
          }
        }

        .animate-spin-scale {
          animation: spinScale var(--duration) ease-in-out infinite;
          animation-delay: var(--delay);
        }

        .animate-spin-scale-reverse {
          animation: spinScaleReverse var(--duration) ease-in-out infinite;
          animation-delay: var(--delay);
        }
      `}</style>

      {typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
            <div className="relative w-[320px] h-[320px]">
              {/* Inner ring spinning clockwise with scaling */}
              {Array.from({ length: 12 }).map((_, index) => {
                const angle = (index / 12) * 2 * Math.PI;
                const radius = 80;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const delay = index * 0.1;

                return (
                  <div
                    key={`inner-${index}`}
                    className="absolute w-8 h-8 flex items-center justify-center"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className="animate-spin-scale"
                      style={
                        {
                          "--delay": `${delay}s`,
                          "--duration": "2s",
                        } as React.CSSProperties
                      }
                    >
                      <Banana
                        className="w-6 h-6 text-yellow-400 drop-shadow-lg"
                        style={{
                          filter: "drop-shadow(0 0 4px rgba(255, 255, 0, 0.6))",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Outer ring spinning counter-clockwise with scaling */}
              {Array.from({ length: 16 }).map((_, index) => {
                const angle = (index / 16) * 2 * Math.PI;
                const radius = 120;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const delay = index * 0.08;

                return (
                  <div
                    key={`outer-${index}`}
                    className="absolute w-7 h-7 flex items-center justify-center"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className="animate-spin-scale-reverse"
                      style={
                        {
                          "--delay": `${delay}s`,
                          "--duration": "1.6s",
                        } as React.CSSProperties
                      }
                    >
                      <Banana
                        className="w-5 h-5 text-yellow-300 drop-shadow"
                        style={{
                          filter: "drop-shadow(0 0 3px rgba(255, 255, 0, 0.6))",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Center pulsing banana */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse">
                  <Banana
                    className="w-12 h-12 text-yellow-300 drop-shadow-2xl"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(255, 255, 0, 0.8))",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
