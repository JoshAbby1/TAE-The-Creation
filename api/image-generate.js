export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, imageBase64 } = req.body || {};
    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: "Missing prompt or image data" });
    }

    const hasImage = !!imageBase64;
    const modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

    const body = hasImage
      ? {
          inputs: {
            image: imageBase64,        // <— HF expects { image: "...base64..." }
            prompt: prompt || "",
          },
          parameters: {
            negative_prompt: "blurry, lowres, deformed, watermark, text, logo, bad anatomy",
            strength: 0.28,
            guidance_scale: 7,
            num_inference_steps: 30,
          },
        }
      : {
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, lowres, deformed, watermark, text, logo, bad anatomy",
            guidance_scale: 7,
            num_inference_steps: 30,
          },
        };

    const response = await fetch(modelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("HF API error:", errText);
      return res.status(500).json({ error: "Image generation failed" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const imageUrl = `data:image/png;base64,${base64}`;

    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal error" });
  }
}
