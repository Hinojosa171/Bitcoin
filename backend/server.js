const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3000;

// Connection String de MongoDB (desde variables de entorno)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Prueba:EdlicA6qY2fxU7n4@cluster0.0ht3eoq.mongodb.net/TuCobradorDB?retryWrites=true&w=majority';

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(MONGO_URI)
.then(() => {
  console.log('✅ MongoDB conectado correctamente');
})
.catch(err => {
  console.error('❌ Error conectando a MongoDB:', err);
  process.exit(1);
});

// Schema para los precios
const precioSchema = new mongoose.Schema({
  id_dispositivo: {
    type: String,
    required: true
  },
  precio: {
    type: Number,
    required: true
  },
  moneda: {
    type: String,
    default: 'USD'
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  fechaFormato: {
    type: String,
    default: () => {
      // Hora en zona horaria de Colombia (UTC-5)
      const fecha = new Date();
      const opciones = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota'
      };
      return fecha.toLocaleString('es-CO', opciones);
    }
  }
});

// Schema para dispositivos
const dispositivoSchema = new mongoose.Schema({
  id_dispositivo: {
    type: String,
    required: true,
    unique: true
  },
  api_key_encriptada: {
    type: String,
    required: true
  },
  nombre: {
    type: String,
    default: 'ESP32'
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo'
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  ultimaConexion: {
    type: Date,
    default: null
  }
});

// Modelos
const Precio = mongoose.model('Precio', precioSchema);
const Dispositivo = mongoose.model('Dispositivo', dispositivoSchema);

// ============= MIDDLEWARE PARA VALIDAR DISPOSITIVO =============
async function validarDispositivo(req, res, next) {
  try {
    const { id_dispositivo, api_key } = req.body;
    
    if (!id_dispositivo || !api_key) {
      return res.status(400).json({ error: 'ID y API Key requeridos' });
    }

    // Buscar dispositivo en MongoDB
    const dispositivo = await Dispositivo.findOne({ id_dispositivo });
    
    if (!dispositivo) {
      console.log(`❌ Dispositivo no encontrado: ${id_dispositivo}`);
      return res.status(401).json({ error: 'Dispositivo no autorizado' });
    }

    if (dispositivo.estado !== 'activo') {
      console.log(`❌ Dispositivo inactivo: ${id_dispositivo}`);
      return res.status(403).json({ error: 'Dispositivo inactivo' });
    }

    // Comparar API Key encriptada
    const esValida = await bcrypt.compare(api_key, dispositivo.api_key_encriptada);
    
    if (!esValida) {
      console.log(`❌ API Key inválida para: ${id_dispositivo}`);
      return res.status(401).json({ error: 'API Key inválida' });
    }

    req.dispositivo = dispositivo;
    next();
  } catch (error) {
    console.error('Error validando dispositivo:', error);
    res.status(500).json({ error: 'Error de validación' });
  }
}

// Ruta para recibir precios del ESP32 (CON VALIDACIÓN)
app.post('/api/precios', validarDispositivo, async (req, res) => {
  try {
    const { precio, moneda } = req.body;
    const id_dispositivo = req.dispositivo.id_dispositivo;
    
    if (!precio) {
      return res.status(400).json({ error: 'Precio requerido' });
    }

    // Crear nuevo documento
    const nuevoRegistro = new Precio({
      id_dispositivo,
      precio: parseFloat(precio),
      moneda: moneda || 'USD'
    });

    // Guardar en MongoDB
    const registroGuardado = await nuevoRegistro.save();

    // Actualizar última conexión
    await Dispositivo.updateOne(
      { id_dispositivo },
      { ultimaConexion: new Date() }
    );

    console.log(`✅ Precio recibido de ${id_dispositivo}: $${precio} - Guardado en MongoDB`);
    res.status(201).json({ 
      mensaje: 'Precio registrado OK', 
      dispositivo: id_dispositivo,
      registro: registroGuardado
    });
  } catch (error) {
    console.error('Error guardando precio:', error);
    res.status(500).json({ error: 'Error al guardar en MongoDB' });
  }
});

// Ruta para obtener todos los precios (usado por el frontend)
app.get('/api/precios', async (req, res) => {
  try {
    const precios = await Precio.find().sort({ fechaRegistro: -1 }).limit(100);
    
    res.json({
      total: precios.length,
      precios: precios.map(p => ({
        id: p._id,
        dispositivo: p.id_dispositivo,
        precio: p.precio,
        moneda: p.moneda,
        timestamp: p.fechaRegistro.toISOString(),
        recibidoEn: p.fechaFormato
      }))
    });
  } catch (error) {
    console.error('Error obteniendo precios:', error);
    res.status(500).json({ error: 'Error al obtener precios' });
  }
});

// Ruta para obtener último precio
app.get('/api/precios/ultimo', async (req, res) => {
  try {
    const ultimoPrecio = await Precio.findOne().sort({ fechaRegistro: -1 });
    
    if (!ultimoPrecio) {
      return res.json({ mensaje: 'Sin datos aún' });
    }
    
    res.json({
      dispositivo: ultimoPrecio.id_dispositivo,
      precio: ultimoPrecio.precio,
      moneda: ultimoPrecio.moneda,
      timestamp: ultimoPrecio.fechaRegistro.toISOString(),
      recibidoEn: ultimoPrecio.fechaFormato
    });
  } catch (error) {
    console.error('Error obteniendo último precio:', error);
    res.status(500).json({ error: 'Error al obtener último precio' });
  }
});

// ============= RUTA PARA REGISTRAR NUEVO DISPOSITIVO =============
app.post('/api/dispositivos/registrar', async (req, res) => {
  try {
    const { id_dispositivo, nombre } = req.body;
    
    if (!id_dispositivo) {
      return res.status(400).json({ error: 'ID dispositivo requerido' });
    }

    // Generar API Key aleatoria
    const api_key_plain = `sk_prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Encriptar con bcrypt
    const api_key_encriptada = await bcrypt.hash(api_key_plain, 10);

    // Guardar en MongoDB
    const nuevoDispositivo = new Dispositivo({
      id_dispositivo,
      api_key_encriptada,
      nombre: nombre || 'Dispositivo'
    });

    await nuevoDispositivo.save();

    console.log(`✅ Dispositivo registrado: ${id_dispositivo}`);
    res.status(201).json({
      mensaje: '✅ Dispositivo registrado correctamente',
      id_dispositivo,
      api_key: api_key_plain,
      advertencia: '⚠️ GUARDA ESTA API KEY EN UN LUGAR SEGURO. NO SE MOSTRARÁ DE NUEVO.'
    });
  } catch (error) {
    console.error('Error registrando dispositivo:', error);
    res.status(500).json({ error: 'Error al registrar dispositivo' });
  }
});

// ============= RUTA PARA VER DISPOSITIVOS REGISTRADOS =============
app.get('/api/dispositivos', async (req, res) => {
  try {
    const dispositivos = await Dispositivo.find({}, '-api_key_encriptada');
    res.json({ 
      total: dispositivos.length,
      dispositivos 
    });
  } catch (error) {
    console.error('Error obteniendo dispositivos:', error);
    res.status(500).json({ error: 'Error al obtener dispositivos' });
  }
});

// Servir archivos estáticos (frontend)
app.use(express.static('public'));

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Frontend: http://localhost:${PORT}`);
  console.log(`📡 API Precios: http://localhost:${PORT}/api/precios`);
  console.log(`� Registrar dispositivo: POST http://localhost:${PORT}/api/dispositivos/registrar`);
  console.log(`📋 Ver dispositivos: http://localhost:${PORT}/api/dispositivos`);
  console.log(`🗄️  Base de datos: MongoDB Atlas (TuCobradorDB)`);
  console.log(`\n⏳ Esperando datos del ESP32 autenticado...\n`);
});
