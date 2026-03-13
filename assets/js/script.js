document.addEventListener("DOMContentLoaded", () => {

/* --DETECTS WHICH PAGE WE ARE ON -- */
const isScannerPage = document.getElementById("preview") !== null;
const isGeneratorPage = document.getElementById("qr-text") !== null;

/* ########### SCANNER ############# */
if (isScannerPage) {

const previewId = "preview";
const flipBtn = document.getElementById("flip-btn");
const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("file-input");

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

  if (navigator.vibrate) {
    navigator.vibrate(120);
  }

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

/* -------- COPY BUTTON WITH TICK FEEDBACK -------- */
copyBtn.onclick = async () => {

  const text = resultText.textContent;

  try {
    await navigator.clipboard.writeText(text);

    copyBtn.innerHTML = "✓ Copied";
    copyBtn.style.background = "#28c76f";

    if (navigator.vibrate) {
      navigator.vibrate(40);
    }

    setTimeout(() => {
      copyBtn.innerHTML = "Copy";
      copyBtn.style.background = "";
    }, 2000);

  } catch (err) {
    console.error("Copy failed:", err);
  }
};

/* ------------ START CAMERA ---------------- */
async function startScanner() {

  cameras = await Html5Qrcode.getCameras();

  if (!cameras || cameras.length === 0) {
    alert("No camera detected.");
    return;
  }

  let backCamIndex = cameras.findIndex(cam =>
    cam.label.toLowerCase().includes("back") ||
    cam.label.toLowerCase().includes("rear")
  );

  if (backCamIndex === -1) {
    backCamIndex = cameras.length - 1;
  }

  currentCam = backCamIndex;

  qrScanner = new Html5Qrcode(previewId);

  await qrScanner.start(
    { deviceId: { exact: cameras[currentCam].id } },
    {
      fps: 15,
      qrbox: { width: 260, height: 260 }
    },
    decoded => showPopup(decoded)
  );
}

startScanner();

/* ------------ FLIP CAMERA ---------------- */
flipBtn.onclick = async () => {

  if (!qrScanner || !cameras.length) return;

  await qrScanner.stop();

  currentCam = (currentCam + 1) % cameras.length;

  await qrScanner.start(
    { deviceId: { exact: cameras[currentCam].id } },
    {
      fps: 15,
      qrbox: { width: 260, height: 260 }
    },
    decoded => showPopup(decoded)
  );
};

/* ------------ UPLOAD QR IMAGE ---------------- */
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

/* ##################################################
################### GENERATOR #####################
################################################## */

if (isGeneratorPage) {

const input = document.getElementById("qr-text");
const generateBtn = document.getElementById("generate-btn");
const downloadBtn = document.getElementById("download-btn");
const outputBox = document.getElementById("qr-output");

let qrCanvas = null;

generateBtn.onclick = () => {

  const text = input.value.trim();

  if (!text) {
    outputBox.innerHTML = `<p class="muted small">Enter text first</p>`;
    return;
  }

  outputBox.innerHTML = "";

  QRCode.toCanvas(text, { width: 240 }, (err, canvas) => {

    if (err) {
      outputBox.innerHTML = `<p class="muted small">Error generating QR</p>`;
      return;
    }

    qrCanvas = canvas;
    outputBox.appendChild(canvas);
    downloadBtn.disabled = false;
  });
};

downloadBtn.onclick = () => {

  if (!qrCanvas) return;

  const link = document.createElement("a");
  link.download = "qscan_qr.png";
  link.href = qrCanvas.toDataURL("image/png");
  link.click();
};

}

});