// api/image-generate.js
//
// Features:
// - Text -> Image via SDXL Turbo (fast, realistic, no watermark)
// - Image -> Image via Instruct-Pix2Pix (use user's upload + prompt)
// - Fallback to Pollinations (no key) if HF_API_KEY not set
//
// Request JSON:
// { "prompt": "string", "imageUrl"?: "string", "imageBase64"?: "string" }
// Response JSON:
// { "imageUrl": "string" }  // either a data URL or a direct URL

const HF_TEXT2IMG_MODEL = "stabilityai/sdxl-turbo";
const HF_IMG2IMG_MODEL = "timbrooks/instruct-pix2pix";

// Helper: fetch binary and return base64
async function fetchAsBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch image: ${r.status}`);
  const buf = await r.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    // Accept either object or raw JSON string
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    let imageBase64 = body.imageBase64;
    const imageUrl = body.imageUrl;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing "prompt" (string) in JSON body.' });
    }

    // If we got an image URL but no base64, pull it
    if (!imageBase64 && imageUrl && typeof imageUrl === "string") {
      imageBase64 = await fetchAsBase64(imageUrl);
    }

    const hfKey = process.env.HF_API_KEY;

    // If we have a Hugging Face key, prefer no-watermark generation via HF
    if (hfKey) {
      // If an image is present -> img2img (Instruct-Pix2Pix)
      if (imageBase64 && typeof imageBase64 === "string" && imageBase64.length > 50) {
        const resp = await fetch(`https://api-inference.huggingface.co/models/${HF_IMG2IMG_MODEL}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${hfKey}`,
            "Content-Type": "application/json"
          },
          // Many HF img2img models accept {"inputs": <prompt>, "image": "data:image/...;base64,...."}
          // This model returns raw image bytes.
          body: JSON.stringify({
            inputs: prompt,
            image: `data:image/png;base64,${imageBase64}`,
          })
        });

        if (!resp.ok) {
          const t = await resp.text();
          console.error("HF img2img error:", resp.status, t);
          // Fall through to Pollinations fallback if HF fails
        } else {
          const ab = await resp.arrayBuffer();
          const b64 = Buffer.from(ab).toString("base64");
          const dataUrl = `data:image/png;base64,${b64}`;
          return res.status(200).json({ imageUrl: dataUrl });
        }
      }

      // Otherwise text->image (SDXL Turbo)
      const resp = await fetch(`https://api-inference.huggingface.co/models/${HF_TEXT2IMG_MODEL}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfKey}`,
          "Content-Type": "application/json"
        },
        // SDXL-Turbo works well with fewer steps; HF takes "inputs" (prompt) and optional params.
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            // Low steps for speed; you can tune further
            guidance_scale: 1.5,
            num_inference_steps: 4,
          }
        })
      });

      if (!resp.ok) {
        const t = await resp.text();
        console.error("HF text2img error:", resp.status, t);
        // Fall through to Pollinations fallback below
      } else {
        const ab = await resp.arrayBuffer();
        const b64 = Buffer.from(ab).toString("base64");
        const dataUrl = `data:image/png;base64,${b64}`;
        return res.status(200).json({ imageUrl: dataUrl });
      }
    }

    // ---- Fallback (no key or HF failed) — Pollinations (free; may vary, but no code crash) ----
    // NOTE: Pollinations may sometimes watermark. This is used only when HF is unavailable.
    const seed = Math.floor(Math.random() * 1e9);
    const params = new URLSearchParams({
      model: "flux",
      width: "1024",
      height: "1024",
      n: "1",
      seed: String(seed),
    });
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

    return res.status(200).json({ imageUrl: pollinationsUrl, provider: "pollinations-fallback" });
  } catch (err) {
    console.error("image-generate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
