export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, imageBase64 } = req.body || {};
    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: 'Missing prompt or image data' });
    }

    // ✅ Use the free model
    const modelUrl = "https://api-inference.huggingface.co/models/prompthero/openjourney-v4";

    const response = await fetch(modelUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: imageBase64
          ? { image: imageBase64, prompt }
          : prompt,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Model request failed:", err);
      return res.status(500).json({ error: "Image generation failed" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const imageUrl = `data:image/png;base64,${base64}`;

    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("image-generate error:", err);
    return res.status(500).json({ error: "Image generation failed" });
  }
}
