// ===== SISTEMA IoT: ESP32 + CoinGecko + Backend (CON AUTENTICACIÓN) =====
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "emcali_602_24_Ghz";           // <- Tu red 2.4 GHz
const char* password = "6023342942mpeyy";         // <- Tu contraseña
const char* urlCoinGecko = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
const char* urlBackend = "http://192.168.1.18:3000/api/precios";  // ← Backend local con puerto 3000

// ============= CREDENCIALES DEL ESP32 =============
const char* ID_ESP32 = "ESP32_BITCOIN_001";
const char* API_KEY = "sk_prod_1776821164150_iggo20d4p";  // ← API Key registrada en MongoDB

// ============= VARIABLES DE TIEMPO =============
unsigned long lastSendTime = 0;
const unsigned long INTERVAL = 1 * 60 * 1000;    // 1 minuto

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=== INICIANDO SISTEMA IoT (AUTENTICADO) ===");
  Serial.print("ID Dispositivo: ");
  Serial.println(ID_ESP32);
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
  
  // Verificar si pasaron 5 minutos
  if (ahora - lastSendTime >= INTERVAL) {
    lastSendTime = ahora;
    obtenerPrecioBitcoin();
  }
  
  delay(1000); // Verificar cada segundo
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
      
      // Parsear JSON
      StaticJsonDocument<200> doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (!error) {
        float precio = doc["bitcoin"]["usd"];
        Serial.print("💰 Precio Bitcoin: $");
        Serial.println(precio);
        
        // Enviar al backend
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
  // Para localhost (HTTP), usar HTTPClient normal
  HTTPClient http;
  
  Serial.println("📤 Enviando al backend local...");
  
  if (http.begin(urlBackend)) {
    http.addHeader("Content-Type", "application/json");
    
    // ============= JSON CON ID Y API KEY =============
    String json = "{\"id_dispositivo\":\"";
    json += ID_ESP32;
    json += "\",\"api_key\":\"";
    json += API_KEY;
    json += "\",\"precio\":";
    json += String(precio);
    json += ",\"moneda\":\"USD\"}";
    
    int httpCode = http.POST(json);
    
    if (httpCode > 0) {
      if (httpCode == 201) {
        Serial.println("✅ Enviado OK al backend (201)");
      } else if (httpCode == 401) {
        Serial.println("❌ Error 401: ID o API Key inválidos");
      } else if (httpCode == 403) {
        Serial.println("❌ Error 403: Dispositivo inactivo");
      } else {
        Serial.print("⚠️ Backend respondió: ");
        Serial.println(httpCode);
      }
    }
    
    http.end();
  }
}