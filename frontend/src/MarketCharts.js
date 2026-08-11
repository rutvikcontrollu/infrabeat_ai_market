import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────
   Palette (matches App.css :root)
───────────────────────────────────────────── */
const C = {
  accent:  "#36a3ff",
  teal:    "#4fd2c2",
  cyan:    "#37c6e0",
  success: "#34d399",
  warn:    "#f5b54b",
  danger:  "#f87171",
  text:    "#eef3f8",
  dim:     "#93a1b0",
  faint:   "#5b6775",
  panel:   "#121821",
  panel2:  "#161d27",
  panel3:  "#1b2430",
  border:  "#1f2935",
};

/* ─────────────────────────────────────────────
   1. RADAR CHART  — scores overview
      demand / competition / opportunity / trend
───────────────────────────────────────────── */
function RadarChart({ demand, competition, opportunity, trendScore }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf;
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 900, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [demand, competition, opportunity, trendScore]);

  const CX = 130, CY = 130, R = 95;
  const axes = [
    { label: "Demand",      value: demand,      angle: -90 },
    { label: "Competition", value: competition, angle: -90 + 90 },
    { label: "Opportunity", value: opportunity, angle: -90 + 180 },
    { label: "Trend",       value: trendScore ?? 50, angle: -90 + 270 },
  ];

  const toXY = (angle, r) => {
    const rad = (angle * Math.PI) / 180;
    return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
  };

  // grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((f) => {
    const pts = axes.map((a) => toXY(a.angle, R * f).join(",")).join(" ");
    return pts;
  });

  // data polygon (animated)
  const dataPts = axes.map((a) => {
    const r = (a.value / 100) * R * progress;
    return toXY(a.angle, r).join(",");
  }).join(" ");

  const colors = [C.accent, C.warn, C.teal, C.cyan];

  return (
    <div className="mc-chart-wrap">
      <div className="mc-chart-label">Score Radar</div>
      <svg viewBox="0 0 260 260" className="mc-radar-svg">
        {/* grid rings */}
        {rings.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke={C.border}
            strokeWidth={i === 3 ? 1.5 : 0.8}
          />
        ))}
        {/* axis lines */}
        {axes.map((a, i) => {
          const [x, y] = toXY(a.angle, R);
          return (
            <line
              key={i}
              x1={CX} y1={CY}
              x2={x} y2={y}
              stroke={C.border}
              strokeWidth={0.8}
            />
          );
        })}
        {/* data fill */}
        <polygon
          points={dataPts}
          fill={`${C.accent}22`}
          stroke={C.accent}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* dots + tooltips */}
        {axes.map((a, i) => {
          const r = (a.value / 100) * R * progress;
          const [x, y] = toXY(a.angle, r);
          return (
            <circle key={i} cx={x} cy={y} r={4} fill={colors[i]} />
          );
        })}
        {/* axis labels */}
        {axes.map((a, i) => {
          const [x, y] = toXY(a.angle, R + 18);
          return (
            <text
              key={i}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={C.dim}
              fontSize={9.5}
              fontFamily="Inter, sans-serif"
            >
              {a.label}
            </text>
          );
        })}
        {/* center score */}
        <text
          x={CX} y={CY - 8}
          textAnchor="middle"
          fill={C.teal}
          fontSize={22}
          fontWeight={700}
          fontFamily="Space Grotesk, Inter, sans-serif"
        >
          {Math.round(opportunity * progress)}
        </text>
        <text
          x={CX} y={CY + 10}
          textAnchor="middle"
          fill={C.faint}
          fontSize={8}
          fontFamily="Inter, sans-serif"
        >
          OPP SCORE
        </text>
      </svg>
      {/* legend */}
      <div className="mc-radar-legend">
        {axes.map((a, i) => (
          <div key={i} className="mc-legend-row">
            <span className="mc-legend-dot" style={{ background: colors[i] }} />
            <span className="mc-legend-name">{a.label}</span>
            <span className="mc-legend-val">{a.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   2. DEMAND BREAKDOWN  — animated horizontal bars
───────────────────────────────────────────── */
function DemandBreakdown({ breakdown }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf;
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [breakdown]);

  const bars = [
    { label: "Repo Activity",    value: breakdown?.repo_demand    ?? 0, color: C.accent },
    { label: "News Coverage",    value: breakdown?.news_demand    ?? 0, color: C.cyan },
    { label: "Star Power",       value: breakdown?.star_demand    ?? 0, color: C.teal },
    { label: "Breadth",          value: breakdown?.breadth        ?? 0, color: C.success },
    { label: "Dominance",        value: breakdown?.dominance      ?? 0, color: C.warn },
  ];

  const W = 220;

  return (
    <div className="mc-chart-wrap">
      <div className="mc-chart-label">Demand Breakdown</div>
      <svg viewBox={`0 0 ${W + 80} ${bars.length * 36 + 20}`} className="mc-bars-svg">
        {bars.map((b, i) => {
          const y = i * 36 + 10;
          const barW = (b.value / 100) * W * progress;
          return (
            <g key={i}>
              {/* track */}
              <rect x={80} y={y + 7} width={W} height={14} rx={7} fill={C.panel3} />
              {/* fill */}
              <rect
                x={80} y={y + 7}
                width={Math.max(barW, 0)}
                height={14}
                rx={7}
                fill={b.color}
                opacity={0.85}
              />
              {/* label */}
              <text
                x={75} y={y + 17}
                textAnchor="end"
                fill={C.dim}
                fontSize={9.5}
                fontFamily="Inter, sans-serif"
              >
                {b.label}
              </text>
              {/* value */}
              <text
                x={85 + Math.max(barW, 0)}
                y={y + 17}
                fill={C.text}
                fontSize={9}
                fontWeight={700}
                fontFamily="Inter, sans-serif"
              >
                {Math.round(b.value * progress)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   3. GITHUB STARS  — animated vertical bar chart
───────────────────────────────────────────── */
function StarsChart({ projects }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf;
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1100, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [projects]);

  if (!projects?.length) return null;

  const top = projects.slice(0, 5);
  const maxStars = Math.max(...top.map((p) => p.stars), 1);
  const CHART_H = 120;
  const barW = 32;
  const gap = 14;
  const totalW = top.length * (barW + gap) - gap + 60;
  const gradColors = [C.accent, C.teal, C.cyan, C.success, C.warn];

  return (
    <div className="mc-chart-wrap">
      <div className="mc-chart-label">GitHub Stars — Top Projects</div>
      <svg viewBox={`0 0 ${totalW} ${CHART_H + 52}`} className="mc-stars-svg">
        <defs>
          {top.map((_, i) => (
            <linearGradient key={i} id={`sg${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradColors[i]} stopOpacity="0.95" />
              <stop offset="100%" stopColor={gradColors[i]} stopOpacity="0.35" />
            </linearGradient>
          ))}
        </defs>
        {top.map((p, i) => {
          const x = 30 + i * (barW + gap);
          const ratio = p.stars / maxStars;
          const fullH = ratio * CHART_H;
          const h = fullH * progress;
          const y = CHART_H - h + 10;

          // truncate name
          const name = p.name.length > 10 ? p.name.slice(0, 9) + "…" : p.name;

          return (
            <g key={i}>
              {/* bar */}
              <rect
                x={x} y={y}
                width={barW} height={Math.max(h, 2)}
                rx={6}
                fill={`url(#sg${i})`}
              />
              {/* star count above bar */}
              {progress > 0.6 && (
                <text
                  x={x + barW / 2} y={y - 4}
                  textAnchor="middle"
                  fill={gradColors[i]}
                  fontSize={8}
                  fontWeight={700}
                  fontFamily="Inter, sans-serif"
                >
                  {p.stars >= 1000
                    ? `${(p.stars / 1000).toFixed(1)}k`
                    : p.stars}
                </text>
              )}
              {/* repo name label */}
              <text
                x={x + barW / 2}
                y={CHART_H + 22}
                textAnchor="middle"
                fill={C.dim}
                fontSize={8.5}
                fontFamily="Inter, sans-serif"
              >
                {name}
              </text>
            </g>
          );
        })}
        {/* baseline */}
        <line
          x1={24} y1={CHART_H + 10}
          x2={totalW - 4} y2={CHART_H + 10}
          stroke={C.border}
          strokeWidth={1}
        />
        {/* ⭐ label */}
        <text x={24} y={8} fill={C.faint} fontSize={8} fontFamily="Inter, sans-serif">⭐ Stars</text>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   4. MARKET HEALTH GAUGE  — speedometer arc
───────────────────────────────────────────── */
function HealthGauge({ demand, competition, opportunity }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf;
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [demand, competition, opportunity]);

  // health score: high demand + low competition + high opportunity
  const health = Math.round(
    0.4 * opportunity + 0.35 * demand + 0.25 * Math.max(0, 100 - competition)
  );

  const CX = 130, CY = 125, R = 90;
  const totalDeg = 180;
  const currentDeg = (health / 100) * totalDeg * progress;

  const polarToXY = (deg, r) => {
    const rad = ((180 - deg) * Math.PI) / 180; // flip so 0=left, 180=right
    return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)];
  };

  // SVG arc helper
  const arc = (deg, r) => {
    const [sx, sy] = polarToXY(0, r);
    const [ex, ey] = polarToXY(deg, r);
    const largeArc = deg > 90 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey}`;
  };

  // zones: 0-33 danger, 34-66 warn, 67-100 success
  const zoneColor =
    health < 34 ? C.danger : health < 67 ? C.warn : C.success;

  // needle
  const needleDeg = currentDeg;
  const [nx, ny] = polarToXY(needleDeg, R - 18);

  const labels = [
    { deg: 0,   text: "0" },
    { deg: 45,  text: "25" },
    { deg: 90,  text: "50" },
    { deg: 135, text: "75" },
    { deg: 180, text: "100" },
  ];

  return (
    <div className="mc-chart-wrap">
      <div className="mc-chart-label">Market Health Score</div>
      <svg viewBox="0 0 260 160" className="mc-gauge-svg">
        {/* background track */}
        <path
          d={arc(180, R)}
          fill="none"
          stroke={C.panel3}
          strokeWidth={18}
          strokeLinecap="round"
        />
        {/* danger zone 0-33% */}
        <path
          d={arc(Math.min(180 * 0.33, 180), R)}
          fill="none"
          stroke={`${C.danger}40`}
          strokeWidth={18}
          strokeLinecap="round"
        />
        {/* warn zone 33-66% */}
        <path
          d={arc(Math.min(180 * 0.66, 180), R)}
          fill="none"
          stroke={`${C.warn}30`}
          strokeWidth={18}
          strokeLinecap="round"
        />
        {/* success zone 66-100% */}
        <path
          d={arc(180, R)}
          fill="none"
          stroke={`${C.success}20`}
          strokeWidth={18}
          strokeLinecap="round"
        />
        {/* active fill */}
        <path
          d={arc(Math.max(currentDeg, 1), R)}
          fill="none"
          stroke={zoneColor}
          strokeWidth={18}
          strokeLinecap="round"
          opacity={0.9}
        />
        {/* needle */}
        <line
          x1={CX} y1={CY}
          x2={nx} y2={ny}
          stroke={C.text}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={6} fill={C.text} />
        <circle cx={CX} cy={CY} r={3} fill={C.panel} />

        {/* tick labels */}
        {labels.map((l, i) => {
          const [lx, ly] = polarToXY(l.deg, R + 16);
          return (
            <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fill={C.faint} fontSize={8} fontFamily="Inter, sans-serif">
              {l.text}
            </text>
          );
        })}

        {/* center value */}
        <text x={CX} y={CY - 22} textAnchor="middle"
          fill={zoneColor} fontSize={28} fontWeight={700}
          fontFamily="Space Grotesk, Inter, sans-serif">
          {Math.round(health * progress)}
        </text>
        <text x={CX} y={CY - 6} textAnchor="middle"
          fill={C.faint} fontSize={8} fontFamily="Inter, sans-serif">
          /100
        </text>

        {/* zone labels */}
        <text x={30} y={145} fill={C.danger} fontSize={8} fontFamily="Inter, sans-serif" textAnchor="middle">Low</text>
        <text x={130} y={148} fill={C.warn} fontSize={8} fontFamily="Inter, sans-serif" textAnchor="middle">Medium</text>
        <text x={230} y={145} fill={C.success} fontSize={8} fontFamily="Inter, sans-serif" textAnchor="middle">High</text>
      </svg>

      {/* sub-metrics row */}
      <div className="mc-gauge-meta">
        <div className="mc-gm-item">
          <span style={{ color: C.accent }}>{demand}</span>
          <span>Demand</span>
        </div>
        <div className="mc-gm-divider" />
        <div className="mc-gm-item">
          <span style={{ color: C.warn }}>{competition}</span>
          <span>Competition</span>
        </div>
        <div className="mc-gm-divider" />
        <div className="mc-gm-item">
          <span style={{ color: C.teal }}>{opportunity}</span>
          <span>Opportunity</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT EXPORT — MarketCharts
───────────────────────────────────────────── */
export default function MarketCharts({ result }) {
  if (!result) return null;

  const { demand_score, competition_score, opportunity_score, breakdown, top_projects, trend } = result;
  const trendScore = trend?.trend_score ?? null;

  return (
    <div className="mc-root">
      <div className="section-head reveal-up">📊 Market Intelligence Charts</div>
      <div className="mc-grid">
        <RadarChart
          demand={demand_score}
          competition={competition_score}
          opportunity={opportunity_score}
          trendScore={trendScore}
        />
        <HealthGauge
          demand={demand_score}
          competition={competition_score}
          opportunity={opportunity_score}
        />
        <DemandBreakdown breakdown={breakdown} />
        {top_projects?.length > 0 && (
          <StarsChart projects={top_projects} />
        )}
      </div>
    </div>
  );
}

