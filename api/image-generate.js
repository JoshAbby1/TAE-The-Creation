export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    // Stable, free HF model (no watermark) + wait for cold start
    const modelUrl =
      "https://api-inference.huggingface.co/models/prompthero/openjourney-v4?wait_for_model=true";

    const r = await fetch(modelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "image/png",                  // <-- key for getting PNG back
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    // If HF returns JSON, it’s an error—surface it so we know why
    const contentType = r.headers.get("content-type") || "";
    if (!r.ok || !contentType.includes("image/png")) {
      const msg = await r.text().catch(() => "");
      console.error("HF error:", r.status, msg);
      return res.status(500).json({ error: "Image generation failed" });
    }

    const buf = Buffer.from(await r.arrayBuffer());
    const imageUrl = `data:image/png;base64,${buf.toString("base64")}`;
    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("image-generate error:", err);
    return res.status(500).json({ error: "Image generation failed" });
  }
}
