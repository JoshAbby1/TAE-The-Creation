// api/render.js — uses fal.ai SDXL image-to-image
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      prompt,
      ratio = "9:16",
      imageBase64 = "",     // base64 of uploaded reference (from the front-end)
      strength = 0.35       // lower = closer to the reference
    } = req.body || {};

    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    if (!process.env.FAL_KEY) return res.status(401).json({ error: "FAL_KEY is missing on the server" });

    const sizeMap = { "9:16":[1080,1920], "16:9":[1920,1080], "1:1":[1024,1024], "3:4":[1024,1365], "4:5":[1080,1350] };
    const [width, height] = sizeMap[ratio] || [1024,1024];

    const resp = await fetch("https://fal.run/fal-ai/sdxl-image-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${process.env.FAL_KEY}`
      },
      body: JSON.stringify({
        prompt,
        image: imageBase64 ? `data:image/*;base64,${imageBase64}` : null,
        width,
        height,
        strength,            // 0.3–0.45 sticks close to the ref
        guidance_scale: 7,
        scheduler: "euler",
        seed: Math.floor(Math.random() * 999999),
        negative_prompt: "cartoon, cgi, plastic skin, deformed hands, extra fingers, blurry, low quality"
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "fal.ai error", details: text });
    }

    const out = await resp.json();
    const imageUrl = out.image_url || out.url || (out.image_base64 ? `data:image/webp;base64,${out.image_base64}` : null);
    if (!imageUrl) return res.status(502).json({ error: "No image returned from fal.ai" });

    return res.status(200).json({ imageUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
