export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // ✅ Free image generator (Pollinations AI)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
  )})?nologo=true&width=1080&height=1920`;

    // Test the URL to confirm it's reachable
    const test = await fetch(imageUrl);
    if (!test.ok) throw new Error("Image generation failed.");

    res.status(200).json({ image: imageUrl });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Server crashed during generation",
      details: err.message,
    });
  }
}
