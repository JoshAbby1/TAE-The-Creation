export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, imageBase64 } = req.body || {};
    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: 'Missing prompt or image data' });
    }

    // ▶️ FLUX.1-schnell model (super fast, photorealistic)
    const modelUrl = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

    const body = {
      inputs: prompt || "",
      parameters: {
        guidance_scale: 3,
        num_inference_steps: 6,
        width: 1024,
        height: 1024
      },
      options: { wait_for_model: true }
    };

    const response = await fetch(modelUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "image/png",
        "X-Use-Cache": "false"
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errTxt = await response.text();
      console.error("HF error:", errTxt);
      return res.status(500).json({ error: "Image generation failed" });
    }

    const buf = Buffer.from(await response.arrayBuffer());
    const imageUrl = `data:image/png;base64,${buf.toString("base64")}`;

    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("image-generate error:", err);
    return res.status(500).json({ error: "Image generation failed" });
  }
}
