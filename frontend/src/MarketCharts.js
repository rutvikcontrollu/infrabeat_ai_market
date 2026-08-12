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
   4. MARKET HEALTH GAUGE  — clean half-circle
      uses strokeDasharray on a semicircle path
      so each zone is a separate non-overlapping
      segment, and the fill animates via offset.
───────────────────────────────────────────── */
function HealthGauge({ demand, competition, opportunity }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf;
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1200, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [demand, competition, opportunity]);

  const health = Math.round(
    0.4 * opportunity + 0.35 * demand + 0.25 * Math.max(0, 100 - competition)
  );

  // Geometry: semicircle, cx=150 cy=150 r=100
  // We use a <path> for a true half-circle (not a full circle clipped)
  // Arc goes from left (-180°) to right (0°) along the top
  const CX = 150, CY = 150, R = 100;
  // circumference of a full circle; half = half-arc length
  const fullCirc = 2 * Math.PI * R;   // ~628.3
  const halfCirc = Math.PI * R;        // ~314.2

  // strokeDasharray trick on a full circle rotated so only top half shows:
  // dash = halfCirc, gap = halfCirc → draws exactly the top half
  // Then we layer coloured segments on top using offsets within that half

  // Zone boundaries (fraction of halfCirc)
  const dangerEnd  = halfCirc * 0.33;
  const warnEnd    = halfCirc * 0.66;
  const successEnd = halfCirc;

  // Animated fill length
  const fillLen = halfCirc * (health / 100) * progress;

  // Zone color for the fill
  const zoneColor = health < 34 ? C.danger : health < 67 ? C.warn : C.success;

  // Needle angle: -180deg (left) → 0deg (right) mapped to health 0→100
  const needleAngleDeg = -180 + (health / 100) * 180 * progress;
  const needleRad = (needleAngleDeg * Math.PI) / 180;
  const needleLen = R - 12;
  const nx = CX + needleLen * Math.cos(needleRad);
  const ny = CY + needleLen * Math.sin(needleRad);

  // Tick marks at 0, 25, 50, 75, 100
  const ticks = [0, 25, 50, 75, 100].map((v) => {
    const a = ((-180 + (v / 100) * 180) * Math.PI) / 180;
    const inner = R + 6;
    const outer = R + 16;
    return {
      x1: CX + inner * Math.cos(a),
      y1: CY + inner * Math.sin(a),
      x2: CX + outer * Math.cos(a),
      y2: CY + outer * Math.sin(a),
      lx: CX + (outer + 8) * Math.cos(a),
      ly: CY + (outer + 8) * Math.sin(a),
      label: v,
    };
  });

  // The shared circle props for the dash trick
  // transform rotates so dash starts from the left (-180°)
  const circleProps = {
    cx: CX, cy: CY, r: R,
    fill: "none",
    strokeWidth: 20,
    strokeLinecap: "butt",
    transform: `rotate(-180, ${CX}, ${CY})`,
  };

  return (
    <div className="mc-chart-wrap">
      <div className="mc-chart-label">Market Health Score</div>
      <svg viewBox="0 0 300 175" className="mc-gauge-svg">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={C.danger}  stopOpacity="0.9" />
            <stop offset="33%"  stopColor={C.warn}    stopOpacity="0.9" />
            <stop offset="100%" stopColor={C.success} stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* ── Track: grey half-circle ── */}
        <circle
          {...circleProps}
          stroke={C.panel3}
          strokeDasharray={`${halfCirc} ${fullCirc}`}
        />

        {/* ── Zone bands (danger / warn / success) ── */}
        {/* danger: 0 → 33% */}
        <circle
          {...circleProps}
          stroke={`${C.danger}35`}
          strokeDasharray={`${dangerEnd} ${fullCirc}`}
        />
        {/* warn: 33% → 66% — offset by dangerEnd to start where danger ends */}
        <circle
          {...circleProps}
          stroke={`${C.warn}30`}
          strokeDasharray={`${warnEnd - dangerEnd} ${fullCirc}`}
          strokeDashoffset={-dangerEnd}
        />
        {/* success: 66% → 100% */}
        <circle
          {...circleProps}
          stroke={`${C.success}25`}
          strokeDasharray={`${successEnd - warnEnd} ${fullCirc}`}
          strokeDashoffset={-warnEnd}
        />

        {/* ── Animated fill arc ── */}
        <circle
          {...circleProps}
          stroke={zoneColor}
          strokeWidth={20}
          strokeDasharray={`${Math.max(fillLen, 0)} ${fullCirc}`}
          opacity={0.95}
        />

        {/* ── Tick marks ── */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={C.faint} strokeWidth={1.5} />
            <text x={t.lx} y={t.ly} textAnchor="middle" dominantBaseline="middle"
              fill={C.faint} fontSize={7.5} fontFamily="Inter, sans-serif">
              {t.label}
            </text>
          </g>
        ))}

        {/* ── Needle ── */}
        <line x1={CX} y1={CY} x2={nx} y2={ny}
          stroke={C.text} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={7} fill={C.text} />
        <circle cx={CX} cy={CY} r={3.5} fill={C.panel2} />

        {/* ── Score text ── */}
        <text x={CX} y={CY - 28} textAnchor="middle"
          fill={zoneColor} fontSize={32} fontWeight={700}
          fontFamily="Space Grotesk, Inter, sans-serif">
          {Math.round(health * progress)}
        </text>
        <text x={CX} y={CY - 10} textAnchor="middle"
          fill={C.faint} fontSize={9} fontFamily="Inter, sans-serif">
          / 100
        </text>

        {/* ── Zone labels ── */}
        <text x={38} y={158} fill={C.danger} fontSize={8.5}
          fontFamily="Inter, sans-serif" fontWeight={600} textAnchor="middle">Low</text>
        <text x={CX} y={165} fill={C.warn} fontSize={8.5}
          fontFamily="Inter, sans-serif" fontWeight={600} textAnchor="middle">Medium</text>
        <text x={262} y={158} fill={C.success} fontSize={8.5}
          fontFamily="Inter, sans-serif" fontWeight={600} textAnchor="middle">High</text>
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
