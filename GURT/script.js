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

document.addEventListener("DOMContentLoaded", function() {
    startPage.showModal();
})

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
    const newStatus = ` Camera: ${connectionStatus.camera ? "✅" : "❌"} | Serial: ${connectionStatus.serial ? '✅ (<span id="serialTimer"></span>)' : "❌"} | Web Socket: ${connectionStatus.webSocket ? "✅" : "❌"} | Controller: ${connectionStatus.controller ? "✅" : "❌"} ${(connectionStatus.note == "") ? "" : "| " + connectionStatus.note}`;
    // TODO: Add StatusBartSipson
    document.getElementById("statusBar").innerHTML = newStatus;
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
    let streamStarted = false;
    const cameraVideo = document.getElementById("cameraVideo");
    const cameraVideo2 = document.getElementById("cameraVideo2"); 
    let cameraStream;
    let cameraStream2; 
    let cameraIDs = [];
    const canvas = document.getElementById("canvas");
    const canvas2 = document.getElementById("canvas2");

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
                    reconnectCamera(deviceId, videoElement, cameraNumber);
                    error(`Camera ${cameraNumber} disconnected`);
                    navigator.getGamepads()[0].vibrationActuator.playEffect("dual-rumble", {
                      startDelay: 0,
                      duration: 200,
                      weakMagnitude: 1.0,
                      strongMagnitude: 1.0,
                    });
                };
            });

            notification(`Camera ${cameraNumber} connected`);
            return stream;

        } catch (err) {
            console.error(err);
            return null;
        }
    } 

async function startTwoCameras() {
    try {
        const cameras = await getCameraSelection();

        console.log("Available cameras:", cameras);
        cameraIDs = cameras.map(camera => camera.deviceId);

        if (cameras.length < 2) {
            error("You need at least 2 cameras connected but only 1 was found. Excpect issues.");
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

async function reconnectCamera(deviceId, videoElement, cameraNumber) {
    let reconnectInterval = setInterval(async function() {
        if (!connectionStatus.camera) {
            console.log("Attempting to reconnect camera " + cameraNumber + "...");
            if (await startSingleCamera(deviceId, videoElement, cameraNumber)) {
                clearInterval(reconnectInterval);
                connectionStatus.camera = true;
                connectionStatus.note = ``;
                updateStatus();
                navigator.getGamepads()[0].vibrationActuator.playEffect("dual-rumble", {
                    startDelay: 0,
                    duration: 200,
                    weakMagnitude: 1.0,
                    strongMagnitude: 1.0,
                });
            }
        }
    }, 5000);
}

function captureImages() {
    if (cameraVideo) {
        cameraVideo.pause();
        canvas.width = cameraVideo.videoWidth;
        canvas.height = cameraVideo.videoHeight;
        canvas.getContext("2d").drawImage(cameraVideo, 0, 0);
        var dataURL = canvas.toDataURL("image/png");
        cameraVideo.play();
    }

    if (cameraVideo2) {
        cameraVideo2.pause();
        canvas2.width = cameraVideo2.videoWidth;
        canvas2.height = cameraVideo2.videoHeight;
        canvas2.getContext("2d").drawImage(cameraVideo2, 0, 0);
        var dataURL2 = canvas2.toDataURL("image/png");
        cameraVideo2.play();
    }

    var newTab = window.open('about:blank','image from canvas');
    newTab.document.write("<img src='" + dataURL + "' alt='from canvas'/>");
};

// Serial
let receivedData = "";
let port;
let reader;
let lastHeartbeat;

let HorizontalThrust = 0;

async function startSerial() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        reader = textDecoder.readable.getReader();

        while (port.readable) {
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
                        if (line.toLocaleLowerCase() === "hi") {
                            connectionStatus.serial = true;
                            updateStatus();
                            notification("Arduino Connected");
                            setInterval(serialHeartbeatTimer, 1000);
                            moveToStep(3);
                        } else if (line.toLocaleLowerCase() === "hb") {
                            lastHeartbeat = new Date();
                        } else if (line.toLocaleLowerCase().includes("ht")) {
                            HorizontalThrust = line.toLocaleLowerCase().split("ht ")[1];
                        } else {
                            addToConsole(line);
                        }
                    }
                    receivedData = receivedData.substring(newlineIndex + 1);
                }
            }
        }
    } catch (errorText) {
        console.error("Error connecting to Arduino:", errorText);
        if (connectionStatus.serial) error("Arduino Disconnected");
        reader?.cancel();
        reader?.releaseLock();
        if (port) {
            await port.close();
        }
        connectionStatus.serial = false;
        updateStatus();
    }
}

function serialHeartbeatTimer() {
      const now = new Date();
      const diffInMs = now - lastHeartbeat;

      const totalSeconds = Math.floor(diffInMs / 1000);

      if (document.getElementById('serialTimer')) document.getElementById('serialTimer').innerText = `${totalSeconds}s`;
    }

async function writeSerial(dataGotten) {
    // console.log("Writing to Arduino:", dataGotten);
    try {
        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
    
        const data = encoder.encode(dataGotten + '\n');
        await writer.write(data);
    
        // Allow the serial port to be closed later.
        writer.releaseLock();
    } catch (errorText) {
        console.error("Error writing to Arduino:", errorText);
        error("Failed to send data to Arduino");
    }
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

let buttonPressed = new Array(18).fill(false);
let axisRisingEdgeStorage = {}

function gameLoop() {
    // This is where we will check for controller input and send it to the arduino
    const gamepads = navigator.getGamepads();
    if (!gamepads) {
        return;
    }
    
    const gp = gamepads[0]; // Assuming we only care about the first gamepad

    for(i = 0; i < 18; i++){
        if(!gp.buttons[i].pressed) {
            buttonPressed[i] = false;
        } else if (gp.buttons[i].pressed && !buttonPressed[i]) {
            buttonPressed[i] = true;
            buttonAction(i);
        }
    }


    if (gp.axes[0] < -0.5 && !axisRisingEdgeStorage[0]) {
        writeSerial(ResponseKind.Right.toString());
    } else if (gp.axes[0] > 0.5 && !axisRisingEdgeStorage[0]) {
        writeSerial(ResponseKind.Left.toString());
    } else if (gp.axes[1] < -0.5 && !axisRisingEdgeStorage[1]) {
        writeSerial(ResponseKind.Forward.toString());
    } else if (gp.axes[1] > 0.5 && !axisRisingEdgeStorage[1]) {
        writeSerial(ResponseKind.Back.toString());
    } else if (Math.abs(gp.axes[0]) < 0.5 && Math.abs(gp.axes[1]) < 0.5 && (axisRisingEdgeStorage[0] || axisRisingEdgeStorage[1])) {
        writeSerial(ResponseKind.Stop.toString());
    }
    axisRisingEdgeStorage[0] = Math.abs(gp.axes[0]) > 0.5;
    axisRisingEdgeStorage[1] = Math.abs(gp.axes[1]) > 0.5;

    for (var i=0; i<gp.axes.length; i++) {
      const relativeOpacity = Math.max(0.1, Math.min(1, Math.abs(gp.axes[i] ?? 0)));
      document.getElementById("controller1Status").getElementsByClassName("controllerProperty")[i].style.opacity = relativeOpacity;
    }
    

    requestAnimationFrame(gameLoop);
}

function buttonAction(action) {
        if(action == 0){
            writeSerial(ResponseKind.FlashLight.toString());
        } else if(action == 9){
            writeSerial(ResponseKind.FlashLight.toString());
        } else if(action == 17){
            captureImages();
        }
    }

window.addEventListener("gamepadconnected", (e) => {
    const gp = navigator.getGamepads()[e.gamepad.index];
    notification(`Gamepad connected: ${gp.id}`);
    connectionStatus.controller = true;
    gameLoop();
    updateStatus();
});

window.addEventListener("gamepaddisconnected", (e) => {
    notification("Gamepad disconnected");
    connectionStatus.controller = false;
    updateStatus();
    cancelAnimationFrame(gameLoop);
});