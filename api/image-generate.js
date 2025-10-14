export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { prompt, image } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
        process.env.GOOGLE_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a high-quality AI image from this prompt: ${prompt}${
                    image ? `. Use this image for reference: ${image}` : ""
                  }`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gemini API error");
    }

    // Parse the image URL from Gemini’s response
    const imageUrl =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "https://placehold.co/600x400?text=AI+Image+Error";

    res.status(200).json({ imageUrl });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Image generation failed",
    });
  }
}
