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
  const modelUrl = "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix";

  const buffer = toBuffer(imageBase64);
  const blob = new Blob([buffer], { type: "image/png" });

  const fd = new FormData();
  fd.append("image", blob, "input.png");

  // Photorealistic identity-locked prompt
  const fullPrompt = `${prompt}. keep same person, same face and lighting. ultra realistic photograph, no cartoon, no digital art, no painting.`;
  fd.append("prompt", fullPrompt);

  // Tuned settings for realistic look
  fd.append("strength", "0.15");
  fd.append("guidance_scale", "7");
  fd.append("image_guidance_scale", "2.4");
  fd.append("num_inference_steps", "30");

  // Keep proportions for 9:16 (portrait)
  fd.append("width", "1024");
  fd.append("height", "1820");

  // Prevent cartoon effects
  fd.append(
    "negative_prompt",
    "cartoon, illustration, painting, 3d render, anime, waxy skin, fake face, overexposed, deformed, logo, watermark, text"
  );

  resp = await fetch(modelUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
    body: fd,
  });
}
