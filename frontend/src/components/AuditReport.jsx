import React from "react";
import ScoreGauge from "./ScoreGauge.jsx";

function FindingCard({ title, data }) {
  if (!data) return null;
  return (
    <div className="finding-card">
      <div className="head">
        <h3>{title}</h3>
        <span className={`severity-tag ${data.severity || "medium"}`}>{data.severity || "n/a"}</span>
      </div>
      <p>{data.analysis}</p>
    </div>
  );
}

export default function AuditReport({ record }) {
  const { url, audit, pageData = {} } = record;
  if (!audit) return null;

  // Fallback breakdown math if loading an older audit record
  const breakdown = audit.croScoreBreakdown || {
    heroSection: Math.round(audit.croScore * 0.2),
    ctaQuality: Math.round(audit.croScore * 0.15),
    trustSignals: Math.round(audit.croScore * 0.2),
    mobileUx: Math.round(audit.croScore * 0.15),
    copyClarity: Math.round(audit.croScore * 0.15),
    productPageIssues: Math.round(audit.croScore * 0.15)
  };

  // Automated heuristic checks metrics
  const hasResponsive = pageData.hasResponsiveViewport ?? false;
  const totalImgs = pageData.totalImages ?? 0;
  const missingAlt = pageData.imagesMissingAlt ?? 0;
  const navLinks = pageData.navLinkCount ?? 0;
  const wordCount = pageData.wordCount ?? 0;
  const formCount = pageData.formCount ?? 0;
  const inputCount = pageData.inputCount ?? 0;
  const detected = pageData.detectedElements || {};

  return (
    <div className="audit-report-container">
      <div className="report-toolbar no-print">
        <button className="btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Export to PDF / Print
        </button>
      </div>

      <div className="report-header flex-header">
        <div className="header-left">
          <ScoreGauge score={audit.croScore} />
          <div className="report-meta">
            <span className="url">{url}</span>
            <p className="summary-text">{audit.scoreSummary}</p>
          </div>
        </div>
        {pageData.screenshot && (
          <div className="screenshot-container">
            <span className="screenshot-label-tag">📱 Page view screenshot</span>
            <div className="screenshot-box">
              <img src={`data:image/jpeg;base64,${pageData.screenshot}`} alt="Crawl screenshot view" />
            </div>
          </div>
        )}
      </div>

      {/* Detected page elements (raw scrape) */}
      <div className="section-label">Detected page elements (raw scrape)</div>
      <div className="detected-elements-card">
        <table className="detected-table">
          <tbody>
            <tr>
              <td><strong>Title / Heading</strong></td>
              <td>{detected.title || "Not found"}</td>
            </tr>
            <tr>
              <td><strong>Price</strong></td>
              <td><span className="price-badge">{detected.price || "Not detected"}</span></td>
            </tr>
            <tr>
              <td><strong>Primary CTA Button</strong></td>
              <td><span className="cta-badge">{detected.cta || "Not detected"}</span></td>
            </tr>
            <tr>
              <td><strong>Reviews Rating</strong></td>
              <td>{detected.rating || "Not detected"}</td>
            </tr>
            <tr>
              <td><strong>Images Found</strong></td>
              <td>{detected.images ?? totalImgs} images</td>
            </tr>
            <tr>
              <td><strong>Forms Found</strong></td>
              <td>{detected.forms ?? formCount} forms</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Transparent Score Breakdown */}
      <div className="section-label">Score calculation & breakdown</div>
      <div className="score-breakdown-card">
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <div className="label-row">
              <span>Hero Section</span>
              <strong>{breakdown.heroSection} / 20</strong>
            </div>
            <div className="progress-bar"><div className="fill" style={{ width: `${(breakdown.heroSection / 20) * 100}%` }}></div></div>
          </div>
          <div className="breakdown-item">
            <div className="label-row">
              <span>CTA Quality</span>
              <strong>{breakdown.ctaQuality} / 15</strong>
            </div>
            <div className="progress-bar"><div className="fill" style={{ width: `${(breakdown.ctaQuality / 15) * 100}%` }}></div></div>
          </div>
          <div className="breakdown-item">
            <div className="label-row">
              <span>Trust Signals</span>
              <strong>{breakdown.trustSignals} / 20</strong>
            </div>
            <div className="progress-bar"><div className="fill" style={{ width: `${(breakdown.trustSignals / 20) * 100}%` }}></div></div>
          </div>
          <div className="breakdown-item">
            <div className="label-row">
              <span>Mobile UX</span>
              <strong>{breakdown.mobileUx} / 15</strong>
            </div>
            <div className="progress-bar"><div className="fill" style={{ width: `${(breakdown.mobileUx / 15) * 100}%` }}></div></div>
          </div>
          <div className="breakdown-item">
            <div className="label-row">
              <span>Copy & Message Clarity</span>
              <strong>{breakdown.copyClarity} / 15</strong>
            </div>
            <div className="progress-bar"><div className="fill" style={{ width: `${(breakdown.copyClarity / 15) * 100}%` }}></div></div>
          </div>
          <div className="breakdown-item">
            <div className="label-row">
              <span>Product Page Issues</span>
              <strong>{breakdown.productPageIssues} / 15</strong>
            </div>
            <div className="progress-bar"><div className="fill" style={{ width: `${(breakdown.productPageIssues / 15) * 100}%` }}></div></div>
          </div>
        </div>
      </div>

      {/* Automated Heuristic Checks */}
      <div className="section-label">Automated heuristic checks</div>
      <div className="automated-checks-card">
        <div className="checks-grid">
          <div className={`check-item ${hasResponsive ? "pass" : "fail"}`}>
            <span className="icon">📱</span>
            <div className="check-detail">
              <h4>Mobile Viewport Meta</h4>
              <p>{hasResponsive ? "Responsive viewport tag found." : "Responsive viewport tag missing or misconfigured."}</p>
            </div>
          </div>
          <div className={`check-item ${missingAlt === 0 && totalImgs > 0 ? "pass" : missingAlt > 0 ? "warn" : "info"}`}>
            <span className="icon">🖼️</span>
            <div className="check-detail">
              <h4>Image Alt Attributes</h4>
              <p>{totalImgs === 0 ? "No images found." : missingAlt === 0 ? "All images have alt tags." : `${missingAlt} out of ${totalImgs} images missing alt text.`}</p>
            </div>
          </div>
          <div className={`check-item ${navLinks <= 25 ? "pass" : "warn"}`}>
            <span className="icon">🔗</span>
            <div className="check-detail">
              <h4>Navigation Link Count</h4>
              <p>{navLinks} navigation links found {navLinks > 25 && "(High complexity may clutter mobile UX)"}</p>
            </div>
          </div>
          <div className={`check-item ${formCount <= 2 && inputCount <= 10 ? "pass" : "warn"}`}>
            <span className="icon">🛒</span>
            <div className="check-detail">
              <h4>Input Friction</h4>
              <p>{inputCount} inputs across {formCount} forms found {inputCount > 10 && "(High form friction during checkout/signup)"}</p>
            </div>
          </div>
          <div className="check-item info">
            <span className="icon">📝</span>
            <div className="check-detail">
              <h4>Word Density</h4>
              <p>Approx. {wordCount} visible words on page</p>
            </div>
          </div>
        </div>
      </div>

      <div className="section-label">Core findings</div>
      <div className="findings-grid">
        <FindingCard title="Hero Section" data={audit.heroSection} />
        <FindingCard title="CTA Quality" data={audit.ctaQuality} />
        <FindingCard title="Trust Signals" data={audit.trustSignals} />
        <FindingCard title="Product Page Issues" data={audit.productPageIssues} />
        <FindingCard title="Mobile UX" data={audit.mobileUx} />
        <FindingCard title="Copy / Message Clarity" data={audit.copyClarity} />
      </div>

      {audit.frictionPoints?.length > 0 && (
        <>
          <div className="section-label">Friction points</div>
          <div className="list-card">
            {audit.frictionPoints.map((f, i) => (
              <div className="list-row" key={i}>
                <span className={`dot ${f.impact || "medium"}`} />
                <span className="text">{f.issue}</span>
                <span className="tag">{f.impact} impact</span>
              </div>
            ))}
          </div>
        </>
      )}

      {audit.recommendations?.length > 0 && (
        <>
          <div className="section-label">Recommended improvements</div>
          <div className="recommendations-list">
            {audit.recommendations.map((r, i) => (
              <div className="recommendation-row" key={i}>
                <div className="recommendation-row-header">
                  <span className={`dot ${r.priority || "medium"}`} />
                  <span className="text"><strong>{r.recommendation}</strong></span>
                  <span className="tag">{r.priority} priority</span>
                </div>
                {r.reason && (
                  <div className="recommendation-reason">
                    <strong>Reason:</strong> {r.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {(audit.improvedCopy?.heroHeadlines?.length > 0 || audit.improvedCopy?.ctaOptions?.length > 0) && (
        <>
          <div className="section-label">AI-generated copy suggestions</div>
          <div className="copy-grid">
            {audit.improvedCopy?.heroHeadlines?.length > 0 && (
              <div className="copy-col">
                <h4>Hero headline options</h4>
                <div className="copy-comparison-box">
                  <div className="current-copy-line">
                    <span className="comp-tag current">Current H1</span>
                    <p>"{detected.title || "Not found"}"</p>
                  </div>
                  <div className="arrow-down">↓</div>
                  <div className="suggested-list">
                    <span className="comp-tag suggested">Suggested alternatives</span>
                    {audit.improvedCopy.heroHeadlines.map((h, i) => (
                      <div className="copy-chip" key={i}>
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {audit.improvedCopy?.ctaOptions?.length > 0 && (
              <div className="copy-col">
                <h4>CTA button options</h4>
                <div className="copy-comparison-box">
                  <div className="current-copy-line">
                    <span className="comp-tag current">Current CTA</span>
                    <p>"{detected.cta || "Not detected"}"</p>
                  </div>
                  <div className="arrow-down">↓</div>
                  <div className="suggested-list">
                    <span className="comp-tag suggested">Suggested alternatives</span>
                    {audit.improvedCopy.ctaOptions.map((c, i) => (
                      <div className="copy-chip" key={i}>
                        <span className="cta-text">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
