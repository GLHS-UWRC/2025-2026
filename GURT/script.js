// notes by dodge hikey
// we should use typescript instad of javascrypt
// thansk for listening to my ted talk

const settingsPage = document.getElementById("setting");
const startPage = document.getElementById("start");

const ResponseKind = {
    Stop: 0,
    Forward: 1,
    Back: 2,
    Left: 3,
    Right: 4,
    FlashLight: 5
}

let connectionStatus = {
    camera: false,
    serial: false,
    webSocket: false,
    controller: false,
    note: ""
}

// Camera Vars
let streamStarted = false;
const cameraVideo = document.getElementById("cameraVideo");
const cameraVideo2 = document.getElementById("cameraVideo2"); 
let cameraStream;
let cameraStream2; 


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
   await startTwoCameras();
}

async function testSerial() {
    await startSerial();
}

// Helper Functions

function updateStatus() {
    const newStatus = ` Camera: ${connectionStatus.camera ? "✅" : "❌"} | Serial: ${connectionStatus.serial ? "✅" : "❌"} | Web Socket: ${connectionStatus.webSocket ? "✅" : "❌"} | Controller: ${connectionStatus.controller ? "✅" : "❌"} ${(connectionStatus.note == "") ? "" : "| " + connectionStatus.note}`;
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
        return devices.filter(device => device.kind === "videoinput");
    }

    async function startSingleCamera(deviceId, videoElement, cameraNumber) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);

            videoElement.srcObject = stream;
            videoElement.play();

            stream.getVideoTracks().forEach(track => {
                track.onended = function () {
                    connectionStatus.camera = false;
                    connectionStatus.note = `Camera ${cameraNumber} disconnected`;
                    updateStatus();
                    error(`Camera ${cameraNumber} disconnected`);
                };
            });

            notification(`Camera ${cameraNumber} connected`);
            return stream;

        } catch (err) {
            console.error(err);
            error(`Camera ${cameraNumber} failed to start`);
            return null;
        }
    } 

async function startTwoCameras() {
    try {
        const cameras = await getCameraSelection();

        console.log("Available cameras:", cameras);

        if (cameras.length < 1) {
            error("You need at least 2 cameras connected.");
            return;
        }

        cameraStream = await startSingleCamera(
            cameras[0].deviceId,
            cameraVideo,
            1
        );

        if (!cameraStream) {
            error("Failed to initialize Camera 1");
            return;
        }

        cameraStream2 = await startSingleCamera(
            cameras[1].deviceId,
            cameraVideo2,
            2
        );

        if (!cameraStream2) {
            error("Failed to initialize Camera 2");
            return;
        }

        connectionStatus.camera = true;
        connectionStatus.note = "";
        updateStatus();
        moveToStep(2);
    } catch (err) {
        console.error("Error in startTwoCameras:", err);
        error("Failed to start cameras");
        connectionStatus.camera = false;
        updateStatus();
    }
} 

function stopStream() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(function (track) {
            track.stop();
        });
    }
}

async function reconnectCamera() {
   await startTwoCameras(); 
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

function testSerialConnection() {
    writeSerial(ResponseKind.FlashLight);
}

function changeTheme(color1, color2, color3, color4){
    const root = document.documentElement;
    root.style.setProperty('--color1', color1);
    root.style.setProperty('--color2', color2);
    root.style.setProperty('--color3', color3);
    root.style.setProperty('--color4', color4);
  }

function changeSideBarLocation(newLocation){
    // document.getElementById('serialMenu'). = newLocation;
}

function gameLoop() {
    // This is where we will check for controller input and send it to the arduino
    const gamepads = navigator.getGamepads();
    if (!gamepads) {
        return;
    }
    
    const gp = gamepads[0]; // Assuming we only care about the first gamepad

    if (gp.buttons[0].pressed) {
        // Button B
    }

    

    requestAnimationFrame(gameLoop);
}

let keep_going = false;

window.addEventListener("gamepadconnected", (e) => {
    const gp = navigator.getGamepads()[e.gamepad.index];
    notification(`Gamepad connected: ${gp.id}`);
    connectionStatus.controller = true;
    gameLoop();
    updateStatus();
});

window.addEventListener("gamepaddisconnected", (e) => {
    gamepadInfo.textContent = "Waiting for gamepad.";
    connectionStatus.controller = false;
    updateStatus();
    cancelAnimationFrame(gameLoop);
});