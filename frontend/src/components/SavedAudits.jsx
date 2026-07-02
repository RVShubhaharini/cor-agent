import React, { useEffect, useState } from "react";
import { listAudits, getAudit, deleteAudit } from "../api.js";

function scoreColor(score) {
  if (score >= 75) return { color: "#6ee7b7", background: "rgba(110,231,183,0.12)" };
  if (score >= 50) return { color: "#f5b85b", background: "rgba(245,184,91,0.12)" };
  return { color: "#f2607a", background: "rgba(242,96,122,0.13)" };
}

export default function SavedAudits({ onOpenAudit }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listAudits();
      setAudits(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleOpen(id) {
    try {
      const record = await getAudit(id);
      onOpenAudit(record);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    try {
      await deleteAudit(id);
      setAudits((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="empty-state">Loading saved audits…</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (audits.length === 0) {
    return <div className="empty-state">No saved audits yet. Run a scan and keep "Save audit" checked.</div>;
  }

  return (
    <div className="saved-list">
      {audits.map((a) => {
        const sc = scoreColor(a.croScore);
        return (
          <div className="saved-item" key={a.id} onClick={() => handleOpen(a.id)}>
            <div>
              <div className="url">{a.url}</div>
              <div className="date">{new Date(a.createdAt).toLocaleString()}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="score-pill" style={sc}>
                {a.croScore}
              </span>
              <button className="delete-btn" onClick={(e) => handleDelete(e, a.id)}>
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
