export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing "prompt" (string) in JSON body.' });
    }

    // Build a Pollinations image URL (free, no key). Add seed to avoid caching.
    const seed = Math.floor(Math.random() * 1e9);
    const params = new URLSearchParams({
      model: 'flux',       // or 'sdxl' if you prefer
      width: '1024',
      height: '1024',
      n: '1',
      seed: String(seed),
    });

    const encodedPrompt = encodeURIComponent(prompt.trim());
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

    // Optional: lightweight check it responds (don’t download the whole image)
    // const head = await fetch(imageUrl, { method: 'HEAD' });
    // if (!head.ok) throw new Error('Image service error');

    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error('image-generate error:', err);
    // Fallback to a placeholder so your GPT doesn’t break
    return res.status(200).json({
      imageUrl: 'https://dummyimage.com/1024x1024/000/fff&text=Generation+failed',
      error: 'fallback',
    });
  }
}
