export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  try {
    const { prompt, imageUrl, durationSec = 5, ratio = "9:16", fps = 24, seed = null, style = null } = req.body || {};
    if (!prompt) throw new Error("prompt required");

    // TODO: swap this placeholder for the real Kling 2.1 API call once your key is ready.
    const fakeUrl = `https://example.com/fake-video.mp4?model=kling-2.1&ratio=${encodeURIComponent(ratio)}&duration=${durationSec}`;
    return res.status(200).json({ videoUrl: fakeUrl, filename: `vid_${Date.now()}.mp4` });
  } catch (e) {
    return res.status(400).json({ error: String(e.message || e) });
  }
}
