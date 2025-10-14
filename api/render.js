// api/render.js
export const config = { api: { bodyParser: true } };

const SIZE = {
  "9:16": [1080, 1920],
  "16:9": [1920, 1080],
  "1:1": [1024, 1024],
  "4:5": [1080, 1350],
};

// --- Pollinations fallback (text-only) ---
async function pollinations(prompt, width, height) {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?nologo=true&model=flux&width=${width}&height=${height}`;
  const ok = await fetch(url);
  if (!ok.ok) throw new Error("Pollinations error");
  return { imageUrl: url, provider: "pollinations" };
}

// --- FAL Image-to-Image ---
async function falImageToImage({ prompt, b64, ratio }) {
  const endpoint = "https://fal.run/fal-ai/flux-pro"; // or try "flux-pro/v1" if needed
  const body = {
    prompt,
    image_base64: b64,          // ✅ send actual base64 instead of image_url
    strength: 0.35,
    aspect_ratio: String(ratio),
    output_format: "jpeg",      // ✅ required value for Fal
    guidance_scale: 3.5,
    num_inference_steps: 28,
    seed: Math.floor(Math.random() * 1e9),
  };

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${process.env.FAL_KEY}`,
    },
    body: JSON.stringify(body),
  });
}

function extractImageUrl(out) {
  const url =
    out?.image_url ||
    out?.url ||
    (Array.isArray(out?.images) && out.images[0]?.url);
  if (url) return url;

  const b64 =
    out?.image_base64 ||
    (Array.isArray(out?.images) &&
      (out.images[0]?.image_base64 ||
        out.images[0]?.base64 ||
        out.images[0]?.b64));
  return b64 ? `data:image/jpeg;base64,${b64}` : null;
}

// --- Main handler ---
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      prompt,
      ratio = "9:16",
      imageBase64 = "",
    } = req.body || {};

    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const [width, height] = SIZE[ratio] || [1080, 1920];

    // --- TEXT ➜ IMAGE ---
    if (!imageBase64) {
      const out = await pollinations(prompt, width, height);
      return res.status(200).json(out);
    }

    // --- IMAGE ➜ IMAGE ---
    if (!process.env.FAL_KEY) {
      return res.status(401).json({
        error: "fal.ai authentication error",
        details:
          "Missing FAL_KEY in Vercel Environment Variables (Project → Settings → Environment Variables).",
      });
    }

    if (imageBase64.length < 10000) {
      return res.status(400).json({
        error: "Upload error",
        details:
          "Reference image data looks too small. Try another photo or re-upload.",
      });
    }

    const resp = await falImageToImage({ prompt, b64: imageBase64, ratio });
    const text = await resp.text();

    if (!resp.ok) {
      return res
        .status(resp.status)
        .json({ error: "fal.ai error", details: text });
    }

    const out = JSON.parse(text);
    const imageUrl = extractImageUrl(out);
    if (!imageUrl) {
      return res.status(502).json({
        error: "fal.ai error",
        details:
          "No valid image in response: " +
          JSON.stringify(out).slice(0, 600),
      });
    }

    return res.status(200).json({ imageUrl, provider: "fal.ai" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
