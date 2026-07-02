const express = require("express");
const { listAudits, getAuditById, deleteAudit } = require("../db");

const router = express.Router();

router.get("/audits", async (req, res) => {
  try {
    const list = await listAudits();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/audits/:id", async (req, res) => {
  try {
    const audit = await getAuditById(req.params.id);
    if (!audit) return res.status(404).json({ error: "Audit not found." });
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/audits/:id", async (req, res) => {
  try {
    await deleteAudit(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
