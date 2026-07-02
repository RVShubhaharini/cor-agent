const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

/**
 * Truncate long text blocks so we don't blow past LLM context limits.
 */
function clip(text, max = 400) {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

function extractSignals(html, url) {
  const $ = cheerio.load(html);

  // --- Basic meta ---
  const title = clip($("title").first().text(), 150);
  const metaDescription = clip($('meta[name="description"]').attr("content"), 300);
  const viewportMeta = $('meta[name="viewport"]').attr("content") || null;
  const hasResponsiveViewport = !!viewportMeta && /width=device-width/i.test(viewportMeta);
  const ogTitle = clip($('meta[property="og:title"]').attr("content"), 150);
  const ogImage = $('meta[property="og:image"]').attr("content") || null;

  // --- Headings (hero / structure signal) ---
  const h1s = $("h1")
    .map((_, el) => clip($(el).text(), 200))
    .get()
    .filter(Boolean)
    .slice(0, 5);
  const h2s = $("h2")
    .map((_, el) => clip($(el).text(), 150))
    .get()
    .filter(Boolean)
    .slice(0, 8);

  // --- Buttons / CTAs ---
  const ctaSelectors = [
    "button",
    'a[class*="btn"]',
    'a[class*="button"]',
    'a[href*="cart"]',
    'a[href*="checkout"]',
    'input[type="submit"]',
  ];
  const ctaTextsRaw = $(ctaSelectors.join(", "))
    .map((_, el) => clip($(el).text() || $(el).attr("value"), 60))
    .get()
    .filter((t) => {
      if (!t || t.length <= 1) return false;
      const clean = t.toLowerCase().trim();
      const exclude = [
        "skip to content",
        "skip to main content",
        "close",
        "menu",
        "toggle navigation",
        "open menu",
        "close menu",
        "javascript:void(0)",
      ];
      return !exclude.some((term) => clean.includes(term));
    });
  const ctaTexts = [...new Set(ctaTextsRaw)].slice(0, 20);

  // --- Images ---
  const images = $("img");
  const totalImages = images.length;
  const imagesMissingAlt = images
    .toArray()
    .filter((el) => !$(el).attr("alt") || $(el).attr("alt").trim() === "").length;

  // --- Trust signal keyword detection (case-insensitive over visible text) ---
  const bodyText = $("body").text().replace(/\s+/g, " ");
  const trustKeywordGroups = {
    reviewsOrRatings: /review|rating|star|testimonial/i,
    freeShipping: /free shipping|free delivery/i,
    moneyBackOrReturns: /money[- ]back|return policy|refund|exchange/i,
    guarantee: /guarantee|warranty/i,
    securePayment: /secure checkout|ssl|secure payment|encrypted/i,
    socialProof: /(\d[\d,]*)\s*(customers|orders|sold|reviews|happy)/i,
    trustBadgesLikely: /(visa|mastercard|paypal|apple pay|google pay|shop pay)/i,
  };
  const trustSignalsFound = Object.entries(trustKeywordGroups)
    .filter(([, regex]) => regex.test(bodyText))
    .map(([key]) => key);

  // --- Pricing / urgency signals ---
  const hasPriceSymbol = /[$₹€£]\s?\d/.test(bodyText);
  const hasUrgency = /(only \d+ left|hurry|limited time|sale ends|while supplies last|selling fast)/i.test(
    bodyText
  );
  const hasDiscount = /(% off|discount|save \$|sale)/i.test(bodyText);

  // --- Forms (checkout / signup friction proxy) ---
  const formCount = $("form").length;
  const inputCount = $("input").length;

  // --- Word count / density (mobile UX proxy) ---
  const wordCount = bodyText.split(" ").filter(Boolean).length;

  // --- Nav complexity (friction proxy) ---
  const navLinkCount = $("nav a").length;

  // --- First visible paragraph (hero copy proxy) ---
  const firstParagraphs = $("p")
    .map((_, el) => clip($(el).text(), 250))
    .get()
    .filter((t) => t && t.length > 20)
    .slice(0, 5);

  // --- Dedicated Product Element Extractions ---
  // 1. Title/Name
  const detectedTitle = clip(
    $('[class*="product-title"], [class*="product_title"], h1[class*="title"], .entry-title').first().text() ||
    $("h1").first().text() ||
    title,
    100
  );

  // 2. Price
  let detectedPrice = null;
  const ogPrice = $('meta[property="product:price:amount"]').attr("content") || $('meta[property="og:price:amount"]').attr("content");
  const ogCurrency = $('meta[property="product:price:currency"]').attr("content") || "USD";
  if (ogPrice) {
    detectedPrice = `${ogCurrency === "INR" ? "₹" : "$"} ${ogPrice}`;
  } else {
    const priceEls = $('[class*="price"], .price, .amount, .current-price, .product-price');
    for (let i = 0; i < priceEls.length; i++) {
      const txt = $(priceEls[i]).text().trim();
      const match = txt.match(/[$₹€£]\s?\d+(?:[.,]\d{2})?/);
      if (match) {
        detectedPrice = match[0];
        break;
      }
    }
    if (!detectedPrice) {
      const match = bodyText.match(/[$₹€£]\s?\d+(?:[.,]\d{2})?/);
      if (match) detectedPrice = match[0];
    }
  }

  // 3. CTA
  let detectedCta = null;
  const preferredCtaSelectors = [
    'button[class*="cart"]',
    'button[class*="buy"]',
    'a[class*="cart"]',
    'a[class*="buy"]',
    'button[id*="cart"]',
    'button[id*="buy"]',
  ];
  const preferredCtaEl = $(preferredCtaSelectors.join(", ")).first();
  if (preferredCtaEl.length > 0) {
    detectedCta = clip(preferredCtaEl.text() || preferredCtaEl.attr("value"), 40);
  }

  // 4. Rating
  let detectedRating = null;
  const ratingMatch = bodyText.match(/(\d\.\d)\s*(?:out of 5|\/5|\/5\.0)/i) || bodyText.match(/(?:rating:?\s*)(\d\.\d)/i);
  if (ratingMatch) {
    detectedRating = `${ratingMatch[1]} / 5`;
  } else {
    const stars = bodyText.match(/([★⭐]{1,5})/);
    if (stars && stars[1].length >= 3) {
      detectedRating = `${stars[1].length} / 5`;
    } else {
      detectedRating = "Not detected (No reviews found)";
    }
  }

  // 5. Description
  const descriptionSelectors = [
    '.product-description',
    '[class*="product-description"]',
    '.entry-content p',
    '.description p',
    '#description p'
  ];
  const descEl = $(descriptionSelectors.join(", ")).first();
  const detectedDescription = clip(
    descEl.text() || 
    $('meta[name="description"]').attr("content") || 
    $("p").first().text(), 
    300
  );

  const detectedElements = {
    title: detectedTitle || title,
    price: detectedPrice || "Not detected",
    cta: detectedCta || (ctaTexts[0] || "Not detected"),
    rating: detectedRating || "Not detected",
    description: detectedDescription || "Not detected",
    images: totalImages,
    forms: formCount
  };

  return {
    url,
    title,
    metaDescription,
    ogTitle,
    ogImage,
    hasResponsiveViewport,
    h1s,
    h2s,
    ctaTexts,
    totalImages,
    imagesMissingAlt,
    trustSignalsFound,
    hasPriceSymbol,
    hasUrgency,
    hasDiscount,
    formCount,
    inputCount,
    wordCount,
    navLinkCount,
    firstParagraphs,
    htmlLength: html.length,
    detectedElements
  };
}

async function scrapePage(url) {
  const path = require("path");
  const os = require("os");
  const uniqueTempDir = path.join(
    os.tmpdir(),
    `puppeteer_profile_${Date.now()}_${Math.random().toString(36).substring(3)}`
  );

  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: uniqueTempDir,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-features=LockProfile"],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait 1.5 seconds for client-side hydration and lazy elements to stabilize
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!response) {
      throw new Error("Failed to load response from page.");
    }

    const status = response.status();
    if (status >= 400) {
      throw new Error(`Page responded with HTTP ${status}. It may block bots or require a login.`);
    }

    const html = await page.content();
    let screenshotBase64 = null;
    try {
      screenshotBase64 = await page.screenshot({
        encoding: "base64",
        type: "jpeg",
        quality: 50
      });
    } catch (ssErr) {
      console.error("Screenshot capture failed:", ssErr.message);
    }
    const signals = extractSignals(html, url);
    signals.screenshot = screenshotBase64;
    return signals;
  } finally {
    try {
      await browser.close();
    } catch (closeErr) {
      console.error("Warning: Browser close error (harmless):", closeErr.message);
    }
  }
}

module.exports = { scrapePage, extractSignals };
