// /api/generate-image.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    let raw = req.body;
    if (!raw) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      raw = Buffer.concat(chunks).toString();
    }
    const { prompt, ratio = "9:16" } = JSON.parse(raw || "{}");
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    // Map ratio to size
    const size = ratio === "1:1" ? "1024x1024"
               : ratio === "16:9" ? "1280x720"
               : "1024x1536"; // 9:16 default

    // Call FAL image model (Flux is great quality & quick)
    const r = await fetch("https://fal.run/fal-ai/flux/dev", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        image_size: size,
        num_inference_steps: 30,
        guidance_scale: 3.5,
        seed: Math.floor(Math.random()*1e9)
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: "Image API error", detail: t });
    }

    const data = await r.json();
    // Try common response shapes
    const url =
      data?.image?.url ||
      data?.images?.[0]?.url ||
      data?.output?.[0]?.url ||
      data?.output?.image?.url ||
      null;

    if (!url) return res.status(500).json({ error: "No image URL returned", raw: data });

    return res.status(200).json({ url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error." });
  }
};
