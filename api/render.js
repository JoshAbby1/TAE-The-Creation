<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TAE Creations – AI Generator</title>
  <style>
    body {
      background:#0b0b0b;
      color:#fff;
      font-family: Arial, sans-serif;
      display:flex;
      flex-direction:column;
      align-items:center;
      padding:28px;
      min-height:100vh;
    }
    h1 { color:#9cb5ff; margin:0 0 16px; text-align:center; }
    label { margin:14px 0 6px; width:100%; max-width:460px; font-weight:600; }
    textarea, input[type=file], input[type=range] {
      width:100%;
      max-width:460px;
      background:#111;
      color:#eee;
      border:1px solid #222;
      border-radius:10px;
      padding:12px;
    }
    textarea { min-height:110px; resize:vertical; }
    .hint {
      width:100%;
      max-width:460px;
      color:#aaa;
      font-size:13px;
      margin-top:6px;
      text-align:center;
      line-height:1.5;
    }
    button {
      width:100%;
      max-width:460px;
      margin-top:14px;
      padding:14px;
      border:0;
      border-radius:10px;
      background:#5865f2;
      color:#fff;
      font-weight:700;
      font-size:16px;
      cursor:pointer;
    }
    button:disabled { opacity:.6; cursor:not-allowed; }
    #status { margin-top:10px; color:#aaa; text-align:center; }
    #result img { margin-top:18px; max-width:100%; border-radius:12px; border:1px solid #333; }
    .range { width:100%; max-width:460px; display:flex; gap:10px; align-items:center; }
    .range input { flex:1; padding:0; }
  </style>
</head>
<body>
  <h1>TAE Creations – AI Generator</h1>

  <label for="prompt">Prompt</label>
  <textarea id="prompt" placeholder="Describe what you want (e.g., 'man wearing black tracksuit, cinematic lighting, ultra-realistic, 85mm lens')"></textarea>

  <label for="photo">Upload reference photo (optional)</label>
  <input id="photo" type="file" accept="image/*" />

  <div class="hint">
    Upload a photo if you want the AI to keep your appearance —  
    or leave it blank to generate a new realistic image from your prompt.<br><br>
    <strong>Both come out watermark-free.</strong>
  </div>

  <div class="range">
    <span>Match</span>
    <input id="strength" type="range" min="0.20" max="0.70" step="0.05" value="0.35" />
    <span>Style</span>
  </div>
  <div class="hint">Lower = stays closer to uploaded photo. Try 0.30–0.40 for best likeness.</div>

  <button id="generate">Generate (9:16)</button>
  <div id="status"></div>
  <div id="result"></div>

  <script>
    const btn = document.getElementById("generate");
    const statusEl = document.getElementById("status");
    const resultEl = document.getElementById("result");

    function setStatus(t){ statusEl.textContent = t || ""; }
    function fileToBase64(file){
      return new Promise((resolve, reject)=>{
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }

    btn.addEventListener("click", async () => {
      setStatus(""); resultEl.innerHTML = "";
      const prompt = document.getElementById("prompt").value.trim();
      const file = document.getElementById("photo").files[0];
      const strength = Number(document.getElementById("strength").value || 0.35);

      if (!prompt) { setStatus("Please enter a prompt."); return; }

      btn.disabled = true; btn.textContent = "Generating…";
      setStatus("Working its magic… (20–40s)");

      try {
        let imageBase64 = "";
        if (file) imageBase64 = await fileToBase64(file);

        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, ratio:"9:16", strength, imageBase64 })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed.");

        resultEl.innerHTML = `<img src="${data.imageUrl}" alt="Result">`;
        setStatus("Done ✅");
      } catch (e){
        console.error(e);
        setStatus("Error: " + e.message);
      } finally {
        btn.disabled = false; btn.textContent = "Generate (9:16)";
      }
    });
  </script>
</body>
</html>
