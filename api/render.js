export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const text = buffer.toString();

    // Extract prompt from the uploaded form data
    const match = text.match(/name="prompt"\r\n\r\n([\s\S]*?)\r\n-/);
    const prompt = match ? match[1].trim() : "realistic photo portrait";

    // ✅ Free photo-real endpoint (Whisk public)
    const whiskRes = await fetch("https://image.whisklab.ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "photomatch-v2",
        prompt,
        aspect_ratio: "9:16",
        quality: "high",
      }),
    });

    const data = await whiskRes.json();

    if (data && data.image_url) {
      return res.status(200).json({ image: data.image_url });
    } else {
      return res.status(500).json({ error: "Image generation failed", details: data });
    }
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server crashed during generation" });
  }
}
