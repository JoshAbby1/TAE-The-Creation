export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt, imageBase64 } = req.body || {};

    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: "Missing prompt or image" });
    }

    console.log("Received:", { hasPrompt: !!prompt, hasImage: !!imageBase64 });

    // pick the model
    const modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

    // build the input for Hugging Face
    const inputs = prompt
      ? `${prompt}${imageBase64 ? " (with reference image attached)" : ""}`
      : "Image-to-image generation";

    const response = await fetch(modelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs,
        // if an image is included, attach it as a base64 field Hugging Face can read
        image: imageBase64 ? `data:image/png;base64,${imageBase64}` : undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("HF API error:", errText);
      return res.status(500).json({ error: "Image generation failed", details: errText });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const imageUrl = `data:image/png;base64,${base64}`;

    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
