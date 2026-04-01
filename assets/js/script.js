document.addEventListener("DOMContentLoaded", () => {

/* ===== PAGE DETECTION ===== */
const isScannerPage = document.getElementById("preview") !== null;
const isGeneratorPage = document.getElementById("qr-text") !== null;
const isWhatsappPage = document.getElementById("phone") !== null;
const isUpiPage = document.getElementById("upi") !== null;


/* ==================================================
   🔥 COMMON QR RENDER FUNCTION
================================================== */
function renderQR(text, outputBox, downloadBtn, setCanvas) {

  if (!text) {
    outputBox.innerHTML = `<p class="qr-placeholder">Enter text first</p>`;
    downloadBtn.disabled = true; // 🔥 FIX
    return;
  }

  outputBox.innerHTML = "";

  QRCode.toCanvas(text, { width: 240 }, (err, canvas) => {

    if (err) {
      outputBox.innerHTML = `<p>Error generating QR</p>`;
      return;
    }

    setCanvas(canvas);
    outputBox.appendChild(canvas);
    downloadBtn.disabled = false;
  });
}


/* ==================================================
   🔍 SCANNER
================================================== */
if (isScannerPage) {

const previewId = "preview";
const flipBtn = document.getElementById("flip-btn");
const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("file-input");

const torchBtn = document.getElementById("torch-btn");
let torchOn = false;

const popup = document.getElementById("result-popup");
const closePopupBtn = document.getElementById("close-popup");
const resultText = document.getElementById("result-text");
const copyBtn = document.getElementById("copy-btn");

let qrScanner = null;
let cameras = [];
let currentCam = 0;

function isURL(text) {
  return /^https?:\/\//i.test(text);
}

function showPopup(text) {

  if (navigator.vibrate) navigator.vibrate(120);

  if (isURL(text)) {
    resultText.innerHTML = `<a href="${text}" target="_blank">${text}</a>`;
  } else {
    resultText.textContent = text;
  }

  copyBtn.disabled = false;
  copyBtn.innerHTML = "Copy";
  popup.classList.remove("hidden");
}

closePopupBtn.onclick = () => popup.classList.add("hidden");

copyBtn.onclick = async () => {
  const text = resultText.textContent;

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.innerHTML = "✓ Copied";
    copyBtn.style.background = "#28c76f";

    if (navigator.vibrate) navigator.vibrate(40);

    setTimeout(() => {
      copyBtn.innerHTML = "Copy";
      copyBtn.style.background = "";
    }, 2000);

  } catch (err) {
    console.error("Copy failed:", err);
  }
};

async function startScanner() {

  cameras = await Html5Qrcode.getCameras();

  if (!cameras.length) {
    alert("No camera detected.");
    return;
  }

  let backCamIndex = cameras.findIndex(cam =>
    cam.label.toLowerCase().includes("back") ||
    cam.label.toLowerCase().includes("rear")
  );

  if (backCamIndex === -1) backCamIndex = cameras.length - 1;

  currentCam = backCamIndex;

  qrScanner = new Html5Qrcode(previewId);

  await qrScanner.start(
    { deviceId: { exact: cameras[currentCam].id } },
    { fps: 15, qrbox: { width: 260, height: 260 } },
    decoded => showPopup(decoded)
  );

  if (torchBtn) {
    torchBtn.style.display = "inline-block";
  }
}

startScanner();

if (torchBtn) {
  torchBtn.onclick = async () => {
    if (!qrScanner) return;

    try {
      const track = qrScanner.getRunningTrack();
      torchOn = !torchOn;

      await track.applyConstraints({
        advanced: [{ torch: torchOn }]
      });

      torchBtn.innerHTML = torchOn ? "💡 On" : "🔦 Torch";

    } catch (err) {
      torchBtn.innerHTML ="⚠️ Limited support";

      setTimeout(() => {
        torchBtn.innerHTML = "🔦 Torch";
      }, 1500);

      console.log("Torch not supported:", err);
    }
  };
}

flipBtn.onclick = async () => {

  if (!qrScanner || !cameras.length) return;

  await qrScanner.stop();

  torchOn = false;
  if (torchBtn) torchBtn.innerHTML = "🔦 Torch";

  currentCam = (currentCam + 1) % cameras.length;

  await qrScanner.start(
    { deviceId: { exact: cameras[currentCam].id } },
    { fps: 15, qrbox: { width: 260, height: 260 } },
    decoded => showPopup(decoded)
  );
};

uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = async (e) => {

  const file = e.target.files[0];
  if (!file) return;

  const html5Temp = new Html5Qrcode("preview-temp");

  try {
    const result = await html5Temp.scanFile(file, false);
    showPopup(result);
  } catch {
    showPopup("Invalid QR / Barcode");
  }

  html5Temp.clear();
};

}


/* ==================================================
   ⚡ TEXT GENERATOR
================================================== */
if (isGeneratorPage) {

const input = document.getElementById("qr-text");
const downloadBtn = document.getElementById("download-btn");
const outputBox = document.getElementById("qr-output");

let qrCanvas = null;

function generateTextQR() {

  const text = input.value.trim();

  if (!text) {
    outputBox.innerHTML = `<p class="qr-placeholder">Your QR will appear here</p>`;
    downloadBtn.disabled = true;
    return;
  }

  renderQR(text, outputBox, downloadBtn, (canvas) => {
    qrCanvas = canvas;
  });
}

input.addEventListener("input", generateTextQR);

downloadBtn.onclick = () => {
  if (!qrCanvas) return;

  const link = document.createElement("a");
  link.download = "qscan_qr.png";
  link.href = qrCanvas.toDataURL("image/png");
  link.click();
};

}


/* ==================================================
   💬 WHATSAPP GENERATOR
================================================== */
if (isWhatsappPage) {

const phone = document.getElementById("phone");
const message = document.getElementById("message");

const downloadBtn = document.getElementById("download-btn");
const outputBox = document.getElementById("qr-output");

let qrCanvas = null;

function generateWhatsAppQR() {

  let number = phone.value.trim();
  const msg = message.value.trim();

  if (!number) {
    outputBox.innerHTML = "<p class='qr-placeholder'>Enter phone number</p>";
    downloadBtn.disabled = true;
    return;
  }

  number = number.replace(/\D/g, "");

  if (number.length < 10) {
    outputBox.innerHTML = "<p class='qr-placeholder'>Invalid number</p>";
    downloadBtn.disabled = true;
    return;
  }

  let waUrl = `https://wa.me/${number}`;

  if (msg) {
    waUrl += `?text=${encodeURIComponent(msg)}`;
  }

  renderQR(waUrl, outputBox, downloadBtn, (canvas) => {
    qrCanvas = canvas;
  });
}

phone.addEventListener("input", generateWhatsAppQR);
message.addEventListener("input", generateWhatsAppQR);

downloadBtn.onclick = () => {
  if (!qrCanvas) return;

  const link = document.createElement("a");
  link.download = "whatsapp_qr.png";
  link.href = qrCanvas.toDataURL("image/png");
  link.click();
};

}


/* ==================================================
   💰 UPI GENERATOR
================================================== */
if (isUpiPage) {

const upi = document.getElementById("upi");
const name = document.getElementById("name");
const amount = document.getElementById("amount");
const note = document.getElementById("note");

const downloadBtn = document.getElementById("download-btn");
const outputBox = document.getElementById("qr-output");

let qrCanvas = null;

function generateUpiQR() {

  const pa = upi.value.trim();
  const pn = name.value.trim();
  const am = amount.value.trim();
  const tn = note.value.trim();

  if (!pa) {
    outputBox.innerHTML = "<p class='qr-placeholder'>Enter UPI ID</p>";
    downloadBtn.disabled = true;
    return;
  }

  let upiUrl = `upi://pay?pa=${pa}`;

  if (pn) upiUrl += `&pn=${encodeURIComponent(pn)}`;
  if (am) upiUrl += `&am=${am}`;
  if (tn) upiUrl += `&tn=${encodeURIComponent(tn)}`;

  renderQR(upiUrl, outputBox, downloadBtn, (canvas) => {
    qrCanvas = canvas;
  });
}

upi.addEventListener("input", generateUpiQR);
name.addEventListener("input", generateUpiQR);
amount.addEventListener("input", generateUpiQR);
note.addEventListener("input", generateUpiQR);

downloadBtn.onclick = () => {
  if (!qrCanvas) return;

  const link = document.createElement("a");
  link.download = "upi_qr.png";
  link.href = qrCanvas.toDataURL("image/png");
  link.click();
};

}

});