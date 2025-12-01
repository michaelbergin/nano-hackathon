"use client";

import { useEffect } from "react";

/**
 * Extended TouchEvent interface for Safari scale property
 */
interface SafariTouchEvent extends TouchEvent {
  scale?: number;
}

/**
 * Prevents all browser zoom interactions:
 * - Pinch zoom (Safari gesture events, Chrome touch events)
 * - Keyboard zoom (Ctrl/Cmd + '+', '-', '=', '0')
 * - Two-finger pinch on all touch devices
 */
export function NoZoom(): null {
  useEffect(() => {
    // Track last touch time for double-tap detection
    let lastTouchEnd = 0;

    // Block Safari pinch gestures
    const onGesture = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Block multi-touch events (pinch zoom)
    const onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onTouchMove = (e: TouchEvent): void => {
      const safariEvent = e as SafariTouchEvent;
      if (
        e.touches.length > 1 ||
        (safariEvent.scale !== undefined && safariEvent.scale !== 1)
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent double-tap zoom
    const onTouchEnd = (e: TouchEvent): void => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
        e.stopPropagation();
      }
      lastTouchEnd = now;
    };

    // Safari gesture events
    document.addEventListener("gesturestart", onGesture, { passive: false });
    document.addEventListener("gesturechange", onGesture, { passive: false });
    document.addEventListener("gestureend", onGesture, { passive: false });

    // Touch events for pinch prevention
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });

    // Block ctrl/⌘ + wheel zoom (Chrome/Edge/etc.)
    const onWheel = (e: WheelEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("wheel", onWheel, { passive: false });

    // Block keyboard zoom shortcuts
    const onKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.ctrlKey || e.metaKey; // Ctrl on Win/Linux, Cmd on Mac
      if (!isMod) {
        return;
      }
      const key = e.key;
      if (key === "+" || key === "-" || key === "=" || key === "0") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKeyDown, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", onGesture);
      document.removeEventListener("gesturechange", onGesture);
      document.removeEventListener("gestureend", onGesture);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
