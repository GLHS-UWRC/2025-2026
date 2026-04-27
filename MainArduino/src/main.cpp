#include <Arduino.h>
#include <Wire.h>
#include <Motoron.h>
// #include <stddef.h>

String inputData = "";
int HorizontalThrust = 0;
enum class ResponseKind {
    Stop = 0,
    Forward = 1,
    Back = 2,
    Left = 3,
    Right = 4,
    FlashLight = 5
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
      } else if (inputData == "5"){
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
  if (millis() - lastSend > 2000) {  // every 2 seconds
    Serial.println("HB");
    Serial.print("HT ");
    Serial.println(HorizontalThrust);
    lastSend = millis();
  }

  if (HorizontalThrust == 1) {
    mc2.setSpeed(1, 400);
    mc3.setSpeed(2, 400);
  }
  
}
