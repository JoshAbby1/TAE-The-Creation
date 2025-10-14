export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY in environment');
    return res.status(500).json({ error: 'Server misconfigured: missing OPENAI_API_KEY' });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body' });
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024'
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', data);
      return res.status(500).json({ error: 'OpenAI request failed', details: data });
    }

    const imageUrl = data.data?.[0]?.url;
    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
