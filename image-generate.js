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

      // Use undici FormData/Blob in Node 18+ (Vercel runtime supports it)
      const fd = new FormData();
      fd.append('image', new Blob([
