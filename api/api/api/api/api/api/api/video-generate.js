export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, model = "kling-2.1", ratio = "9:16", durationSec = 5 } = req.body;

  const generatedVideoUrl = `https://fake-video-api.com/generate?prompt=${encodeURIComponent(
    prompt
  )}&model=${model}&ratio=${ratio}&duration=${durationSec}`;

  res.status(200).json({
    videoUrl: generatedVideoUrl,
    message: "Video generated successfully!"
  });
}
