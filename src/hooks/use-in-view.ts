import { useEffect, useRef, useState } from "react";

export type InViewOptions = {
  /** Fraction of the section that must be visible (0.2 = 20%). */
  threshold?: number;
  /** Shrinks the viewport so a section must truly enter it (-60px at the bottom). */
  rootMargin?: string;
  /** Short settle window (ms) so a fast scroll does not start a scene the visitor misses. */
  settleMs?: number;
  /** Keep it "in view" after the first entry instead of pausing again on exit. */
  once?: boolean;
};

/**
 * Tracks whether a section is on screen. Loops and timers should run only while
 * `inView` is true, so nothing is animated (or measured) off screen.
 *
 * The observer is disconnected on unmount to avoid leaked listeners.
 */
export function useInView<T extends Element = HTMLElement>(options: InViewOptions = {}) {
  const {
    threshold = 0.2,
    rootMargin = "0px 0px -60px 0px",
    settleMs = 0,
    once = false,
  } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Older browsers (and tests) without IntersectionObserver: show everything.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          if (visible) return;
          visible = true;
          // Entry is immediate by default; at most a short settle window.
          if (settleMs > 0) {
            settleTimer = setTimeout(() => setInView(true), settleMs);
          } else {
            setInView(true);
          }
          return;
        }

        // Not intersecting: cancel a pending start and pause the section.
        if (settleTimer) {
          clearTimeout(settleTimer);
          settleTimer = undefined;
        }
        if (!visible) return;
        visible = false;
        if (!once) setInView(false);
      },
      { threshold, rootMargin },
    );

    observer.observe(node);

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      observer.disconnect();
    };
  }, [threshold, rootMargin, settleMs, once]);

  return { ref, inView };
}

/**
 * Soft 500ms entrance (fade + small rise) that is skipped entirely for visitors
 * who ask for reduced motion.
 */
export function revealClasses(inView: boolean, extra = ""): string {
  return [
    "motion-safe:transition-[opacity,transform] motion-safe:duration-500 motion-safe:ease-out",
    inView
      ? "motion-safe:translate-y-0 motion-safe:opacity-100"
      : "motion-safe:translate-y-3 motion-safe:opacity-0",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}
