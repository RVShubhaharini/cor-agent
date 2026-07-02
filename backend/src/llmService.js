const axios = require("axios");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const RESPONSE_SCHEMA_HINT = `
Return ONLY a single valid JSON object (no markdown fences, no commentary) with EXACTLY this shape:

{
  "croScore": number,                 // overall CRO score (sum of breakdown scores)
  "scoreSummary": string,             // 1-2 sentence justification of the score
  "croScoreBreakdown": {
    "heroSection": number,            // score out of 20
    "ctaQuality": number,             // score out of 15
    "trustSignals": number,           // score out of 20
    "mobileUx": number,               // score out of 15
    "copyClarity": number,            // score out of 15
    "productPageIssues": number       // score out of 15
  },
  "heroSection": { "analysis": string, "severity": "low"|"medium"|"high" },
  "ctaQuality": { "analysis": string, "severity": "low"|"medium"|"high" },
  "trustSignals": { "analysis": string, "severity": "low"|"medium"|"high" },
  "productPageIssues": { "analysis": string, "severity": "low"|"medium"|"high" },
  "mobileUx": { "analysis": string, "severity": "low"|"medium"|"high" },
  "copyClarity": { "analysis": string, "severity": "low"|"medium"|"high" },
  "frictionPoints": [ { "issue": string, "impact": "low"|"medium"|"high" } ],
  "recommendations": [ 
    { 
      "recommendation": string, 
      "reason": string,               // justification for why this recommendation is being made
      "priority": "low"|"medium"|"high" 
    } 
  ],
  "improvedCopy": {
    "heroHeadlines": [string, string, string],
    "ctaOptions": [string, string, string]
  }
}

Rules:
- "severity"/"impact"/"priority" reflect how much that issue is hurting conversion (high = hurts conversion a lot).
- frictionPoints: 3-6 concrete items.
- recommendations: 4-8 concrete, actionable items, ordered by priority (high first). Each item MUST have a specific "reason" explaining the diagnosis behind the recommendation.
- improvedCopy.heroHeadlines: 3 alternative, benefit-led hero headlines tailored to this exact page.
- improvedCopy.ctaOptions: 3 alternative, action-focused CTA button texts.
- Be specific to the evidence provided. Do not invent facts not supported by the extracted data or reasonable inference from it.
- croScoreBreakdown sections must sum up exactly to croScore (which is an integer between 0 and 100).
- DYNAMIC SCORING (CRITICAL): Do not reuse or anchor to default scores (like 62 or 42). Grade each section dynamically and aggressively using its full available range. If a section is excellent, score it near-perfect (e.g. 19/20 or 14/15); if a section has critical issues, score it very low (e.g. 2/20 or 3/15). Let the total score range naturally from 10 to 95 depending on actual optimization.
`;

function buildPrompt(pageData) {
  const de = pageData.detectedElements || {};
  return `You are a senior Conversion Rate Optimization (CRO) auditor reviewing a product landing page.

You are given structured signals and detected page elements extracted from the live page's HTML. Use them as evidence for a professional, highly specific CRO audit.

PAGE URL: ${pageData.url}

DETECTED PAGE ELEMENTS (RAW):
- Product Title / Heading: "${de.title || "(none)"}"
- Product Price: "${de.price || "Not detected"}"
- Product Primary CTA: "${de.cta || "Not detected"}"
- Reviews Rating: "${de.rating || "Not detected"}"
- Product Description Snippet: "${de.description || "Not detected"}"

EXTRACTED CRAWLER SIGNALS:
- Page title: ${pageData.title || "(none found)"}
- Meta description: ${pageData.metaDescription || "(none found)"}
- Open Graph title: ${pageData.ogTitle || "(none found)"}
- Has responsive viewport meta tag: ${pageData.hasResponsiveViewport}
- H1 heading(s): ${JSON.stringify(pageData.h1s)}
- H2 heading(s): ${JSON.stringify(pageData.h2s)}
- First body paragraphs (possible hero/description copy): ${JSON.stringify(pageData.firstParagraphs)}
- Button / CTA texts found on page: ${JSON.stringify(pageData.ctaTexts)}
- Total images: ${pageData.totalImages}, images missing alt text: ${pageData.imagesMissingAlt}
- Trust signal keyword groups detected: ${JSON.stringify(pageData.trustSignalsFound)}
  (possible values: reviewsOrRatings, freeShipping, moneyBackOrReturns, guarantee, securePayment, socialProof, trustBadgesLikely)
- Price symbol present in page text: ${pageData.hasPriceSymbol}
- Urgency/scarcity language detected (e.g. "only X left", "limited time"): ${pageData.hasUrgency}
- Discount/sale language detected: ${pageData.hasDiscount}
- Number of <form> elements: ${pageData.formCount}, number of <input> elements: ${pageData.inputCount}
- Approx. visible word count on page: ${pageData.wordCount}
- Nav link count: ${pageData.navLinkCount}
- Raw HTML size: ${pageData.htmlLength} characters

AUDIT & COPYWRITING CONSTRAINTS:
1. Product-specific copywriting: When writing "improvedCopy.heroHeadlines" and "improvedCopy.ctaOptions", you MUST write copy focused strictly on the SPECIFIC product "${de.title || pageData.title}" and its benefits. Do NOT write generic store-level slogans (e.g. do NOT say "Transform Your Store", instead write about the product features, benefits, price or direct purchase value).
2. Product-specific diagnosis: Tailor your findings, friction points, and recommendations directly to the context of a product detail page (e.g. checkout flow, product specifications, images, trust signals, clarity of price and rating).
3. Grounding: Do not invent details. Base your review on the signals. If a signal is missing or ambiguous, state that it is not visibly communicated.

${RESPONSE_SCHEMA_HINT}`;
}

function safeParseJson(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

async function generateGroqAudit(pageData) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    throw new Error(
      "GROQ_API_KEY is not configured. Please open backend/.env and replace 'your_groq_api_key_here' with your real Groq API key (starts with gsk_)."
    );
  }

  const prompt = buildPrompt(pageData);

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a senior Conversion Rate Optimization (CRO) auditor. You respond ONLY with a single valid JSON object matching the requested schema.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const text = response.data.choices[0].message.content;
  return safeParseJson(text);
}

async function generateAudit(pageData) {
  let parsed;
  try {
    parsed = await generateGroqAudit(pageData);
  } catch (err) {
    console.error("Groq API Error:", err.response?.data || err.message);
    throw new Error(`Groq API Error: ${err.response?.data?.error?.message || err.message}`);
  }

  // Basic shape safety-net in case the model omits a field.
  parsed.croScoreBreakdown = parsed.croScoreBreakdown || {
    heroSection: 0,
    ctaQuality: 0,
    trustSignals: 0,
    mobileUx: 0,
    copyClarity: 0,
    productPageIssues: 0
  };

  const b = parsed.croScoreBreakdown;
  parsed.croScore = (Number(b.heroSection) || 0) + 
                    (Number(b.ctaQuality) || 0) + 
                    (Number(b.trustSignals) || 0) + 
                    (Number(b.mobileUx) || 0) + 
                    (Number(b.copyClarity) || 0) + 
                    (Number(b.productPageIssues) || 0);
  parsed.croScore = Math.max(0, Math.min(100, Math.round(parsed.croScore)));

  parsed.frictionPoints = Array.isArray(parsed.frictionPoints) ? parsed.frictionPoints : [];
  parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  parsed.improvedCopy = parsed.improvedCopy || { heroHeadlines: [], ctaOptions: [] };

  return parsed;
}

module.exports = { generateAudit };
