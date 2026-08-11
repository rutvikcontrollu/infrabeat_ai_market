import { useEffect, useState } from "react";
import { useCountUp } from "../useAnims";

function RingScore({ score }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  const count = useCountUp(pct, 1200);

  const radius = 56;
  const circ = 2 * Math.PI * radius;

  // animate the stroke from empty -> target after mount
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setOffset(circ - (pct / 100) * circ)
    );
    return () => cancelAnimationFrame(id);
  }, [pct, circ]);

  return (
    <div className="ring-wrap">
      <svg width="132" height="132">
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="#11181f"
          strokeWidth="11"
        />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#36a3ff" />
            <stop offset="100%" stopColor="#4fd2c2" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ring-center">
        <span className="num">{count}</span>
        <span className="cap">Opportunity Score</span>
      </div>
    </div>
  );
}

export default RingScore;
