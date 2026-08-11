import { useEffect, useState } from "react";

const STAGES = [
  { icon: "🔎", text: "Scanning GitHub repositories" },
  { icon: "📰", text: "Reading market news signals" },
  { icon: "🛒", text: "Finding top-rated products" },
  { icon: "🧠", text: "Generating AI market report" },
];

function LoadingScreen({ keyword }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="loader">
      <div className="loader-core">
        <div className="loader-orbit">
          <span className="orbit-ring r1"></span>
          <span className="orbit-ring r2"></span>
          <span className="orbit-ring r3"></span>
          <div className="loader-logo">🚀</div>
        </div>

        <div className="loader-title">
          Analyzing <span className="kw">{keyword}</span>
        </div>

        <div className="loader-stages">
          {STAGES.map((s, i) => (
            <div
              key={i}
              className={
                "loader-stage " +
                (i < stage ? "done" : i === stage ? "active" : "")
              }
            >
              <span className="ls-icon">
                {i < stage ? "✓" : s.icon}
              </span>
              <span className="ls-text">{s.text}</span>
              {i === stage && (
                <span className="ls-dots">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="loader-bar">
          <i style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}></i>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
