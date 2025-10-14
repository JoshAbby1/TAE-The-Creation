export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // ✅ New working endpoint (Public test model)
    const response = await fetch("https://api-inference.huggingface.co/models/prompthero/openjourney-v4", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error("API error: " + text);
    }

    // This model returns raw image bytes
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const imageUrl = `data:image/png;base64,${base64}`;

    res.status(200).json({ image: imageUrl });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server crashed during generation", details: err.message });
  }
}
