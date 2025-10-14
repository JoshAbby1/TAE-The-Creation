export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const formData = await new Promise((resolve, reject) => {
      let body = [];
      req.on("data", chunk => body.push(chunk));
      req.on("end", () => resolve(Buffer.concat(body)));
      req.on("error", err => reject(err));
    });

    // Extract prompt from formData (simple text mode only)
    const text = formData.toString();
    const promptMatch = text.match(/name="prompt"\r\n\r\n([^]*)/);
    const prompt = promptMatch ? promptMatch[1].trim() : "realistic portrait photo";

    // Call Whisk AI image generation (free, no API key)
    const whiskURL = "https://api.whisk.ai/image/generate";
    const whiskRes = await fetch(whiskURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "photo-realistic-v1",
        prompt: prompt,
        size: "1080x1920"
      })
    });

    const data = await whiskRes.json();

    if (data && data.image_url) {
      res.status(200).json({ image: data.image_url });
    } else {
      res.status(500).json({ error: "Image generation failed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
