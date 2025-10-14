export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, model = "seedreem-4.0", seed } = req.body;

  // Fake placeholder URL — this will be your image generator endpoint later
  const generatedImageUrl = `https://fake-image-api.com/generate?prompt=${encodeURIComponent(
    prompt
  )}&model=${model}&seed=${seed || ""}`;

  res.status(200).json({
    imageUrl: generatedImageUrl,
    message: "Image generated successfully!"
  });
}
