export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { prompt, ratio = "9:16", strength = 0.35, imageBase64 } = req.body;

    // --- if a photo was uploaded (photo-to-photo path)
    if (imageBase64) {
      const response = await fetch("https://fal.run/fal-ai/flux-pro-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${process.env.FAL_KEY}`, // add this env variable on Vercel
        },
        body: JSON.stringify({
          input: {
            prompt,
            image_url: `data:image/jpeg;base64,${imageBase64}`,
            strength,
            aspect_ratio: ratio,
          },
        }),
      });

      const result = await response.json();
      const imageUrl = result?.images?.[0]?.url;
      if (!imageUrl) throw new Error("Image generation failed.");
      return res.status(200).json({ imageUrl });
    }

    // --- if no photo uploaded (prompt-only path)
    const response = await fetch(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt
      )}?aspectRatio=${ratio}&nologo=true`
    );

    if (!response.ok) throw new Error("Pollinations API failed.");

    // Return the Pollinations URL directly
    const imageUrl = response.url;
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Server crashed" });
  }
}
