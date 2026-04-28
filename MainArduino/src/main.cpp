#include <Arduino.h>
#include <Wire.h>
#include <Motoron.h>
// #include <stddef.h>

String inputData = "";
int HorizontalThrust = 0;
int VerticalThrust = 0;
enum class ResponseKind {
    Stop = 0,
    Forward = 1,
    Back = 2,
    Left = 3,
    Right = 4,
    StopVertical = 5,
    Up = 6,
    Down = 7,
    RollLeft = 8,
    RollRight = 9,
    FlashLight = 10
};

MotoronI2C mc2(2);
MotoronI2C mc3(3);
MotoronI2C mc4(4);
MotoronI2C mc5(5);

void setupController(MotoronI2C &mc) {
  mc.reinitialize();
  mc.clearResetFlag();
  mc.setMaxAcceleration(1, 100); 
  mc.setMaxAcceleration(2, 100);
}

void setup() {
  Serial.begin(9600);

  pinMode(LED_BUILTIN, OUTPUT);
  
  Wire.begin();

  setupController(mc2);
  setupController(mc3);
  setupController(mc4);
  setupController(mc5);

  while (!Serial) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(100);
    digitalWrite(LED_BUILTIN, LOW);
    delay(100);
  }
  Serial.println("Hi");
}

void loop() {
  
  // Check if data is available to read
  if (Serial.available() > 0) {
    char incoming = Serial.read();  // read one character

    // Build the full string until newline
    if (incoming == '\n') {
      if (inputData == "0" || inputData == "1" || inputData == "2" || inputData == "3" || inputData == "4") {
        HorizontalThrust = inputData.toInt();
      } else if (inputData == "5" || inputData == "6" || inputData == "7" || inputData == "8" || inputData == "9") {
        VerticalThrust = inputData.toInt();
      } else if (inputData == "10"){
        digitalWrite(LED_BUILTIN, HIGH);  // turn on LED
        delay(500);
        digitalWrite(LED_BUILTIN, LOW);   // turn off LED
        Serial.println("LED Flash");
      } else {
        Serial.print("Received unknown command: ");
        Serial.println(inputData);  // echo back
      }
      inputData = "";            // clear buffer
    } else {
      inputData += incoming;     // append to buffer
    }
  }

  // Example of sending data periodically
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 250) {  // every 250 milliseconds
    Serial.println("HB");
    Serial.print("HT ");
    Serial.println(HorizontalThrust);
    Serial.print("VT ");
    Serial.println(VerticalThrust);
    lastSend = millis();
  }

  if (HorizontalThrust == 1) {
    // Forward
    mc5.setSpeed(2, 400);
    mc4.setSpeed(2, 400);
  } else if (HorizontalThrust == 2) {
    // Back
    mc5.setSpeed(2, -400);
    mc4.setSpeed(2, -400);
  } else if (HorizontalThrust == 3) {
    // Left
    mc5.setSpeed(2, -400);
    mc4.setSpeed(2, 400);
  } else if (HorizontalThrust == 4) {
    // Right
    mc5.setSpeed(2, 400);
    mc4.setSpeed(2, -400);
  } else {
    // Stop
    mc5.setSpeed(2, 0);
    mc4.setSpeed(2, 0);
  }

  if (VerticalThrust == 6) {
    // Up
    mc5.setSpeed(1, -400);
    mc4.setSpeed(1, -400);
  } else if (VerticalThrust == 7) {
    // Down
    mc5.setSpeed(1, 400);
    mc4.setSpeed(1, 400);
  } else {
    // Stop Vertical
    mc5.setSpeed(1, 0);
    mc4.setSpeed(1, 0);
  }
  
  
}
