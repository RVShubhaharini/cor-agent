const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

async function handle(res) {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return res.json();
}

export async function analyzePage(url, save, html) {
  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, save, html }),
  });
  return handle(res);
}

export async function comparePages(urlA, urlB) {
  const res = await fetch(`${API_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urlA, urlB }),
  });
  return handle(res);
}

export async function listAudits() {
  const res = await fetch(`${API_URL}/audits`);
  return handle(res);
}

export async function getAudit(id) {
  const res = await fetch(`${API_URL}/audits/${id}`);
  return handle(res);
}

export async function deleteAudit(id) {
  const res = await fetch(`${API_URL}/audits/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete audit.");
}
