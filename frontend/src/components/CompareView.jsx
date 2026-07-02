import React, { useState } from "react";
import { comparePages } from "../api.js";
import ScoreGauge from "./ScoreGauge.jsx";
import Loader from "./Loader.jsx";

function MiniFindings({ audit }) {
  const rows = [
    ["Hero Section", audit.heroSection],
    ["CTA Quality", audit.ctaQuality],
    ["Trust Signals", audit.trustSignals],
    ["Product Page Issues", audit.productPageIssues],
    ["Mobile UX", audit.mobileUx],
    ["Copy Clarity", audit.copyClarity],
  ];
  return (
    <div className="list-card">
      {rows.map(([label, d]) => (
        <div className="list-row" key={label}>
          <span className={`dot ${d?.severity || "medium"}`} />
          <span className="text">
            <strong>{label}:</strong> {d?.analysis}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CompareView() {
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!urlA.trim() || !urlB.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await comparePages(urlA.trim(), urlB.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="eyebrow">Side-by-side</div>
      <h1>Compare two landing pages</h1>
      <p className="sub">
        Paste two product or landing page URLs to see how they stack up on conversion fundamentals.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="compare-inputs">
          <input placeholder="https://page-a.com/products/a" value={urlA} onChange={(e) => setUrlA(e.target.value)} disabled={loading} />
          <input placeholder="https://page-b.com/products/b" value={urlB} onChange={(e) => setUrlB(e.target.value)} disabled={loading} />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Comparing…" : "Compare"}
          </button>
        </div>
      </form>

      {error && <div className="error-banner">{error}</div>}
      {loading && <Loader />}

      {result && (
        <div style={{ marginTop: 32 }}>
          <div className="compare-grid">
            {[result.a, result.b].map((side, i) => (
              <div key={i}>
                <div className="report-header" style={{ flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <ScoreGauge score={side.audit.croScore} size={110} />
                  <div className="report-meta" style={{ textAlign: "center" }}>
                    <span className="url">{side.url}</span>
                    <p>{side.audit.scoreSummary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="section-label">Finding-by-finding comparison</div>
          <div className="compare-grid">
            <MiniFindings audit={result.a.audit} />
            <MiniFindings audit={result.b.audit} />
          </div>
        </div>
      )}
    </div>
  );
}
