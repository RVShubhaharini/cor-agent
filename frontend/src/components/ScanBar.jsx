import React, { useState } from "react";

export default function ScanBar({ onSubmit, loading }) {
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [mode, setMode] = useState("url"); // url | html
  const [save, setSave] = useState(true);

  function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    if (mode === "url" && !url.trim()) return;
    if (mode === "html" && !html.trim()) return;

    onSubmit(
      mode === "url" ? url.trim() : "",
      save,
      mode === "html" ? html.trim() : ""
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mode-tabs">
        <button
          type="button"
          className={`mode-tab-btn ${mode === "url" ? "active" : ""}`}
          onClick={() => setMode("url")}
          disabled={loading}
        >
          Scan URL
        </button>
        <button
          type="button"
          className={`mode-tab-btn ${mode === "html" ? "active" : ""}`}
          onClick={() => setMode("html")}
          disabled={loading}
        >
          Paste Raw HTML (Bypass blocks)
        </button>
      </div>

      {mode === "url" ? (
        <div className={`scan-bar ${loading ? "scanning" : ""}`}>
          <input
            type="text"
            inputMode="url"
            placeholder="https://example-store.com/products/example-product"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            aria-label="Landing page URL to audit"
          />
          <label className="save-toggle">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
            Save audit
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Scanning…" : "Run CRO Audit"}
          </button>
        </div>
      ) : (
        <div className="html-bar">
          <textarea
            placeholder="Right click on the page -> View Page Source -> Copy All, then paste here..."
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            disabled={loading}
            aria-label="Raw HTML content"
          />
          <div className="html-bar-actions">
            <input
              type="text"
              placeholder="Optional: Page URL/Name (e.g. Gymshark T-shirt)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "4px",
                background: "#172026",
                border: "1px solid var(--line)",
                color: "#fff",
                fontSize: "13.5px",
                fontFamily: "var(--font-mono)",
              }}
            />
            <label className="save-toggle">
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
              Save audit
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Analyzing HTML…" : "Analyze HTML"}
            </button>
          </div>
        </div>
      )}

      {mode === "url" && (
        <div className="example-hint">e.g. https://example-store.com/products/example-product</div>
      )}
    </form>
  );
}
