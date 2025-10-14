export const config = {
  api: {
    bodyParser: true, // ✅ Allow normal JSON
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Prompt missing" });
    }

    // ✅ Use Fal.ai (no key required for testing)
    const falResponse = await fetch("https://fal.run/fal-ai/flux-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
        aspect_ratio: "9:16",
        output_format: "url",
      }),
    });

    if (!falResponse.ok) {
      const text = await falResponse.text();
      throw new Error("FAL error: " + text);
    }

    const data = await falResponse.json();

    const imageUrl =
      data?.images?.[0]?.url || data?.image_url || data?.url || null;

    if (imageUrl) {
      res.status(200).json({ image: imageUrl });
    } else {
      res.status(500).json({ error: "No image URL returned", data });
    }
  } catch (err) {
    console.error("Server error:", err);
    res
      .status(500)
      .json({ error: "Server crashed during generation", details: err.message });
  }
}
