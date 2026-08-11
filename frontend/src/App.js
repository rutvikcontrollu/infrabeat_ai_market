import { useState, useEffect } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";
import { generatePDF } from "./pdfReport";

import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import StatCard from "./components/StatCard";
import RingScore from "./components/RingScore";
import LoadingScreen from "./components/LoadingScreen";
import MarketCharts from "./MarketCharts";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [activeKeyword, setActiveKeyword] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [topSearch, setTopSearch] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("history");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("history", JSON.stringify(history));
  }, [history]);

  const runAnalysis = async (term) => {
    const q = (term ?? keyword).trim();
    if (!q) return;

    const startedAt = Date.now();
    try {
      setLoading(true);
      setTyping(true);
      setActiveKeyword(q);
      setResult(null);
      setError("");
      setShowFull(false);

      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: q }),
      });

      const data = await response.json();

      // server returned an error (rate limit, bad input, etc.)
      if (!response.ok || data.error) {
        const msg =
          data.error ||
          (response.status === 429
            ? "Too many requests — please wait a moment."
            : "Something went wrong. Please try again.");
        const elapsed = Date.now() - startedAt;
        setTimeout(() => {
          setError(msg);
          setTyping(false);
        }, Math.max(800 - elapsed, 0));
        return;
      }

      setHistory((prev) =>
        prev.includes(q) ? prev : [q, ...prev].slice(0, 30)
      );

      // keep the loading screen up for a minimum of 2.2s so it feels intentional
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(2200 - elapsed, 400);
      setTimeout(() => {
        setResult(data);
        setTyping(false);
      }, wait);
    } catch (err) {
      console.error(err);
      setError(
        "Couldn't reach the server. Make sure the backend is running, then try again."
      );
      setTyping(false);
    } finally {
      setLoading(false);
    }
  };

  const analyzeKeyword = () => runAnalysis();

  const onHistoryClick = (term) => {
    setKeyword(term);
    runAnalysis(term);
  };

  const deleteHistoryItem = (term) => {
    setHistory((prev) => prev.filter((t) => t !== term));
  };

  const clearAllHistory = () => {
    if (window.confirm("Clear all search history?")) setHistory([]);
  };

  const newChat = () => {
    setKeyword("");
    setResult(null);
    setTyping(false);
    setShowFull(false);
  };

  const downloadPDF = () => {
    if (!result?.ai_report) return;
    generatePDF(result);
  };

  const verdictMeta = (v) => {
    if (!v) return { cls: "good", sub: "" };
    if (v.includes("EXCELLENT"))
      return {
        cls: "excellent",
        sub: "Strong demand with room for new entrants.",
      };
    if (v.includes("GOOD"))
      return {
        cls: "good",
        sub: "Stable demand with moderate innovation saturation.",
      };
    if (v.includes("DECLINING"))
      return {
        cls: "declining",
        sub: "Search interest is falling — demand is shrinking over time.",
      };
    if (v.includes("LOW DEMAND"))
      return {
        cls: "low",
        sub: "Limited interest signals — the market may be too small.",
      };
    return {
      cls: "high",
      sub: "Crowded market — differentiation will be key.",
    };
  };

  const getSummary = (report) => {
    if (!report) return "";
    const lines = report.split("\n");
    const buf = [];
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("#")) {
        if (buf.length) break;
        continue;
      }
      if (t) buf.push(t);
      else if (buf.length) break;
    }
    const text = buf.join(" ").replace(/[*_`>#-]/g, "").trim();
    return text || report.slice(0, 280);
  };

  // Extract a named ## section from the AI report
  const getSection = (report, heading) => {
    if (!report) return "";
    const pattern = new RegExp(
      `##\\s*${heading}[^\n]*\n([\\s\\S]*?)(?=\n##|$)`,
      "i"
    );
    const match = report.match(pattern);
    if (!match) return "";
    return match[1]
      .split("\n")
      .map((l) => l.replace(/^\s*[-*]\s+/, "• ").trim())
      .filter(Boolean)
      .join("\n");
  };

  const meta = verdictMeta(result?.verdict);

  return (
    <div className={`app-layout ${sidebarOpen ? "" : "sidebar-hidden"}`}>
      <Sidebar
        history={history}
        onNewChat={newChat}
        onHistoryClick={onHistoryClick}
        onDeleteItem={deleteHistoryItem}
        onClearAll={clearAllHistory}
      />

      <main className="main-content">
        <div className="topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen((s) => !s)}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <div className="topbar-title">
            {result ? "Analysis Report" : "InfraBeat"}
          </div>
          <div className="topbar-spacer"></div>
          <div className="topbar-search">
            <span className="ts-icon">🔍</span>
            <input
              type="text"
              placeholder="Search insights..."
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && topSearch.trim()) {
                  setKeyword(topSearch);
                  runAnalysis(topSearch);
                  setTopSearch("");
                }
              }}
            />
          </div>
          <button className="icon-btn" title="Settings">⚙</button>
          <button className="avatar-btn" title="Account">IB</button>
        </div>

        <div className="scroll-body">
          {typing && <LoadingScreen keyword={activeKeyword} />}

          {error && !typing && (
            <div className="error-card reveal-up">
              <div className="error-icon">⚠</div>
              <div className="error-text">{error}</div>
              <button
                className="error-retry"
                onClick={() => {
                  setError("");
                  if (activeKeyword) runAnalysis(activeKeyword);
                }}
              >
                ↻ Try again
              </button>
            </div>
          )}

          {!result && !typing && !error && (
            <ChatArea
              keyword={keyword}
              setKeyword={setKeyword}
              loading={loading}
              analyzeKeyword={analyzeKeyword}
              onChipClick={onHistoryClick}
            />
          )}

          {result && !typing && (
            <div className="report" key={result.keyword}>
              {result.warnings?.length > 0 && (
                <div className="warn-banner reveal-up">
                  ⚠ Some data was limited: {result.warnings.join(", ")}.
                  Scores reflect available signals.
                </div>
              )}
              <div className="hero-row">
                <div className="report-hero reveal-up">
                  <div className="eyebrow">
                    <span className="dot">◈</span> InfraBeat AI · Analysis Results
                  </div>
                  <h1>
                    Market Report: <span className="kw">{result.keyword}</span>
                  </h1>
                  <span className={`verdict-pill ${meta.cls}`}>
                    ◷ {result.verdict}
                  </span>
                  {result.trend?.available && (
                    <span className={`trend-badge ${result.trend.direction}`}>
                      {result.trend.direction === "rising"
                        ? "▲"
                        : result.trend.direction === "declining"
                        ? "▼"
                        : "▬"}{" "}
                      {result.trend.direction === "rising"
                        ? "Rising"
                        : result.trend.direction === "declining"
                        ? "Declining"
                        : "Stable"}
                      {typeof result.trend.change_pct === "number"
                        ? ` · ${result.trend.change_pct > 0 ? "+" : ""}${result.trend.change_pct}% (5y)`
                        : ""}
                    </span>
                  )}
                </div>

                <div className="opp-card reveal-up" style={{ animationDelay: "120ms" }}>
                  <RingScore score={result.opportunity_score} />
                  <p className="opp-sub">{meta.sub}</p>
                </div>
              </div>

              <div className="stats-grid">
                <StatCard
                  label="GitHub Projects"
                  value={result.github_projects}
                  barPct={80}
                  tone="cyan"
                  delay={0}
                />
                <StatCard
                  label="News Index"
                  value={result.news_articles}
                  barPct={Math.min(result.news_articles, 100)}
                  tone="cyan"
                  delay={90}
                />
                <StatCard
                  label="Market Demand"
                  value={result.demand_score}
                  suffix="/100"
                  barPct={result.demand_score}
                  tone="blue"
                  delay={180}
                />
                <StatCard
                  label="Competition"
                  value={result.competition_score}
                  suffix="/100"
                  barPct={result.competition_score}
                  tone="warn"
                  delay={270}
                />
              </div>

              <MarketCharts result={result} />

              <div className="section-head reveal-up">🛒 Top Rated Products</div>
              {result.products?.length ? (
                <div className="products-grid">
                  {result.products.map((product, index) => (
                    <a
                      key={index}
                      className="product-card reveal-pop"
                      style={{ animationDelay: `${index * 80}ms` }}
                      href={product.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="product-thumb">
                        {product.image ? (
                          <img src={product.image} alt={product.title} />
                        ) : null}
                        {index === 0 && <span className="product-badge">TOP</span>}
                      </div>
                      <div className="product-info">
                        <div className="product-title">{product.title}</div>
                        <div className="product-meta">
                          <span className="product-price">{product.price}</span>
                          {product.rating && (
                            <span className="product-rating">⭐ {product.rating}</span>
                          )}
                        </div>
                        {product.source && (
                          <div className="product-source">{product.source}</div>
                        )}
                        <span className="product-buy">Buy →</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="no-products reveal-up">
                  No products found. Add a SERPAPI_KEY to your backend .env to
                  enable shopping results.
                </p>
              )}

              {/* ── New Summary Insight Cards ── */}
              <div className="insight-cards-grid">
                {getSection(result.ai_report, "Market Value") && (
                  <div className="insight-card reveal-up" style={{ animationDelay: "0ms" }}>
                    <div className="insight-card-icon">💰</div>
                    <div className="insight-card-title">Market Value</div>
                    <div className="insight-card-body">
                      {getSection(result.ai_report, "Market Value")
                        .split("\n")
                        .map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </div>
                )}
                {getSection(result.ai_report, "Potential Customers") && (
                  <div className="insight-card reveal-up" style={{ animationDelay: "80ms" }}>
                    <div className="insight-card-icon">🎯</div>
                    <div className="insight-card-title">Potential Customers</div>
                    <div className="insight-card-body">
                      {getSection(result.ai_report, "Potential Customers")
                        .split("\n")
                        .map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </div>
                )}
                {getSection(result.ai_report, "Best Makers") && (
                  <div className="insight-card reveal-up" style={{ animationDelay: "160ms" }}>
                    <div className="insight-card-icon">🏆</div>
                    <div className="insight-card-title">Best Makers</div>
                    <div className="insight-card-body">
                      {getSection(result.ai_report, "Best Makers")
                        .split("\n")
                        .map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </div>
                )}
                {getSection(result.ai_report, "Key Investment Signals") && (
                  <div className="insight-card reveal-up" style={{ animationDelay: "240ms" }}>
                    <div className="insight-card-icon">📈</div>
                    <div className="insight-card-title">Key Investment Signals</div>
                    <div className="insight-card-body">
                      {getSection(result.ai_report, "Key Investment Signals")
                        .split("\n")
                        .map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </div>
                )}
              </div>

              <div className="section-head reveal-up">📝 AI Market Analysis</div>
              <div className="ai-block reveal-up">
                <div className="ai-summary">{getSummary(result.ai_report)}</div>

                <div className={`ai-full ${showFull ? "open" : "collapsed"}`}>
                  <ReactMarkdown>{result.ai_report}</ReactMarkdown>
                </div>

                <button
                  className={`expand-btn ${showFull ? "open" : ""}`}
                  onClick={() => setShowFull((s) => !s)}
                >
                  {showFull ? "Hide full report" : "View full report"}
                  <span className="chev">▾</span>
                </button>
              </div>

              <div className="section-head reveal-up">🔥 Top GitHub Projects</div>
              {result.top_projects?.map((project, index) => (
                <div
                  key={index}
                  className="project-card reveal-left"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div>
                    <strong>{project.name}</strong>
                    <div className="stars">
                      ⭐ {project.stars.toLocaleString()}
                    </div>
                  </div>
                  <a href={project.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {result && !typing && (
          <div className="report-footer">
            <div className="ts">↻ Analysis generated just now</div>
            <div className="footer-actions">
              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(result.ai_report);
                  setToast("Report copied to clipboard");
                  setTimeout(() => setToast(""), 2200);
                }}
              >
                ⧉ Copy Report
              </button>
              <button className="pdf-btn" onClick={downloadPDF}>
                ⬇ Download PDF
              </button>
            </div>
          </div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </main>
    </div>
  );
}

export default App;
