import type { NextApiRequest, NextApiResponse } from 'next';
export const config = { api: { bodyParser: { sizeLimit: '15mb' } } };

const PROVIDER = process.env.PROVIDER || 'hosted';
const COMFY_BASE_URL = process.env.COMFY_BASE_URL || 'http://127.0.0.1:8188';
const HOSTED_API_URL = process.env.HOSTED_API_URL || '';
const HOSTED_API_KEY = process.env.HOSTED_API_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { prompt, mode = 'txt2img', imageBase64, options = {} } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    if (PROVIDER === 'comfy') {
      // A1111-compatible
      const endpoint = mode === 'img2img'
        ? `${COMFY_BASE_URL}/sdapi/v1/img2img`
        : `${COMFY_BASE_URL}/sdapi/v1/txt2img`;

      const payload: any = { prompt, ...options };
      if (mode === 'img2img') payload.init_images = [imageBase64];

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const b64 = Array.isArray(data.images) ? data.images[0] : null;
      if (!b64) throw new Error('No image returned');
      return res.status(200).json({ imageBase64: b64 });
    }

    // Hosted provider (OpenArt/Replicate/Stability/etc.)
    const r = await fetch(HOSTED_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(HOSTED_API_KEY ? { 'Authorization': `Bearer ${HOSTED_API_KEY}` } : {})
      },
      body: JSON.stringify({ prompt, mode, imageBase64, options })
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json(); // expect { imageBase64: "..." }
    if (!data.imageBase64) throw new Error('No image returned');
    return res.status(200).json(data);

  } catch (e: any) {
    return res.status(200).json({
      error: 'blocked_or_failed',
      tip: 'Try different phrasing or settings.',
      details: e?.message || 'Unknown error'
    });
  }
}
