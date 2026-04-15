# Sistema IoT Bitcoin - ESP32 + Backend + MongoDB

## 📋 Descripción del Proyecto

Sistema IoT completo que monitorea el precio del Bitcoin en tiempo real:

- **ESP32** consulta la API de CoinGecko cada 1 minuto
- **Backend Node.js** recibe los datos vía HTTP POST
- **MongoDB Atlas** almacena el historial de precios
- **Frontend Dashboard** muestra los datos en tiempo real

## 📁 Estructura del Proyecto

```
Proyecto esp32/
├── backend/                    # Backend Node.js + Express
│   ├── server.js              # Servidor principal (MongoDB integrado)
│   ├── package.json           # Dependencias
│   ├── package-lock.json
│   └── public/
│       └── index.html         # Frontend dashboard
├── Codigo de esp32            # Firmware del microcontrolador
├── Contexto del proyecto      # Documentación general
└── README.md                  # Este archivo
```

## 🚀 Tecnologías Utilizadas

- **ESP32** (Arduino C++)
- **Node.js + Express**
- **MongoDB Atlas**
- **Mongoose ORM**
- **ngrok** (temporal) → **Render** (producción)

## ⚙️ Configuración Local

### Requisitos
- Node.js 14+
- MongoDB Atlas cuenta (ya configurada)
- Arduino IDE con ESP32 board

### Backend Setup

```bash
cd backend
npm install
```

### Variables de Entorno
Crear `.env` en la carpeta `backend/`:
```
PORT=3000
MONGO_URI=mongodb+srv://Prueba:EdlicA6qY2fxU7n4@cluster0.0ht3eoq.mongodb.net/TuCobradorDB?retryWrites=true&w=majority
```

### Ejecutar Backend Local

```bash
cd backend
npm start
```

El servidor estará disponible en: `http://localhost:3000`

## 📡 Configuración del ESP32

1. Abrir `Codigo de esp32` en Arduino IDE
2. Configurar:
   - SSID: `emcali_602_24_Ghz`
   - Password: `tu_contraseña`
   - URL Backend: `https://tu-render-url.onrender.com/api/precios`
3. Cargar en ESP32 (Puerto COM9)

### Intervalo de Envío
- Actual: **1 minuto** (línea 12: `const unsigned long INTERVAL = 1 * 60 * 1000;`)

## 🌐 Deploy en Render

### Paso 1: Conectar GitHub a Render
1. Ir a https://render.com
2. Crear cuenta / Iniciar sesión
3. Conectar GitHub

### Paso 2: Crear Web Service
1. Click en "New +"
2. Seleccionar "Web Service"
3. Seleccionar repositorio: `Hinojosa171/Bitcoin`

### Paso 3: Configurar Deployment
- **Name:** `iot-bitcoin-api`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Root Directory:** `backend` (si es necesario)

### Paso 4: Environment Variables
Agregar variables en Render:

| Key | Value |
|-----|-------|
| `MONGO_URI` | `mongodb+srv://Prueba:EdlicA6qY2fxU7n4@cluster0.0ht3eoq.mongodb.net/TuCobradorDB?retryWrites=true&w=majority` |
| `NODE_ENV` | `production` |

### Paso 5: Deploy
Click en "Create Web Service"

Esperar a que se complete. La URL será algo como:
```
https://iot-bitcoin-api.onrender.com
```

## 📊 Endpoints API

### POST /api/precios
Recibe datos del ESP32
```bash
curl -X POST https://iot-bitcoin-api.onrender.com/api/precios \
  -H "Content-Type: application/json" \
  -d '{"precio": 74579.50, "moneda": "USD"}'
```

### GET /api/precios
Obtiene historial (últimas 100 registros)
```bash
curl https://iot-bitcoin-api.onrender.com/api/precios
```

### GET /api/precios/ultimo
Obtiene el precio más reciente
```bash
curl https://iot-bitcoin-api.onrender.com/api/precios/ultimo
```

## 🔄 Actualizar ESP32 Después del Deploy

1. Obtener URL de Render (ej: `https://iot-bitcoin-api.onrender.com`)
2. Abrir `Codigo de esp32` en Arduino IDE
3. Cambiar línea 9:
   ```cpp
   const char* urlBackend = "https://iot-bitcoin-api.onrender.com/api/precios";
   ```
4. Compilar y cargar en ESP32

## 📈 Monitor de Datos

- **Frontend Local:** http://localhost:3000
- **Frontend Deploy:** https://iot-bitcoin-api.onrender.com
- **MongoDB:** https://cloud.mongodb.com → cluster TuCobradorDB

## ✅ Estados del Sistema

- ✅ ESP32 WiFi conectado
- ✅ Consultas a CoinGecko funcionales
- ✅ Backend recibiendo datos
- ✅ MongoDB almacenando historial
- ✅ Frontend mostrando datos en tiempo real
- 🔄 Render deployment (en progreso)

## 📝 Próximos Pasos

1. ✅ Push a GitHub (COMPLETADO)
2. ⏳ Deploy en Render
3. ⏳ Actualizar URL del ESP32
4. ⏳ Verificar conexión end-to-end
5. ⏳ Monitoreo en producción

## 🐛 Troubleshooting

### Backend no conecta a MongoDB
- Verificar `MONGO_URI` en `.env`
- Revisar IP whitelist en MongoDB Atlas (agregar 0.0.0.0/0 si es necesario)

### ESP32 no se conecta a WiFi
- Verificar que sea red 2.4 GHz
- Revisar SSID y password

### Render muestra error 503
- Esperar a que finalicen los deployments
- Revisar logs en Render dashboard

---

**Última actualización:** Abril 14, 2026
**Estado:** Sistema operacional con persistencia MongoDB
