require("dotenv").config();
const express = require("express");
const cors = require("cors");

const analyzeRoutes = require("./src/routes/analyze");
const auditsRoutes = require("./src/routes/audits");

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" });
});

app.use("/api", analyzeRoutes);
app.use("/api", auditsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`CRO Agent backend running on http://localhost:${PORT}`);
});
