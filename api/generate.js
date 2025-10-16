// /api/generate.js  (CommonJS for Vercel functions)
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Grab EVERY env var that starts with GOOGLE_API_KEY (GOOGLE_API_KEY, GOOGLE_API_KEY_1..._99)
const allKeys = Object.entries(process.env)
  .filter(([name, val]) => name.startsWith("GOOGLE_API_KEY") && val)
  // Base key first, then numbered keys in order
  .sort(([a], [b]) => {
    const A = a === "GOOGLE_API_KEY" ? 0 : parseInt(a.split("_").pop(), 10) || 9999;
    const B = b === "GOOGLE_API_KEY" ? 0 : parseInt(b.split("_").pop(), 10) || 9999;
    return A - B;
  })
  .map(([, val]) => val);

let keyIndex = 0;                        // remembers last key used
const backoffUntil = new Map();          // key -> timestamp ms

function isBackedOff(key){ const t = backoffUntil.get(key); return t && Date.now() < t; }
function backoffKey(key, mins=60){ backoffUntil.set(key, Date.now() + mins*60*1000); }

module.exports = async (req, res) => {
  try {
    // read JSON body
    let raw = req.body;
    if (!raw) { const chunks=[]; for await (const c of req) chunks.push(c); raw = Buffer.concat(chunks).toString(); }
    const { prompt } = JSON.parse(raw || "{}");
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    if (!allKeys.length) return res.status(500).json({ error: "No GOOGLE_API_KEY env vars found." });

    const tries = allKeys.length;
    let lastErr;

    for (let i = 0; i < tries; i++) {
      const key = allKeys[keyIndex];
      // move pointer for next request (round-robin)
      keyIndex = (keyIndex + 1) % allKeys.length;

      if (!key || isBackedOff(key)) continue;

      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response?.text?.() || "";

        return res.status(200).json({ output: text, usedKeyPrefix: key.slice(0,8) + "…" });
      } catch (err) {
        lastErr = err;
        const msg = (err && err.message) ? err.message : String(err);
        if (msg.includes("quota") || msg.includes("exceeded") || msg.includes("429") ||
            msg.includes("rate")  || msg.includes("403")     || msg.includes("401") ||
            msg.includes("unauthorized") || msg.includes("permission")) {
          backoffKey(key, 60); // back off this key for 60 mins
        }
        // try next key
        continue;
      }
    }

    return res.status(503).json({
      error: "All API keys temporarily unavailable (quota/auth). Try again later.",
      detail: (lastErr && lastErr.message) || String(lastErr || "")
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error." });
  }
};
