// api/render.js
export const config = { api: { bodyParser: true } };

const SIZE = {
  "9:16": [1080, 1920],
  "16:9": [1920, 1080],
  "1:1":  [1024, 1024],
  "4:5":  [1080, 1350],
};

async function pollinations(prompt, width, height) {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?nologo=true&model=flux&width=${width}&height=${height}`;
  const ok = await fetch(url);
  if (!ok.ok) throw new Error("Pollinations error");
  return { imageUrl: url, provider: "pollinations" };
}

async function falFluxPro_tryA({ prompt, b64, ratio }) {
  // Most common: payload wrapped in { input: {...} }
  return fetch("https://fal.run/fal-ai/flux-pro", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${process.env.FAL_KEY}`,
    },
    body: JSON.stringify({
      input: {
        prompt,
        image_url: `data:image/*;base64,${b64}`,
        strength: 0.35,          // lower = closer to the uploaded face
        aspect_ratio: ratio,     // "9:16"
        output_format: "url",
        guidance_scale: 3.5,
        num_inference_steps: 28,
        seed: Math.floor(Math.random() * 1e9),
      },
    }),
  });
}

async function falFluxPro_tryB({ prompt, b64, ratio }) {
  // Some deployments expect the fields at the top level (no input wrapper)
  return fetch("https://fal.run/fal-ai/flux-pro", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${process.env.FAL_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      image_url: `data:image/*;base64,${b64}`,
      strength: 0.35,
      aspect_ratio: ratio,
      output_format: "url",
      guidance_scale: 3.5,
      num_inference_steps: 28,
      seed: Math.floor(Math.random() * 1e9),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      prompt,
      ratio = "9:16",
      strength = 0.35,       // slider still sent; we can swap it in if you want
      imageBase64 = "",
    } = req.body || {};

    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const [width, height] = SIZE[ratio] || [1080, 1920];

    // ---------- TEXT ➜ IMAGE ----------
    if (!imageBase64) {
      const out = await pollinations(prompt, width, height);
      return res.status(200).json(out);
    }

    // ---------- IMAGE ➜ IMAGE ----------
    if (!process.env.FAL_KEY) {
      return res.status(401).json({
        error: "fal.ai authentication error",
        details: "FAL_KEY is missing on the server (Vercel → Settings → Environment Variables).",
      });
    }
    if (imageBase64.length < 10000) {
      return res.status(400).json({
        error: "Upload error",
        details: "Reference image data looks too small. Try another photo or re-upload.",
      });
    }

    // Try flux-pro (payload A)
    let resp = await falFluxPro_tryA({ prompt, b64: imageBase64, ratio });
    if (!resp.ok) {
      const t = (await resp.text()).slice(0, 800);
      // Auth clarity
      if (resp.status === 401 || resp.status === 403) {
        return res.status(resp.status).json({
          error: "fal.ai authentication error",
          details: t.replace(/\s+/g, " "),
        });
      }
      // Try payload B (no input wrapper)
      resp = await falFluxPro_tryB({ prompt, b64: imageBase64, ratio });
      if (!resp.ok) {
        const t2 = (await resp.text()).slice(0, 800);
        return res.status(502).json({
          error: "fal.ai error",
          details: t2.replace(/\s+/g, " "),
        });
      }
    }

    const out = await resp.json();
    const imageUrl =
      out?.image_url ||
      out?.url ||
      (Array.isArray(out?.images) && out.images[0]?.url) ||
      (out?.image_base64 ? `data:image/webp;base64,${out.image_base64}` : null);

    if (!imageUrl) {
      return res.status(502).json({
        error: "fal.ai error",
        details: ("No image in response: " + JSON.stringify(out)).slice(0, 800),
      });
    }

    return res.status(200).json({ imageUrl, provider: "fal.ai" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
