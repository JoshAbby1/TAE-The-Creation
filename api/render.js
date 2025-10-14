export const config = { api: { bodyParser: true } };

const SIZE_MAP = {
  "9:16": [1080, 1920],
  "16:9": [1920, 1080],
  "1:1":  [1024, 1024],
  "4:5":  [1080, 1350],
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      prompt,
      ratio = "9:16",
      strength = 0.35,
      imageBase64 = "",
    } = req.body || {};

    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const [width, height] = SIZE_MAP[ratio] || [1080, 1920];

    // 🟣 If NO photo uploaded → use Pollinations (text-to-image)
    if (!imageBase64) {
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt
      )}?nologo=true&width=${width}&height=${height}&model=flux`;
      return res.status(200).json({ imageUrl: pollUrl, provider: "pollinations" });
    }

    // 🟢 If photo uploaded → use FAL (photo-to-photo)
    if (!process.env.FAL_KEY) {
      return res.status(401).json({ error: "FAL_KEY missing on server" });
    }

    const resp = await fetch("https://fal.run/fal-ai/sdxl-image-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${process.env.FAL_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        image: `data:image/*;base64,${imageBase64}`,
        width,
        height,
        strength: Math.max(0.2, Math.min(0.7, Number(strength) || 0.35)),
        guidance_scale: 7,
        scheduler: "euler",
        seed: Math.floor(Math.random() * 1e9),
        negative_prompt:
          "cartoon, cgi, plastic skin, deformed, blurry, low quality",
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "fal.ai error", details: text });
    }

    const out = await resp.json();
    const imageUrl =
      out.image_url ||
      out.url ||
      (out.image_base64 ? `data:image/webp;base64,${out.image_base64}` : null);

    if (!imageUrl) return res.status(502).json({ error: "No image returned" });

    res.status(200).json({ imageUrl, provider: "fal.ai" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
