export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt = '', imageBase64 } = req.body || {};
    if (!prompt && !imageBase64) return res.status(400).json({ error: 'Missing prompt or image' });

    // Helper: turn data URL/Base64 -> Buffer
    const toBuffer = (dataUrl) => {
      const b64 = (dataUrl || '').split(',').pop();       // handles "data:image/...;base64,XXXX"
      return Buffer.from(b64, 'base64');
    };

    let resp;

    if (imageBase64) {
  // ---------- IMAGE -> IMAGE (edit) ----------
  const modelUrl = 'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix';

  const fd = new FormData();
  fd.append('image', new Blob([toBuffer(imageBase64)], { type: 'image/png' }), 'input.png');

  // Force realism and identity consistency
  const instruction = `${prompt}. keep same person, face, pose, lighting and background. ultra photorealistic photo, natural skin texture, no painting style`;
  fd.append('prompt', instruction);

  // Photoreal-focused settings
  fd.append('num_inference_steps', '30');
  fd.append('guidance_scale', '6.5');
  fd.append('image_guidance_scale', '2.0');
  fd.append('strength', '0.30');

  // Avoid stylised / cartoonish outputs
  fd.append(
    'negative_prompt',
    'cartoon, painting, illustration, anime, cgi, 3d, plastic skin, smooth wax skin, overexposed, deformed, extra fingers, watermark, text'
  );

  resp = await fetch(modelUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
    body: fd
  });
}
