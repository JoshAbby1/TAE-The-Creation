export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // TEMP: always return a placeholder image based on the prompt
    const imageUrl =
      `https://dummyimage.com/1024x1024/000/fff.png&text=${encodeURIComponent(prompt)}`;

    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error('image-generate error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
