document.addEventListener("DOMContentLoaded", () => {

  /* ==================================================
     PAGE DETECTION
  ================================================== */

  const isScannerPage =
    document.getElementById("preview") !== null;

  const isGeneratorPage =
    document.getElementById("qr-text") !== null;

  const isWhatsappPage =
    document.getElementById("phone") !== null;

  const isUpiPage =
    document.getElementById("upi") !== null;

  const isWifiPage =
    document.getElementById("ssid") !== null;


  /* ==================================================
     COMMON QR RENDER FUNCTION
  ================================================== */

  function renderQR(text, outputBox, downloadBtn, setCanvas) {

    if (!text) {
      outputBox.innerHTML =
        `<p class="qr-placeholder">Enter text first</p>`;

      downloadBtn.disabled = true;
      return;
    }

    if (typeof QRCode === "undefined") {
      console.error("Qscan: QRCode library not loaded.");

      outputBox.innerHTML =
        `<p class="qr-placeholder">QR generator unavailable</p>`;

      downloadBtn.disabled = true;
      return;
    }

    outputBox.innerHTML = "";
    downloadBtn.disabled = true;

    QRCode.toCanvas(
      text,
      {
        width: 240,
        margin: 2
      },
      (err, canvas) => {

        if (err) {
          console.error("Qscan: QR generation failed:", err);

          outputBox.innerHTML =
            `<p class="qr-placeholder">Error generating QR</p>`;

          downloadBtn.disabled = true;
          return;
        }

        setCanvas(canvas);

        outputBox.appendChild(canvas);

        downloadBtn.disabled = false;
      }
    );
  }


  /* ==================================================
     SCANNER
  ================================================== */

  if (isScannerPage) {

    const previewId = "preview";

    const flipBtn =
      document.getElementById("flip-btn");

    const uploadBtn =
      document.getElementById("upload-btn");

    const fileInput =
      document.getElementById("file-input");

    const torchBtn =
      document.getElementById("torch-btn");

    const popup =
      document.getElementById("result-popup");

    const closePopupBtn =
      document.getElementById("close-popup");

    const resultText =
      document.getElementById("result-text");

    const copyBtn =
      document.getElementById("copy-btn");


    let qrScanner = null;
    let cameras = [];
    let currentCam = 0;
    let torchOn = false;


    /* ==================================================
       URL DETECTION
    ================================================== */

    function isURL(text) {
      return /^https?:\/\//i.test(text);
    }


    /* ==================================================
       SHOW RESULT
    ================================================== */

    function showPopup(text) {

      if (!popup || !resultText) return;

      if (navigator.vibrate) {
        navigator.vibrate(120);
      }

      resultText.innerHTML = "";

      if (isURL(text)) {

        const link =
          document.createElement("a");

        link.href = text;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = text;

        resultText.appendChild(link);

      } else {

        resultText.textContent = text;
      }

      if (copyBtn) {
        copyBtn.disabled = false;
        copyBtn.innerHTML = "Copy";
        copyBtn.style.background = "";
      }

      popup.classList.remove("hidden");
    }


    /* ==================================================
       CLOSE RESULT
    ================================================== */

    if (closePopupBtn) {

      closePopupBtn.onclick = () => {
        popup.classList.add("hidden");
      };

    }


    /* ==================================================
       COPY RESULT
    ================================================== */

    if (copyBtn) {

      copyBtn.onclick = async () => {

        const text =
          resultText.textContent;

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

          console.error(
            "Qscan: Copy failed:",
            err
          );

        }

      };

    }


    /* ==================================================
       CAMERA AUTOFOCUS
    ================================================== */

    async function applyCameraFocus() {

      if (!qrScanner) return;

      try {

        const track =
          qrScanner.getRunningTrack();

        if (!track || !track.applyConstraints) {
          return;
        }

        const capabilities =
          track.getCapabilities
            ? track.getCapabilities()
            : {};

        if (
          capabilities.focusMode &&
          capabilities.focusMode.includes("continuous")
        ) {

          await track.applyConstraints({
            advanced: [
              {
                focusMode: "continuous"
              }
            ]
          });

          console.log(
            "Qscan: Continuous autofocus enabled"
          );

        } else {

          console.log(
            "Qscan: Continuous autofocus not supported"
          );

        }

      } catch (err) {

        console.log(
          "Qscan: Autofocus unavailable:",
          err
        );

      }

    }


    /* ==================================================
       START CAMERA
    ================================================== */

    async function startScanner(cameraIndex = null) {

      try {

        if (
          typeof Html5Qrcode === "undefined"
        ) {

          console.error(
            "Qscan: html5-qrcode library not loaded."
          );

          alert(
            "Scanner library could not be loaded."
          );

          return;
        }


        /* Get cameras only once */

        if (!cameras.length) {

          cameras =
            await Html5Qrcode.getCameras();

        }


        if (!cameras.length) {

          alert("No camera detected.");
          return;

        }


        /* Select camera */

        if (cameraIndex !== null) {

          currentCam = cameraIndex;

        } else {

          let backCamIndex =
            cameras.findIndex(cam => {

              const label =
                (cam.label || "").toLowerCase();

              return (
                label.includes("back") ||
                label.includes("rear") ||
                label.includes("environment")
              );

            });


          if (backCamIndex === -1) {
            backCamIndex =
              cameras.length - 1;
          }


          currentCam =
            backCamIndex;

        }


        /* Create scanner */

        if (!qrScanner) {

          qrScanner =
            new Html5Qrcode(previewId);

        }


        /* Start camera */

        await qrScanner.start(

          {
            deviceId: {
              exact:
                cameras[currentCam].id
            }
          },

          {
            fps: 15,

            qrbox: {
              width: 260,
              height: 260
            },

            aspectRatio: 1.777778
          },

          decodedText => {

            showPopup(decodedText);

          },

          errorMessage => {
            /* Ignore normal scan errors */
          }

        );


        /* Autofocus */

        await applyCameraFocus();


        /* Torch button */

        if (torchBtn) {

          torchBtn.style.display =
            "inline-block";

        }


        console.log(
          "Qscan: Camera started"
        );

      } catch (err) {

        console.error(
          "Qscan: Camera error:",
          err
        );

        alert(
          "Unable to start camera. Please allow camera permission and try again."
        );

      }

    }


    /* ==================================================
       START CAMERA
    ================================================== */

    startScanner();


    /* ==================================================
       TORCH
    ================================================== */

    if (torchBtn) {

      torchBtn.onclick = async () => {

        if (!qrScanner) return;

        try {

          const track =
            qrScanner.getRunningTrack();

          if (!track) {
            return;
          }


          const capabilities =
            track.getCapabilities
              ? track.getCapabilities()
              : {};


          if (!capabilities.torch) {

            torchBtn.innerHTML =
              "⚠️ Not supported";

            torchOn = false;

            setTimeout(() => {

              torchBtn.innerHTML =
                "🔦 Torch";

            }, 1500);

            return;
          }


          const newTorchState =
            !torchOn;


          await track.applyConstraints({

            advanced: [
              {
                torch:
                  newTorchState
              }
            ]

          });


          torchOn =
            newTorchState;


          torchBtn.innerHTML =
            torchOn
              ? "💡 On"
              : "🔦 Torch";


        } catch (err) {

          console.error(
            "Qscan: Torch error:",
            err
          );

          torchOn = false;

          torchBtn.innerHTML =
            "⚠️ Limited support";

          setTimeout(() => {

            torchBtn.innerHTML =
              "🔦 Torch";

          }, 1800);

        }

      };

    }


    /* ==================================================
       SWITCH CAMERA
    ================================================== */

    if (flipBtn) {

      flipBtn.onclick = async () => {

        if (
          !qrScanner ||
          !cameras.length
        ) {
          return;
        }


        try {

          /* Turn torch off */

          if (torchOn) {

            try {

              const track =
                qrScanner.getRunningTrack();

              if (
                track &&
                track.applyConstraints
              ) {

                await track.applyConstraints({

                  advanced: [
                    {
                      torch: false
                    }
                  ]

                });

              }

            } catch (err) {

              console.log(
                "Qscan: Could not turn torch off:",
                err
              );

            }

          }


          torchOn = false;


          if (torchBtn) {

            torchBtn.innerHTML =
              "🔦 Torch";

          }


          /* Stop current camera */

          await qrScanner.stop();


          /* Next camera */

          currentCam =
            (currentCam + 1) %
            cameras.length;


          /* Start next camera */

          await qrScanner.start(

            {
              deviceId: {
                exact:
                  cameras[currentCam].id
              }
            },

            {
              fps: 15,

              qrbox: {
                width: 260,
                height: 260
              },

              aspectRatio: 1.777778
            },

            decodedText => {

              showPopup(decodedText);

            },

            errorMessage => {
              /* Ignore normal scan errors */
            }

          );


          /* Autofocus again */

          await applyCameraFocus();


          console.log(
            "Qscan: Camera switched"
          );

        } catch (err) {

          console.error(
            "Qscan: Camera switch failed:",
            err
          );

        }

      };

    }


    /* ==================================================
       UPLOAD QR IMAGE
    ================================================== */

    if (
      uploadBtn &&
      fileInput
    ) {

      uploadBtn.onclick = () => {

        fileInput.click();

      };


      fileInput.onchange =
        async event => {

          const file =
            event.target.files[0];

          if (!file) return;


          /*
           * Create temporary scanner
           * dynamically.
           */

          const tempId =
            "qscan-temp-scanner";


          const tempElement =
            document.createElement("div");


          tempElement.id =
            tempId;

          tempElement.style.display =
            "none";


          document.body.appendChild(
            tempElement
          );


          const html5Temp =
            new Html5Qrcode(tempId);


          try {

            const result =
              await html5Temp.scanFile(
                file,
                false
              );

            showPopup(result);

          } catch (err) {

            console.log(
              "Qscan: Image scan failed:",
              err
            );

            showPopup(
              "Invalid QR / Barcode"
            );

          }


          try {

            await html5Temp.clear();

          } catch (err) {

            console.log(
              "Qscan: Temporary scanner cleanup:",
              err
            );

          }


          tempElement.remove();


          /* Allow same file again */

          fileInput.value = "";

        };

    }

  }


  /* ==================================================
     TEXT QR GENERATOR
  ================================================== */

  if (isGeneratorPage) {

    const input =
      document.getElementById("qr-text");

    const downloadBtn =
      document.getElementById("download-btn");

    const outputBox =
      document.getElementById("qr-output");

    let qrCanvas = null;


    function generateTextQR() {

      const text =
        input.value.trim();


      if (!text) {

        outputBox.innerHTML =
          `<p class="qr-placeholder">
            Your QR will appear here
          </p>`;

        downloadBtn.disabled = true;

        qrCanvas = null;

        return;
      }


      renderQR(
        text,
        outputBox,
        downloadBtn,
        canvas => {

          qrCanvas =
            canvas;

        }
      );

    }


    input.addEventListener(
      "input",
      generateTextQR
    );


    downloadBtn.onclick = () => {

      if (!qrCanvas) return;


      const link =
        document.createElement("a");


      link.download =
        "qscan_qr.png";


      link.href =
        qrCanvas.toDataURL(
          "image/png"
        );


      link.click();

    };

  }


  /* ==================================================
     WHATSAPP QR GENERATOR
  ================================================== */

  if (isWhatsappPage) {

    const phone =
      document.getElementById("phone");

    const message =
      document.getElementById("message");

    const downloadBtn =
      document.getElementById("download-btn");

    const outputBox =
      document.getElementById("qr-output");

    let qrCanvas = null;


    function generateWhatsAppQR() {

      let number =
        phone.value.trim();

      const msg =
        message.value.trim();


      if (!number) {

        outputBox.innerHTML =
          `<p class="qr-placeholder">
            Enter phone number
          </p>`;

        downloadBtn.disabled = true;

        qrCanvas = null;

        return;
      }


      number =
        number.replace(
          /\D/g,
          ""
        );


      if (number.length < 10) {

        outputBox.innerHTML =
          `<p class="qr-placeholder">
            Invalid number
          </p>`;

        downloadBtn.disabled = true;

        qrCanvas = null;

        return;
      }


      let waUrl =
        `https://wa.me/${number}`;


      if (msg) {

        waUrl +=
          `?text=${encodeURIComponent(msg)}`;

      }


      renderQR(
        waUrl,
        outputBox,
        downloadBtn,
        canvas => {

          qrCanvas =
            canvas;

        }
      );

    }


    phone.addEventListener(
      "input",
      generateWhatsAppQR
    );

    message.addEventListener(
      "input",
      generateWhatsAppQR
    );


    downloadBtn.onclick = () => {

      if (!qrCanvas) return;


      const link =
        document.createElement("a");


      link.download =
        "whatsapp_qr.png";


      link.href =
        qrCanvas.toDataURL(
          "image/png"
        );


      link.click();

    };

  }


  /* ==================================================
     UPI QR GENERATOR
  ================================================== */

  if (isUpiPage) {

    const upi =
      document.getElementById("upi");

    const name =
      document.getElementById("name");

    const amount =
      document.getElementById("amount");

    const note =
      document.getElementById("note");

    const downloadBtn =
      document.getElementById("download-btn");

    const outputBox =
      document.getElementById("qr-output");

    let qrCanvas = null;


    function generateUpiQR() {

      const pa =
        upi.value.trim();

      const pn =
        name.value.trim();

      const am =
        amount.value.trim();

      const tn =
        note.value.trim();


      if (!pa) {

        outputBox.innerHTML =
          `<p class="qr-placeholder">
            Enter UPI ID
          </p>`;

        downloadBtn.disabled = true;

        qrCanvas = null;

        return;
      }


      let upiUrl =
        `upi://pay?pa=${encodeURIComponent(pa)}`;


      if (pn) {

        upiUrl +=
          `&pn=${encodeURIComponent(pn)}`;

      }


      if (am) {

        upiUrl +=
          `&am=${encodeURIComponent(am)}`;

      }


      if (tn) {

        upiUrl +=
          `&tn=${encodeURIComponent(tn)}`;

      }


      renderQR(
        upiUrl,
        outputBox,
        downloadBtn,
        canvas => {

          qrCanvas =
            canvas;

        }
      );

    }


    upi.addEventListener(
      "input",
      generateUpiQR
    );

    name.addEventListener(
      "input",
      generateUpiQR
    );

    amount.addEventListener(
      "input",
      generateUpiQR
    );

    note.addEventListener(
      "input",
      generateUpiQR
    );


    downloadBtn.onclick = () => {

      if (!qrCanvas) return;


      const link =
        document.createElement("a");


      link.download =
        "upi_qr.png";


      link.href =
        qrCanvas.toDataURL(
          "image/png"
        );


      link.click();

    };

  }


  /* ==================================================
     WIFI QR GENERATOR
  ================================================== */

  if (isWifiPage) {

    const ssid =
      document.getElementById("ssid");

    const password =
      document.getElementById("password");

    const security =
      document.getElementById("security");

    const downloadBtn =
      document.getElementById("download-btn");

    const outputBox =
      document.getElementById("qr-output");

    let qrCanvas = null;


    function generateWifiQR() {

      const s =
        ssid.value.trim();

      const p =
        password.value.trim();

      const t =
        security.value;


      if (!s) {

        outputBox.innerHTML =
          `<p class="qr-placeholder">
            Enter WiFi name
          </p>`;

        downloadBtn.disabled = true;

        qrCanvas = null;

        return;
      }


      let wifiString =
        `WIFI:T:${t};S:${s};`;


      if (t !== "nopass") {

        wifiString +=
          `P:${p};`;

      }


      wifiString += ";";


      renderQR(
        wifiString,
        outputBox,
        downloadBtn,
        canvas => {

          qrCanvas =
            canvas;

        }
      );

    }


    /* Auto generate */

    ssid.addEventListener(
      "input",
      generateWifiQR
    );

    password.addEventListener(
      "input",
      generateWifiQR
    );

    security.addEventListener(
      "change",
      generateWifiQR
    );


    /* Download */

    downloadBtn.onclick = () => {

      if (!qrCanvas) return;


      const link =
        document.createElement("a");


      link.download =
        "wifi_qr.png";


      link.href =
        qrCanvas.toDataURL(
          "image/png"
        );


      link.click();

    };

  }

});
