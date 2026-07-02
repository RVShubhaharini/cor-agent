const express = require("express");
const { nanoid } = require("nanoid");
const { scrapePage, extractSignals } = require("../scraper");
const { generateAudit } = require("../llmService");
const { saveAudit } = require("../db");

const router = express.Router();

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

router.post("/analyze", async (req, res) => {
  const { url, html, save } = req.body || {};

  if (!html && (!url || !isValidUrl(url))) {
    return res.status(400).json({ error: "Please provide a valid URL or raw HTML content to analyze." });
  }

  try {
    const pageData = html 
      ? extractSignals(html, url || "Pasted HTML Content")
      : await scrapePage(url);
    const audit = await generateAudit(pageData);

    const record = {
      id: nanoid(10),
      url: url || "Pasted HTML Content",
      croScore: audit.croScore,
      createdAt: new Date().toISOString(),
      pageData,
      audit,
    };

    if (save) {
      await saveAudit(record);
    }

    return res.json(record);
  } catch (err) {
    console.error("Analyze error:", err.message);
    const status = /HTTP \d/.test(err.message) ? 502 : 500;
    return res.status(status).json({ error: err.message || "Failed to analyze the page." });
  }
});

// Bonus: compare two landing pages side by side
router.post("/compare", async (req, res) => {
  const { urlA, urlB } = req.body || {};
  if (!isValidUrl(urlA) || !isValidUrl(urlB)) {
    return res.status(400).json({ error: "Please provide two valid URLs to compare." });
  }

  try {
    const pageA = await scrapePage(urlA);
    const pageB = await scrapePage(urlB);
    const auditA = await generateAudit(pageA);
    const auditB = await generateAudit(pageB);

    return res.json({
      a: { url: urlA, pageData: pageA, audit: auditA },
      b: { url: urlB, pageData: pageB, audit: auditB },
    });
  } catch (err) {
    console.error("Compare error:", err.message);
    return res.status(500).json({ error: err.message || "Failed to compare pages." });
  }
});

module.exports = router;
