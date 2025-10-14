export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, imageBase64 } = req.body || {};
    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: 'Missing prompt or image input' });
    }

    // Use your Hugging Face token from Vercel environment variables
    const HF_TOKEN = process.env.HF_API_KEY;

    const modelUrl = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev";

    const payload = imageBase64
      ? { inputs: prompt || "", image: imageBase64 }
      : { inputs: prompt || "" };

    const response = await fetch(modelUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("HF error:", err);
      return res.status(500).json({ error: "Image generation failed" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    // Return image as base64 markdown (no watermark, realistic)
    const imageUrl = `data:image/png;base64,${base64Image}`;
    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
