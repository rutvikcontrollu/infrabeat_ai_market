function ChatArea({
  keyword,
  setKeyword,
  loading,
  analyzeKeyword,
  onChipClick,
}) {
  const suggestions = [
    "3D Printer",
    "AI Agents",
    "Standing Desk",
    "Mechanical Keyboard",
    "Espresso Machine",
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <span className="welcome-badge">⚡ Market Intelligence</span>

        <h1 className="welcome-title">
          Discover what's <span className="grad">worth building</span>
        </h1>

        <h2 className="welcome-subtitle">
          Search any product or idea to get demand signals, competition,
          real buying links, and an AI market report.
        </h2>

        <div className="prompt-container">
          <input
            type="text"
            className="prompt-input"
            placeholder="Try '3D Printer', 'AI Agents', 'Standing Desk'..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") analyzeKeyword();
            }}
          />
          <button
            className="analyze-btn"
            onClick={analyzeKeyword}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze →"}
          </button>
        </div>

        <div className="suggestion-chips">
          {suggestions.map((s) => (
            <button
              key={s}
              className="chip"
              onClick={() => onChipClick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
