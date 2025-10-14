export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt, provider = "fal-photo", ratio = "9:16", imageBase64 } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    if (provider === "fal-photo") {
  // your fal.ai code goes here
}
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NB_API_KEY || ""}`,
        },
        body: JSON.stringify({ prompt, ratio, image_base64: imageBase64 || undefined }),
      });
      const json = await resp.json();
      const url = json?.output?.url || json?.url;
      if (!url) return res.status(502).json({ error: "NanoBanana returned no image" });
      return res.status(200).json({ imageUrl: url });
    }

    if (provider === "seadream") {
      const resp = await fetch("https://api.seadream.ai/v4/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SD4_API_KEY || ""}`,
        },
        body: JSON.stringify({ prompt, ratio, duration: 5, fps: 24, init_image_base64: imageBase64 }),
      });
      const json = await resp.json();
      const url = json?.output?.url || json?.url;
      if (!url) return res.status(502).json({ error: "SeaDream returned no video" });
      return res.status(200).json({ videoUrl: url });
    }

    return res.status(400).json({ error: "Unknown provider" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
