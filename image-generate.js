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
  const modelUrl =
    'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix';

  const fd = new FormData();

  // keep full-quality pixels (don’t downscale to jpg first)
  fd.append('image', new Blob([toBuffer(imageBase64)], { type: 'image/png' }), 'input.png');

  // Strong instruction to keep identity + realism
  const instruction =
    `${prompt}. keep SAME person, SAME face, SAME pose and lighting. ` +
    `hyper-realistic photo, natural skin texture, no painting, no cartoon, no anime`;

  fd.append('prompt', instruction);

  // --- Make it stick to the original face ---
  // lower = preserves more of the original; start 0.15–0.2
  fd.append('strength', '0.15');

  // nudge with text, but not too much
  fd.append('guidance_scale', '7');

  // how strongly to follow the input image (higher = more faithful)
  fd.append('image_guidance_scale', '2.4');

  // stop stylization & artifacts
  fd.append(
    'negative_prompt',
    'cartoon, painting, illustration, anime, cgi, 3d render, plastic/waxy skin, over-smooth, watermark, text, logo, extra fingers'
  );

  // --- 9:16 output (portrait). Pick a size that’s not too huge for free tier. ---
  // 1024x1820 ≈ 9:16 (close enough); you can try 1152x2048 later.
  fd.append('width', '1024');
  fd.append('height', '1820');

  resp = await fetch(modelUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
    body: fd
  });
}
