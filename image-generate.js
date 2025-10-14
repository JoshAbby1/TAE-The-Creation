// /api/image-generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt = '', imageBase64 = '', model = 'seedream4', width = 1080, height = 1920 } = req.body || {};
    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: 'Missing prompt or image' });
    }

    // Map UI labels -> HF models (no watermark)
    const MODEL_MAP = {
      seedream4:  'SG161222/RealVisXL_V5.0',            // photo-realistic SDXL
      nanobanana: 'stabilityai/sdxl-turbo'              // very fast
    };
    const modelId = MODEL_MAP[model] || MODEL_MAP.seedream4;

    // Helper: turn data URL -> Buffer
    const dataUrlToBuffer = (dataUrl) => {
      const b64 = (dataUrl || '').split(',').pop() || '';
      return Buffer.from(b64, 'base64');
    };

    const HF = 'https://api-inference.huggingface.co/models/';
    const url = HF + encodeURIComponent(modelId);

    let hfResp;

    // If we have a reference image -> use image-to-image (multipart/form-data)
    if (imageBase64) {
      const fd = new FormData();
      fd.append('image', new Blob([dataUrlToBuffer(imageBase64)]), 'ref.png');

      // SDXL-style conditioning via JSON in 'parameters'
      fd.append('parameters', new Blob([JSON.stringify({
        prompt,
        width, height,
        guidance_scale: 3.0,
        // lower strength keeps more of the original face/identity
        strength: 0.35
      })], { type: 'application/json' }));

      hfResp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
        body: fd
      });

    } else {
      // Text-to-image path
      hfResp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'image/png'
        },
        body: JSON.stringify({ inputs: prompt, parameters: { width, height } })
      });
    }

    if (!hfResp.ok) {
      const errText = await hfResp.text();
      console.error('HF error:', errText);
      return res.status(500).json({ error: 'Generation failed', details: errText.slice(0, 300) });
    }

    const buf = Buffer.from(await hfResp.arrayBuffer());
    const imageUrl = `data:image/png;base64,${buf.toString('base64')}`;
    return res.status(200).json({ imageUrl });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
