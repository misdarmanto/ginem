
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// =====================================================
// WIFI
// =====================================================
const char* WIFI_SSID = "Xyz";
const char* WIFI_PASSWORD = "12qwaszx";

// =====================================================
// MQTT HIVEMQ CLOUD
// =====================================================
const char* MQTT_HOST ="";
const int MQTT_PORT = 8883;

const char* MQTT_USERNAME = "";
const char* MQTT_PASSWORD = "";

const char* MQTT_CLIENT_ID = "esp32-1";

// =====================================================
// MQTT TOPIC
// =====================================================
const char* MQTT_TOPIC_TELEMETRY =
  "iot/v1/device/2/telemetry";

const char* MQTT_TOPIC_COMMAND =
  "iot/v1/device/11/command";

// =====================================================
// PIN
// =====================================================
const int LED_PIN = 2;
const int POT_PIN = 34;

// =====================================================
// MQTT CLIENT
// =====================================================
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

// =====================================================
// MQTT CALLBACK
// =====================================================
void mqttCallback(
  char* topic,
  byte* payload,
  unsigned int length
) {

  Serial.println();
  Serial.print("Message Received [");
  Serial.print(topic);
  Serial.println("]");

  // ===============================================
  // CONVERT PAYLOAD TO STRING
  // ===============================================
  String message = "";

  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Payload: ");
  Serial.println(message);

  // ===============================================
  // PARSE JSON
  // ===============================================
  StaticJsonDocument<200> doc;

  DeserializationError error =
    deserializeJson(doc, message);

  if (error) {

    Serial.print("JSON Parse Failed: ");
    Serial.println(error.c_str());

    return;
  }

  // ===============================================
  // GET VALUE
  // ===============================================
  String value = doc["value"];

  Serial.print("Value: ");
  Serial.println(value);

  // ===============================================
  // CONTROL LED
  // ===============================================
  if (value == "1") {

    digitalWrite(LED_PIN, HIGH);

    Serial.println("LED ON");

  } else if (value == "0") {

    digitalWrite(LED_PIN, LOW);

    Serial.println("LED OFF");
  }
}

// =====================================================
// CONNECT WIFI
// =====================================================
void connectWiFi() {

  Serial.println();
  Serial.print("Connecting WiFi");

  WiFi.mode(WIFI_STA);

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  while (WiFi.status() != WL_CONNECTED) {

    Serial.print(".");
    delay(500);

    yield();
  }

  Serial.println();
  Serial.println("WiFi Connected");

  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// =====================================================
// CONNECT MQTT
// =====================================================
void connectMQTT() {

  while (!mqttClient.connected()) {

    Serial.println();
    Serial.print("Connecting MQTT...");

    bool connected = mqttClient.connect(
      MQTT_CLIENT_ID,
      MQTT_USERNAME,
      MQTT_PASSWORD
    );

    if (connected) {

      Serial.println("SUCCESS");

      // ===========================================
      // SUBSCRIBE COMMAND TOPIC
      // ===========================================
      mqttClient.subscribe(
        MQTT_TOPIC_COMMAND
      );

      Serial.print("Subscribed: ");

      Serial.println(
        MQTT_TOPIC_COMMAND
      );

    } else {

      Serial.print("FAILED, rc=");

      Serial.println(
        mqttClient.state()
      );

      delay(3000);
    }

    yield();
  }
}

// =====================================================
// SETUP
// =====================================================
void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println("ESP32 MQTT START");

  // ===============================================
  // LED
  // ===============================================
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);

  // ===============================================
  // POTENTIOMETER
  // ===============================================
  pinMode(POT_PIN, INPUT);

  // ===============================================
  // SSL
  // ===============================================
  secureClient.setInsecure();

  // ===============================================
  // CONNECT WIFI
  // ===============================================
  connectWiFi();

  // ===============================================
  // MQTT SERVER
  // ===============================================
  mqttClient.setServer(
    MQTT_HOST,
    MQTT_PORT
  );

  mqttClient.setCallback(
    mqttCallback
  );
}

// =====================================================
// LOOP
// =====================================================
void loop() {

  // reconnect mqtt
  if (!mqttClient.connected()) {

    connectMQTT();
  }

  mqttClient.loop();

  // ===============================================
  // SEND TELEMETRY EVERY 5 SEC
  // ===============================================
  static unsigned long lastSend = 0;

  if (millis() - lastSend > 5000) {

    lastSend = millis();

    // =============================================
    // READ POTENTIOMETER
    // =============================================
    int sensorValue =
      analogRead(POT_PIN);

    Serial.println();

    Serial.print("Potentiometer: ");
    Serial.println(sensorValue);

    // =============================================
    // JSON PAYLOAD
    // =============================================
    String payload =
      "{\"value\":\"" +
      String(sensorValue) +
      "\"}";

    Serial.print("Publishing: ");

    Serial.println(payload);

    // =============================================
    // PUBLISH MQTT
    // =============================================
    bool ok = mqttClient.publish(
      MQTT_TOPIC_TELEMETRY,
      payload.c_str()
    );

    if (ok) {

      Serial.println("Publish Success");

    } else {

      Serial.println("Publish Failed");
    }

    Serial.print("Free Heap: ");

    Serial.println(
      ESP.getFreeHeap()
    );
  }

  delay(10);
}