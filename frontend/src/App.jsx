import { useState } from 'react';
import './App.css';

function Toggle({ id, checked, onChange, label }) {
  return (
    <div className="toggle-row">
      <span className="toggle-label">{label}</span>
      <label className="toggle-switch" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-track">
          <span className="toggle-thumb" />
        </span>
      </label>
    </div>
  );
}

function ResultCard({ answer }) {
  return (
    <div className="result-card">
      <div className="result-header">
        <h2 className="fruit-title">{answer.fruit || 'RAG Analysis'}</h2>
        <div className="result-badges">
          <span className={`badge ${answer.ragEnabled ? 'badge-rag' : 'badge-llm'}`}>
            {answer.ragEnabled ? '⚡ RAG' : '🤖 LLM'}
          </span>
        </div>
      </div>

      {answer.text ? (
        <section className="result-section">
          <h3>📝 Assistant Answer</h3>
          <div className="text-answer" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.1rem', color: '#e2e8f0' }}>
            {answer.text}
          </div>
        </section>
      ) : (
        <>
          <section className="result-section">
            <h3>🧪 Chemical Components</h3>
            <div className="components-grid">
              {answer.components.map((comp, idx) => (
                <div className="component-card" key={idx}>
                  <div className="component-name">{comp.name}</div>
                  {comp.amount && <div className="component-amount">{comp.amount}</div>}
                  {comp.description && <div className="component-desc">{comp.description}</div>}
                </div>
              ))}
            </div>
          </section>

          <div className="result-two-col">
            <section className="result-section">
              <h3>💊 Vitamins</h3>
              <ul className="pill-list">
                {answer.vitamins.map((v, i) => (
                  <li key={i} className="pill pill-vitamin">
                    {typeof v === 'string' ? v : `${v.name}${v.amount ? ` (${v.amount})` : ''}`}
                  </li>
                ))}
              </ul>
            </section>
            <section className="result-section">
              <h3>⚙️ Minerals</h3>
              <ul className="pill-list">
                {answer.minerals.map((m, i) => (
                  <li key={i} className="pill pill-mineral">
                    {typeof m === 'string' ? m : `${m.name}${m.amount ? ` (${m.amount})` : ''}`}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ragEnabled, setRagEnabled] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    setAnswer(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, ragEnabled })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch answer');
      setAnswer(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAsk();
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">🥦</div>
          <div>
            <h1 className="header-title">Food Assistant</h1>
            <p className="header-subtitle">AI-powered nutritional & chemical analysis</p>
          </div>
        </div>
      </header>

      <main className="main-layout">
        {/* LEFT PANEL */}
        <aside className="left-panel">
          <div className="panel-card">
            <h2 className="panel-heading">Ask a Question</h2>
            <textarea
              id="question-input"
              className="question-textarea"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="E.g., What are the chemical components of a mango?"
              rows={6}
            />
            <p className="hint">Tip: Press Ctrl+Enter to submit</p>
            <button
              id="ask-button"
              className={`ask-btn ${loading ? 'loading' : ''}`}
              onClick={handleAsk}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-row"><span className="spinner" />Analyzing...</span>
              ) : (
                '🔍 Ask Food Assistant'
              )}
            </button>
          </div>

          <div className="panel-card settings-card">
            <h2 className="panel-heading">Settings</h2>

            <Toggle
              id="rag-toggle"
              checked={ragEnabled}
              onChange={setRagEnabled}
              label={ragEnabled ? '⚡ RAG: On' : '💤 RAG: Off'}
            />


          </div>
        </aside>

        {/* RIGHT PANEL */}
        <section className="right-panel">
          {!answer && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">🍎</div>
              <h3>Ready to analyze</h3>
              <p>Ask about any fruit or food on the left to see its chemical breakdown here.</p>
            </div>
          )}

          {error && (
            <div className="error-box">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="loading-pulse">🔬</div>
              <p>Analyzing nutritional data...</p>
            </div>
          )}

          {answer && <ResultCard answer={answer} />}
        </section>
      </main>
    </div>
  );
}
