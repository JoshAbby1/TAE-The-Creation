export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, image } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Simulate AI image generation for now (you can connect a real API later)
    const generatedImage = `https://dummyimage.com/1080x1920/000/fff&text=${encodeURIComponent(prompt)}`;

    return res.status(200).json({ image: generatedImage });
  } catch (error) {
    console.error("Error generating image:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
