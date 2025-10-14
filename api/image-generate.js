import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { prompt, image } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt." });
    }

    // Generate AI image using OpenAI
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    const imageUrl = result.data[0].url;
    return res.status(200).json({ imageUrl });

  } catch (error) {
    console.error("image-generate error:", error);
    return res.status(500).json({ error: "Failed to generate image." });
  }
}
