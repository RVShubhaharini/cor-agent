import React, { useState } from "react";
import ScanBar from "./components/ScanBar.jsx";
import Loader from "./components/Loader.jsx";
import AuditReport from "./components/AuditReport.jsx";
import SavedAudits from "./components/SavedAudits.jsx";
import CompareView from "./components/CompareView.jsx";
import { analyzePage } from "./api.js";

export default function App() {
  const [tab, setTab] = useState("scan"); // scan | saved | compare
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);

  async function handleAnalyze(url, save, html) {
    setLoading(true);
    setError(null);
    setRecord(null);
    try {
      const data = await analyzePage(url, save, html);
      setRecord(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Scanline
        </div>
        <div className="nav-tabs">
          <button className={`nav-tab ${tab === "scan" ? "active" : ""}`} onClick={() => setTab("scan")}>
            Scan
          </button>
          <button className={`nav-tab ${tab === "saved" ? "active" : ""}`} onClick={() => setTab("saved")}>
            Saved Audits
          </button>
          <button className={`nav-tab ${tab === "compare" ? "active" : ""}`} onClick={() => setTab("compare")}>
            Compare
          </button>
        </div>
      </div>

      {tab === "scan" && (
        <>
          <div className="hero">
            <div className="eyebrow">AI conversion audit</div>
            <h1>Find out why your landing page isn't converting.</h1>
            <p className="sub">
              Paste any product or landing page URL. The agent reads the page, checks it against
              conversion fundamentals, and returns a scored audit with concrete fixes.
            </p>
            <ScanBar onSubmit={handleAnalyze} loading={loading} />
            {error && (
              <div className="error-box">
                <div className="error-header-row">
                  <span className="error-icon">❌</span>
                  <h3>Unable to analyze this page</h3>
                </div>
                <p className="error-detail-text">{error}</p>
                <div className="error-divider"></div>
                <h4>Possible reasons:</h4>
                <ul className="error-reasons-list">
                  <li><strong>Bot block:</strong> The website blocks automated crawlers (e.g. Cloudflare). Try pasting the raw HTML using the "Paste HTML" tab!</li>
                  <li><strong>Login wall:</strong> The page requires authentication to view.</li>
                  <li><strong>Invalid URL:</strong> The URL is mistyped or does not exist.</li>
                  <li><strong>Network timeout:</strong> The destination server is too slow or down.</li>
                </ul>
                <p className="error-tip">💡 <strong>Tip:</strong> Try another public e-commerce store URL or copy the page HTML from your browser's inspect panel and paste it directly.</p>
              </div>
            )}
          </div>

          {loading && <Loader />}
          {!loading && record && <AuditReport record={record} />}
          {!loading && !record && !error && (
            <div className="empty-state">Run a scan to see your CRO audit here.</div>
          )}
        </>
      )}

      {tab === "saved" && (
        <>
          <div className="eyebrow">History</div>
          <h1>Saved audits</h1>
          <p className="sub">Every audit you save is stored so you can revisit it or track progress over time.</p>
          <SavedAudits
            onOpenAudit={(r) => {
              setRecord(r);
              setTab("scan");
            }}
          />
        </>
      )}

      {tab === "compare" && <CompareView />}

      <footer className="credit">Scanline · AI Landing Page CRO Agent</footer>
    </div>
  );
}
