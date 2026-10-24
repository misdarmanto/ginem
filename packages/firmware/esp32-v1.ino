#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Bonezegei_DHT11.h>

// =====================================================
// WIFI (isi sebelum flash, jangan di-commit)
// =====================================================
const char* WIFI_SSID = "";
const char* WIFI_PASSWORD = "";

// =====================================================
// MQTT HIVEMQ CLOUD (isi sebelum flash, jangan di-commit)
// =====================================================
const char* MQTT_HOST = "";
const int MQTT_PORT = 8883;
const char* MQTT_USERNAME = "";
const char* MQTT_PASSWORD = "";
const char* MQTT_CLIENT_ID = "esp32-1";

// =====================================================
// MQTT TOPIC
// =====================================================
const char* MQTT_TOPIC_TELEMETRY_DHT11 = "iot/v1/device/9/telemetry";

// =====================================================
// PIN
// =====================================================
#define DHT_PIN 13      // D13
#define RELAY1 4        // D4
#define RELAY2 2        // D2
#define RELAY3 15       // D15
const int POT_PIN = 34;

// =====================================================
// LOGIKA RELAY
// Modul ini: HIGH = ON, LOW = OFF
// Jika suatu saat terbalik lagi, tukar nilai dua baris ini saja
// =====================================================
#define RELAY_ON  HIGH
#define RELAY_OFF LOW

// =====================================================
// DAFTAR RELAY
// Setiap relay punya topic command (masuk) dan topic state (keluar).
// State dikirim balik setelah perintah dieksekusi, sehingga server tahu
// relay benar-benar berpindah dan bukan hanya perintahnya sampai ke broker.
// =====================================================
struct Relay {
  const char* name;
  int pin;
  const char* commandTopic;
  const char* stateTopic;
};

const Relay RELAYS[] = {
  {"RELAY1", RELAY1, "iot/v1/device/8/command",  "iot/v1/device/8/state"},
  {"RELAY2", RELAY2, "iot/v1/device/11/command", "iot/v1/device/11/state"},
  {"RELAY3", RELAY3, "iot/v1/device/10/command", "iot/v1/device/10/state"}
};
const int RELAY_COUNT = sizeof(RELAYS) / sizeof(RELAYS[0]);

const unsigned long TELEMETRY_INTERVAL_MS = 5000;
const unsigned long STATE_HEARTBEAT_MS = 30000;

// =====================================================
// DHT11
// =====================================================
Bonezegei_DHT11 dht(DHT_PIN);

// =====================================================
// MQTT CLIENT
// =====================================================
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

// =====================================================
// RELAY STATE
// =====================================================
bool isRelayOn(const Relay& relay) {
  return digitalRead(relay.pin) == RELAY_ON;
}

void publishRelayState(const Relay& relay) {
  String payload = String("{\"state\":\"") + (isRelayOn(relay) ? "on" : "off") + "\"}";

  bool ok = mqttClient.publish(relay.stateTopic, payload.c_str());

  Serial.print(relay.name);
  Serial.print(" state -> ");
  Serial.print(payload);
  Serial.println(ok ? " (sent)" : " (FAILED)");
}

void publishAllRelayStates() {
  for (int i = 0; i < RELAY_COUNT; i++) {
    publishRelayState(RELAYS[i]);
  }
}

const Relay* findRelayByCommandTopic(const char* topic) {
  for (int i = 0; i < RELAY_COUNT; i++) {
    if (strcmp(topic, RELAYS[i].commandTopic) == 0) {
      return &RELAYS[i];
    }
  }
  return nullptr;
}

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

  // Cari relay sebelum publish apa pun: publish di dalam callback
  // memakai buffer yang sama dengan topic dan payload yang masuk.
  const Relay* relay = findRelayByCommandTopic(topic);

  // ===============================================
  // CONVERT PAYLOAD TO STRING
  // ===============================================
  String message = "";

  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Payload: ");
  Serial.println(message);

  if (relay == nullptr) {
    return;
  }

  // ===============================================
  // PARSE JSON
  // ===============================================
  StaticJsonDocument<100> doc;

  DeserializationError error =
    deserializeJson(doc, message);

  if (error) {

    Serial.print("JSON Parse Failed: ");
    Serial.println(error.c_str());

    return;
  }

  // ===============================================
  // GET VALUE ("1" = ON, "0" = OFF), selain itu diabaikan
  // ===============================================
  String value = doc["value"].as<String>();

  Serial.print("Value: ");
  Serial.println(value);

  if (value == "1") {
    digitalWrite(relay->pin, RELAY_ON);
  } else if (value == "0") {
    digitalWrite(relay->pin, RELAY_OFF);
  } else {
    Serial.println("Unknown value, ignored");
    return;
  }

  // ===============================================
  // KONFIRMASI: baca kembali kondisi relay lalu laporkan ke server
  // ===============================================
  publishRelayState(*relay);
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
      // SUBSCRIBE SEMUA COMMAND TOPIC (QoS 1: server mengirim ulang
      // perintah yang belum di-ACK, misalnya saat koneksi putus sesaat)
      // ===========================================
      for (int i = 0; i < RELAY_COUNT; i++) {
        mqttClient.subscribe(RELAYS[i].commandTopic, 1);

        Serial.print(RELAYS[i].name);
        Serial.print(": ");
        Serial.println(RELAYS[i].commandTopic);
      }

      // Laporkan kondisi relay saat ini agar server sinkron setelah (re)connect.
      publishAllRelayStates();

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

  // ===============================================
  // RELAY: set OFF secepat mungkin saat boot
  // ===============================================
  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(RELAYS[i].pin, OUTPUT);
    digitalWrite(RELAYS[i].pin, RELAY_OFF);
  }

  Serial.begin(115200);

  delay(1000);

  Serial.println("ESP32 MQTT + DHT11 + RELAY START");

  // ===============================================
  // DHT11
  // ===============================================
  dht.begin();

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
  // HEARTBEAT STATE RELAY
  // ===============================================
  static unsigned long lastHeartbeat = 0;

  if (millis() - lastHeartbeat > STATE_HEARTBEAT_MS) {

    lastHeartbeat = millis();

    publishAllRelayStates();
  }

  // ===============================================
  // SEND TELEMETRY EVERY 5 SEC
  // ===============================================
  static unsigned long lastSend = 0;

  if (millis() - lastSend > TELEMETRY_INTERVAL_MS) {

    lastSend = millis();

    // =============================================
    // READ DHT11 TEMPERATURE ONLY
    // =============================================
    float tempC = 0;

    if (dht.getData()) {
      tempC = dht.getTemperature();
    }

    Serial.println();
    Serial.print("Suhu: ");
    Serial.print(tempC);
    Serial.println("°C");

    // =============================================
    // JSON PAYLOAD (Temperature Only)
    // =============================================
    int tempValue = (int)tempC;

    String payload = "{\"value\": \"" + String(tempValue) + "\"}";

    Serial.print("Publishing: ");
    Serial.println(payload);

    // =============================================
    // PUBLISH MQTT
    // =============================================
    bool ok = mqttClient.publish(
      MQTT_TOPIC_TELEMETRY_DHT11,
      payload.c_str()
    );

    if (ok) {

      Serial.println("Publish Success");

    } else {

      Serial.println("Publish Failed");
    }

    Serial.print("Free Heap: ");
    Serial.println(ESP.getFreeHeap());
  }

  delay(10);
}
