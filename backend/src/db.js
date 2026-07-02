const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DB_FILE = path.join(__dirname, "..", "data", "audits.json");

// Initialize Supabase if keys are provided in .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey && supabaseUrl !== "your_supabase_url_here" && supabaseKey !== "your_supabase_anon_key_here") {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase cloud database integrated.");
  } catch (err) {
    console.error("Supabase init error:", err.message);
  }
} else {
  console.log("No Supabase configuration found. Falling back to local flat-file storage.");
}

function ensureDbFile() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]", "utf-8");
}

function readAllLocal() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAllLocal(audits) {
  ensureDbFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(audits, null, 2), "utf-8");
}

// ----------------------------------------------------
// Public database interface with Supabase & Local fallback
// ----------------------------------------------------

async function saveAudit(record) {
  if (supabase) {
    try {
      // Schema Option 1: README recommended layout (snake_case)
      const { error: err1 } = await supabase
        .from("audits")
        .insert([
          {
            id: record.id,
            url: record.url,
            cro_score: record.croScore,
            score_summary: record.audit?.scoreSummary || "",
            created_at: record.createdAt,
            full_record: record
          }
        ]);
      if (!err1) {
        console.log(`Saved audit ${record.id} successfully to Supabase (Schema 1: snake_case).`);
        return record;
      }

      // Schema Option 2: Basic prompt layout (score, summary, created_at, full_record)
      const { error: err2 } = await supabase
        .from("audits")
        .insert([
          {
            id: record.id,
            url: record.url,
            score: record.croScore,
            summary: record.audit?.scoreSummary || "",
            created_at: record.createdAt,
            full_record: record
          }
        ]);
      if (!err2) {
        console.log(`Saved audit ${record.id} successfully to Supabase (Schema 2: score/summary).`);
        return record;
      }

      // Schema Option 3: camelCase layout (croScore, scoreSummary, createdAt, fullRecord)
      const { error: err3 } = await supabase
        .from("audits")
        .insert([
          {
            id: record.id,
            url: record.url,
            croScore: record.croScore,
            scoreSummary: record.audit?.scoreSummary || "",
            createdAt: record.createdAt,
            fullRecord: record
          }
        ]);
      if (!err3) {
        console.log(`Saved audit ${record.id} successfully to Supabase (Schema 3: camelCase).`);
        return record;
      }

      throw new Error(`All insertion schemas failed. DB rejected payload columns.`);
    } catch (err) {
      console.error("Supabase insert failed, falling back to local file:", err.message);
    }
  }

  const audits = readAllLocal();
  audits.unshift(record);
  const trimmed = audits.slice(0, 100);
  writeAllLocal(trimmed);
  return record;
}

async function listAudits() {
  if (supabase) {
    try {
      // 1. Try created_at sorting
      let { data, error } = await supabase
        .from("audits")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        // 2. Try createdAt sorting fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("audits")
          .select("*")
          .order("createdAt", { ascending: false });
        
        if (fallbackError) {
          // 3. Fallback select without DB-side ordering (sort in JS)
          const { data: unsortedData, error: unsortedError } = await supabase
            .from("audits")
            .select("*");
          if (unsortedError) throw unsortedError;
          data = unsortedData;
        } else {
          data = fallbackData;
        }
      }

      // Sort in JavaScript as a safe fallback
      data.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateB - dateA;
      });

      return data.map((item) => {
        const rec = item.full_record || item.fullRecord || {};
        return {
          id: item.id,
          url: item.url,
          croScore: rec.croScore ?? item.cro_score ?? item.croScore ?? item.score ?? 0,
          createdAt: rec.createdAt ?? item.created_at ?? item.createdAt ?? new Date().toISOString()
        };
      });
    } catch (err) {
      console.error("Supabase select failed, falling back to local file:", err.message);
    }
  }

  return readAllLocal().map(({ id, url, croScore, createdAt }) => ({ id, url, croScore, createdAt }));
}

async function getAuditById(id) {
  if (supabase) {
    try {
      // Avoid .single() as it throws when 0 rows are returned due to RLS
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("id", id);
      if (error) throw error;
      if (data && data.length > 0) {
        return data[0].full_record || data[0].fullRecord || null;
      }
      return null;
    } catch (err) {
      console.error("Supabase get failed, falling back to local file:", err.message);
    }
  }

  return readAllLocal().find((a) => a.id === id) || null;
}

async function deleteAudit(id) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from("audits")
        .delete()
        .eq("id", id);
      if (error) throw error;
      console.log(`Deleted audit ${id} successfully from Supabase.`);
      return;
    } catch (err) {
      console.error("Supabase delete failed, falling back to local file:", err.message);
    }
  }

  const audits = readAllLocal().filter((a) => a.id !== id);
  writeAllLocal(audits);
}

module.exports = { saveAudit, listAudits, getAuditById, deleteAudit };
