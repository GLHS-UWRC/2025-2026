const settingsPage = document.getElementById("setting");
const startPage = document.getElementById("start");

let connectionStatus = {
    camera: false,
    serial: false,
    webSocket: false,
    note: ""
}

// Camera Vars
let streamStarted = false;
const cameraVideo = document.getElementById("cameraVideo");
let cameraStream;

document.addEventListener("DOMContentLoaded", function() {
    startPage.showModal();
})

let port;

// Steps
function moveToStep(step) {
    document.getElementById("step1").style.display = (step == 1) ? "block" : "none";
    document.getElementById("step2").style.display = (step == 2) ? "block" : "none";
    document.getElementById("step3").style.display = (step == 3) ? "block" : "none";
}

async function testCamera() {
    if (await startStream(cameraConstraints) == "true") {
        moveToStep(2);
        
    }
}

async function testSerial() {
    await startSerial();
}

// Helper Functions

function updateStatus() {
    const newStatus = ` Camera: ${connectionStatus.camera ? "✅" : "❌"} | Serial: ${connectionStatus.serial ? "✅" : "❌"} | Web Socket: ${connectionStatus.webSocket ? "✅" : "❌"} ${(connectionStatus.note == "") ? "" : "| " + connectionStatus.note}`;
    // TODO: Add StatusBartSipson
    document.getElementById("statusBar").innerText = newStatus;
    document.getElementById("stepsBar").innerText = newStatus;
}

function openMenu(menuNum) {
    document.getElementById('cameraMenu').close();
    document.getElementById('serialMenu').close();
    document.getElementById('floatMenu').close();

    switch (menuNum) {
        case 1:
            document.getElementById('cameraMenu').show();
            break;
        
        case 2:
            document.getElementById('serialMenu').show();
            break;
        
        case 3:
            document.getElementById('floatMenu').show();
            break;
        default:
            break;
    }
}

function notification(notaName) {
  var x = document.getElementById("notification");
  x.innerHTML = notaName;
  x.className = "show";
  setTimeout(function () {
    x.className = x.className.replace("show", "");
  }, 4500);
}
  
function error(notaName) {
  console.error(notaName);
  var x = document.getElementById("error");
  x.innerHTML = notaName;
  x.className = "show";
  setTimeout(function () {
    x.className = x.className.replace("show", "");
  }, 4500);
}

// Camera
let cameraConstraints = {
    video: {
      width: {
        min: 1280,
        ideal: 1920,
        max: 2560
      },
      height: {
        min: 720,
        ideal: 1080,
        max: 1440
      }
    }
};
  
async function getCameraSelection() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");

    return videoDevices;
    const options = videoDevices.map((videoDevice) => {
      return `<option value="${videoDevice.deviceId}">${videoDevice.label}</option>`;
    });
    cameraOptions.innerHTML = options.join("");
}
  
async function startStream(constraints) {
    let res;
    
    await navigator.mediaDevices.getUserMedia(constraints)
        .then(function (stream) { 
            cameraStream = stream
            res = "true";
            cameraVideo.srcObject = cameraStream;
            connectionStatus.camera = true;
            updateStatus();
            notification("Camera Connected");
            cameraStream.getVideoTracks().forEach(function(track) {
                track.onended = function () {
                    connectionStatus.camera = false;
                    connectionStatus.note = "Camera Disconnected. Attempting to Reconnect."
                    updateStatus();
                    error("Camera Disconnected")
                    reconnectCamera();
                };
              });
        })
        .catch(function (error) {
            if (error.name === 'NotAllowedError') {
                res = 'Camera access denied by the user.';
                error("Camera access denied.");
            } else if (error.name === 'NotFoundError') {
                console.error('No camera found.');
                res = "The Camera was not found. Please check the conection then try agein. ";
            } else {
                console.error('getUserMedia error:', error);
                res = 'getUserMedia error: ' + error
            }
        })
    return res;
};

function stopStream() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(function (track) {
            track.stop();
        });
    }
}

async function reconnectCamera() {
    if (await startStream(cameraConstraints) != "true") {
        setTimeout(() => {
            reconnectCamera();
        }, 5000);
    } else if (connectionStatus.note == "Camera Disconnected. Attempting to Reconnect.") {
        connectionStatus.note = "";
        updateStatus();
    }
    
}

// Serial
let receivedData = "";

async function startSerial() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                console.log("No Arduino")
                reader.releaseLock();
                break;
            }
            receivedData += value;
            let newlineIndex;

            while ((newlineIndex = receivedData.indexOf('\n')) !== -1) {
                const line = receivedData.substring(0, newlineIndex).trim();
                if (line) {
                    if (line.toLocaleLowerCase() === "hello world") {
                        connectionStatus.serial = true;
                        updateStatus();
                        notification("Arduino Connected");
                        moveToStep(3);
                    }

                    addToConsole(line);
                }
                receivedData = receivedData.substring(newlineIndex + 1);
            }
        }
    } catch (errorText) {
        console.error("Error connecting to Arduino:", errorText);
        if (connectionStatus.serial) error("Arduino Disconnected");
        connectionStatus.serial = false;
        updateStatus();
    }
}

async function writeSerial(dataGotten) {
    const writer = port.writable.getWriter();
    const encoder = new TextEncoder();

    const data = encoder.encode(dataGotten + '\n');
    await writer.write(data);

    // Allow the serial port to be closed later.
    writer.releaseLock();
}

function addToConsole(line) {
    const consoleElement = document.getElementById('console');
    let nextLine = document.createElement('li');
    nextLine.innerText = line;
    consoleElement.appendChild(nextLine);
    nextLine.scrollIntoView();
}

function changeTheme(color1, color2, color3, color4){
    const root = document.documentElement;
    root.style.setProperty('--color1', color1);
    root.style.setProperty('--color2', color2);
    root.style.setProperty('--color3', color3);
    root.style.setProperty('--color4', color4);
  }
