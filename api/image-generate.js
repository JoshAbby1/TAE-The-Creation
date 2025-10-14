// read file -> base64
const file = fileInput.files[0];
let imageBase64 = "";
if (file) {
  const bytes = await file.arrayBuffer();
  imageBase64 = `data:${file.type};base64,${btoa(String.fromCharCode(...new Uint8Array(bytes)))}`;
}

const resp = await fetch("/api/image-generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, imageBase64 })
});
