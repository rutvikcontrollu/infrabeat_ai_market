import { useState, useEffect, useRef } from "react";

/**
 * Animate a number from 0 up to `target` over `duration` ms.
 * Uses an ease-out curve so it decelerates as it lands.
 */
export function useCountUp(target, duration = 1100, deps = []) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const end = Number(target) || 0;
    if (end === 0) {
      setValue(0);
      return;
    }

    let start = null;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const step = (ts) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.round(end * easeOut(p)));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, ...deps]);

  return value;
}

/**
 * Returns a ref + boolean. The boolean flips to true once the element
 * scrolls into view, so you can trigger a reveal animation.
 */
export function useReveal(options = { threshold: 0.15 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, shown];
}
