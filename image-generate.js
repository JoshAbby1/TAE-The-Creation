// /api/image-generate.js
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      prompt = "",
      imageBase64 = "",
      model = "seedream",
      params = {},
    } = req.body || {};

    // 9:16 output defaults
    const width = Number(params.width ?? 768);
    const height = Number(params.height ?? 1365);
    const steps = Number(params.num_inference_steps ?? 28);
    const guidance = Number(params.guidance_scale ?? 4.5);
    const strength = Number(params.strength ?? 0.65);
    const negative = params.negative_prompt || "";

    // Utility: convert Buffer -> base64 data URL
    const toDataUrl = (buf, mime = "image/jpeg") =>
      `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;

    // ============================
    // A) Image → Image (real photo edit)
    // ============================
    if (imageBase64) {
      const HF_MODEL = "stabilityai/stable-diffusion-2";
      const endpoint = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

      // prepare image buffer
      const b64 = (imageBase64.split(",")[1] || imageBase64).trim();
      const imgBytes = Buffer.from(b64, "base64");

      // multipart form for Hugging Face
      const boundary = "----tae" + Math.random().toString(16).slice(2);
      const dash = `--${boundary}`;

      const parts = [];
      parts.push(
        `${dash}\r\nContent-Disposition: form-data; name="image"; filename="input.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
      );
      parts.push(imgBytes);
      parts.push(`\r\n`);

      const payload = {
        prompt,
        negative_prompt: negative,
        guidance_scale: guidance,
        num_inference_steps: steps,
        strength,
        width,
        height,
      };
      parts.push(
        `${dash}\r\nContent-Disposition: form-data; name="parameters"\r\n\r\n`
      );
      parts.push(JSON.stringify(payload));
      parts.push(`\r\n${dash}--\r\n`);

      const body = Buffer.concat(
        parts.map((p) => (typeof p === "string" ? Buffer.from(p) : p))
      );

      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      if (!r.ok) {
        const t = await r.text();
        console.error("HF i2i error:", t);
        return res.status(500).json({
          error: "Image generation failed",
          details: "HuggingFace image2image",
        });
      }

      const buf = Buffer.from(await r.arrayBuffer());
      return res
        .status(200)
        .json({ imageUrl: toDataUrl(buf, r.headers.get("content-type")) });
    }

    // ============================
    // B) Text → Image (Seedream / Nano Banana)
    // ============================
    const base = "https://image.pollinations.ai/prompt/";
    const chosenModel =
      model === "banana" ? "nano-banana" : "seedream-4.0";

    const q = new URLSearchParams({
      model: chosenModel,
      width: String(width),
      height: String(height),
      steps: String(steps),
      g: String(guidance),
      enhance: "true",
    });

    const finalPrompt = negative
      ? `${prompt}, negative prompt: ${negative}`
      : prompt;

    const url = `${base}${encodeURIComponent(finalPrompt)}?${q.toString()}`;
    const out = await fetch(url);

    if (!out.ok) {
      const t = await out.text();
      console.error("Pollinations error:", t);
      return res.status(500).json({ error: "Image generation failed" });
    }

    // Convert to base64 to avoid any watermark/branding in URL
    const buf = Buffer.from(await out.arrayBuffer());
    return res.status(200).json({
      imageUrl: toDataUrl(buf, out.headers.get("content-type")),
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
