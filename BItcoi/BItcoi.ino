// ===== SISTEMA IoT: ESP32 + CoinGecko + Backend =====
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "iPhone de Alejandra";           // <- Tu red 2.4 GHz 
const char* password = "cristalyaleja";         // <- Tu contraseña
const char* urlCoinGecko = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
const char* urlBackend = "https://bitcoin-cvaq.onrender.com/api/precios";

unsigned long lastSendTime = 0;
const unsigned long INTERVAL = 1 * 60 * 1000;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=== INICIANDO SISTEMA IoT ===");
  Serial.println("Conectando a WiFi...");
  WiFi.begin(ssid, password);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Conectado!");
    Serial.println("IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ No se conectó a WiFi");
  }
}

void loop() {
  unsigned long ahora = millis();
  
  if (ahora - lastSendTime >= INTERVAL) {
    lastSendTime = ahora;
    obtenerPrecioBitcoin();
  }
  
  delay(1000);
}

void obtenerPrecioBitcoin() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi no conectado");
    return;
  }

  HTTPClient http;
  Serial.println("\n📡 Consultando CoinGecko...");
  
  http.begin(urlCoinGecko);
  int httpCode = http.GET();

  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("✅ Respuesta recibida");
      
      StaticJsonDocument<200> doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (!error) {
        float precio = doc["bitcoin"]["usd"];
        Serial.print("💰 Precio Bitcoin: $");
        Serial.println(precio);
        
        enviarAlBackend(precio);
      } else {
        Serial.println("❌ Error al parsear JSON");
      }
    } else {
      Serial.print("❌ HTTP Error: ");
      Serial.println(httpCode);
    }
  } else {
    Serial.println("❌ Error en conexión HTTP");
  }
  
  http.end();
}

void enviarAlBackend(float precio) {
  WiFiClientSecure *client = new WiFiClientSecure;
  if(client) {
    client->setInsecure();
    
    HTTPClient http;
    Serial.println("📤 Enviando al backend...");
    
    if (http.begin(*client, urlBackend)) {
      http.addHeader("Content-Type", "application/json");
      
      String json = "{\"precio\":" + String(precio) + ",\"moneda\":\"USD\",\"timestamp\":\"" + String(millis()) + "\"}";
      
      int httpCode = http.POST(json);
      
      if (httpCode > 0) {
        Serial.print("📡 Respuesta HTTP: ");
        Serial.println(httpCode);
        
        if (httpCode == HTTP_CODE_OK || httpCode == 201) {
          Serial.println("✅ Enviado OK al backend ✅");
          String response = http.getString();
          Serial.println("Respuesta: " + response);
        } else {
          Serial.print("⚠️  Backend respondió: ");
          Serial.println(httpCode);
        }
      } else {
        Serial.println("❌ No se pudo conectar al backend");
      }
      
      http.end();
    } else {
      Serial.println("❌ No se pudo comenzar HTTP");
    }
    
    delete client;
  } else {
    Serial.println("❌ No se pudo crear WiFiClientSecure");
  }
}