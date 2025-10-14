export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  try {
    const { provider, prompt, imageUrl, ratio = "9:16", steps = 28, cfg = 7, seed = null } = req.body || {};
    if (!prompt) throw new Error("prompt required");
    if (!provider || !["nanobanana", "seedreem4"].includes(provider)) {
      throw new Error('provider must be "nanobanana" or "seedreem4"');
    }

    // TODO: swap these placeholder calls for real provider APIs when you have keys.
    const fakeUrl = `https://example.com/fake-image.jpg?provider=${provider}&ratio=${encodeURIComponent(ratio)}`;
    return res.status(200).json({ imageUrl: fakeUrl, filename: `img_${Date.now()}.webp` });
  } catch (e) {
    return res.status(400).json({ error: String(e.message || e) });
  }
}
