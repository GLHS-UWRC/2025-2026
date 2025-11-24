#include <Arduino.h>

String inputData = "";

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(100);
    digitalWrite(LED_BUILTIN, LOW);
    delay(100);
  }
  Serial.println("Hello World");
  Serial.println("Serial communication ready!");
}

void loop() {
  
  // Check if data is available to read
  if (Serial.available() > 0) {
    char incoming = Serial.read();  // read one character

    // Build the full string until newline
    if (incoming == '\n') {
      Serial.print("Received: ");
      Serial.println(inputData);  // echo back
      inputData = "";            // clear buffer
    } else {
      inputData += incoming;     // append to buffer
    }
  }

  // Example of sending data periodically
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 2000) {  // every 2 seconds
    Serial.println("Arduino is running...");
    lastSend = millis();
  }
}
