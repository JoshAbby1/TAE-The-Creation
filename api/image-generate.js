<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>TAE Creations – Image Generator</title>
  <style>
    :root { --bg:#0b0b0c; --panel:#151518; --muted:#8b8b95; --text:#eaeaf0; --brand:#7c5cff; }
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font:16px/1.4 system-ui,Segoe UI,Roboto,Helvetica,Arial}
    .wrap{max-width:860px;margin:28px auto;padding:0 16px}
    .card{background:var(--panel);border:1px solid #24242a;border-radius:14px;padding:18px 18px 14px}
    h1{font-size:22px;margin:0 0 6px} p{margin:0 0 14px;color:var(--muted)}
    textarea{width:100%;min-height:90px;border-radius:12px;border:1px solid #2b2b33;background:#101015;color:var(--text);padding:12px;resize:vertical}
    .row{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px}
    .btn{appearance:none;border:0;border-radius:12px;padding:12px 16px;font-weight:600;cursor:pointer}
    .primary{background:var(--brand);color:#fff} .ghost{background:#1a1a20;color:#fff;border:1px solid #2b2b33}
    .uploader{flex:1;min-width:220px;border:1px dashed #2d2d36;border-radius:12px;padding:12px;background:#101015;color:var(--muted)}
    .uploader input{display:none}
    .thumb{margin-top:10px;display:none}
    .thumb img{max-width:100%;border-radius:12px;border:1px solid #25252d}
    .out{margin-top:16px;display:none}
    .out img{max-width:100%;border-radius:14px;border:1px solid #2b2b33}
    .mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size:12px; color:#b3b3bf}
    .spinner{width:18px;height:18px;border:3px solid #ffffff30;border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin 1s linear infinite;margin-right:8px;vertical-align:-3px}
    @keyframes spin{to{transform:rotate(360deg)}}
    .small{font-size:12px;color:var(--muted)}
    .actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    a.dl{color:#a4a4ff;text-decoration:none}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>TAE Creations – Image Generator</h1>
      <p>Type a prompt, optionally add a reference image, then generate.</p>

      <label class="small mono">Prompt</label>
      <textarea id="prompt" placeholder="e.g., hyper-realistic rottweiler wearing sunglasses, studio lighting, 85mm, f1.8"></textarea>

      <div class="row">
        <!-- Uploader -->
        <label class="uploader" id="drop">
          <strong>Reference image (optional)</strong><br>
          <span class="small">drag & drop or click to upload</span>
          <input id="file" type="file" accept="image/*">
          <div class="thumb" id="thumb"><img id="thumbImg" alt=""></div>
        </label>

        <div class="actions">
          <button id="go" class="btn primary">Generate</button>
          <button id="clear" class="btn ghost">Clear</button>
          <span id="status" class="small mono"></span>
        </div>
      </div>

      <div class="out" id="out">
        <p class="small mono" style="margin-bottom:8px">Result</p>
        <img id="result" alt="generated image">
        <div class="row" style="margin-top:10px">
          <a id="dl" class="dl small" download="tae-image.png">Download PNG</a>
        </div>
      </div>
    </div>
  </div>

  <script>
    // 🔧 Set your deployed API URL
    const API_URL = "https://tae-the-creation.vercel.app/api/image-generate";

    const el = (id)=>document.getElementById(id);
    const promptEl = el('prompt');
    const fileEl = el('file');
    const drop = el('drop');
    const thumb = el('thumb');
    const thumbImg = el('thumbImg');
    const go = el('go');
    const clearBtn = el('clear');
    const statusEl = el('status');
    const out = el('out');
    const result = el('result');
    const dl = el('dl');

    // Drag & drop
    ;['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, (e)=>{e.preventDefault(); drop.style.borderColor='#3e3e49'}));
    ;['dragleave','drop'].forEach(ev => drop.addEventListener(ev, (e)=>{e.preventDefault(); drop.style.borderColor='#2d2d36'}));
    drop.addEventListener('click', ()=> fileEl.click());
    drop.addEventListener('drop', (e)=> { if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); });
    fileEl.addEventListener('change', ()=> { if (fileEl.files?.[0]) handleFile(fileEl.files[0]); });

    function handleFile(f){
      if(!f.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => {
        thumbImg.src = e.target.result;
        thumb.style.display = 'block';
      };
      reader.readAsDataURL(f);
    }

    function setBusy(b){
      if (b) {
        go.disabled = true;
        go.innerHTML = '<span class="spinner"></span>Generating…';
        statusEl.textContent = 'calling /api/image-generate';
      } else {
        go.disabled = false;
        go.textContent = 'Generate';
      }
    }

    async function toBase64(file){
      return new Promise((res, rej)=>{
        const r = new FileReader();
        r.onload = ()=> res(String(r.result).split(',')[1]); // strip data: prefix
        r.onerror = rej;
        r.readAsDataURL(file);
      });
    }

    clearBtn.onclick = ()=>{
      promptEl.value = '';
      fileEl.value = '';
      thumb.style.display = 'none';
      out.style.display = 'none';
      statusEl.textContent = '';
    };

    go.onclick = async ()=>{
      const prompt = promptEl.value.trim();
      let imageBase64 = undefined;

      try{
        // Convert optional file to base64
        if (fileEl.files && fileEl.files[0]) {
          statusEl.textContent = 'reading reference image…';
          imageBase64 = await toBase64(fileEl.files[0]);
        }

        if (!prompt && !imageBase64) {
          statusEl.textContent = 'Please add a prompt or an image.';
          return;
        }

        setBusy(true);

        const body = { prompt, ...(imageBase64 ? { imageBase64 } : {}) };

        const r = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if(!r.ok){
          const msg = await r.text().catch(()=> '');
          throw new Error(`API ${r.status}: ${msg || 'failed'}`);
        }

        const data = await r.json();

        // Expecting { imageUrl: "data:image/png;base64,..." }
        if(!data.imageUrl){ throw new Error('No imageUrl in response'); }

        result.src = data.imageUrl;
        dl.href = data.imageUrl;
        out.style.display = 'block';
        statusEl.textContent = 'done ✔';
      } catch(err){
        console.error(err);
        statusEl.textContent = 'Generation failed. Please try again later.';
        out.style.display = 'none';
      } finally {
        setBusy(false);
      }
    };
  </script>
</body>
</html>
