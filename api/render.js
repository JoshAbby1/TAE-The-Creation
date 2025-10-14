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
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const text = buffer.toString();

    const match = text.match(/name="prompt"\r\n\r\n([\s\S]*?)\r\n-/);
    const prompt = match ? match[1].trim() : "photo realistic portrait";

    // ✅ Uses FAL.ai public endpoint – no key required for light use
    const falRes = await fetch("https://api.fal.ai/fal-ai/flux-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        aspect_ratio: "9:16",
        output_format: "url",
      }),
    });

    if (!falRes.ok) {
      const text = await falRes.text();
      throw new Error("FAL error: " + text);
    }

    const data = await falRes.json();
    const imageUrl =
      data?.images?.[0]?.url || data?.image_url || data?.url || null;

    if (imageUrl) {
      return res.status(200).json({ image: imageUrl });
    } else {
      return res.status(500).json({ error: "No image URL returned", data });
    }
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server crashed during generation", details: err.message });
  }
}
