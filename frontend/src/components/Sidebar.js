function Sidebar({
  history,
  onNewChat,
  onHistoryClick,
  onDeleteItem,
  onClearAll,
}) {
  return (
    <div className="sidebar">
      <div className="logo">
        <span className="logo-icon">🚀</span>
        <div className="logo-text">
          <div className="name">InfraBeat</div>
          <div className="tag">AI Market Intelligence</div>
        </div>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        + New Analysis
      </button>

      <div className="history-head">
        <span className="history-heading">Recent Searches</span>
        {history.length > 0 && (
          <button className="clear-all-btn" onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>

      <div className="history-section">
        {history.length === 0 ? (
          <p className="empty-history">No searches yet</p>
        ) : (
          history.map((item, index) => (
            <div key={index} className="history-item" title={item}>
              <span className="hi-icon">🔍</span>
              <span
                className="hi-text"
                onClick={() => onHistoryClick(item)}
              >
                {item}
              </span>
              <button
                className="hi-del"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <span>⚡ v3.0</span>
        <span>© 2024</span>
      </div>
    </div>
  );
}

export default Sidebar;
