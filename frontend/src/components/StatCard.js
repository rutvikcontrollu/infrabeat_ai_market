import { useCountUp } from "../useAnims";

function StatCard({ label, value, suffix = "", barPct, tone = "blue", delay = 0 }) {
  const count = useCountUp(value, 1100);

  return (
    <div
      className={`stat-card ${tone} reveal-pop`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="label">{label}</div>
      <div className="num">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className={`stat-bar ${tone === "warn" ? "warn" : ""}`}>
        <i style={{ width: `${barPct}%` }}></i>
      </div>
    </div>
  );
}

export default StatCard;
