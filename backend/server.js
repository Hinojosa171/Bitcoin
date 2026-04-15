const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
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
    default: () => new Date().toLocaleString('es-CO')
  }
});

// Modelo
const Precio = mongoose.model('Precio', precioSchema);

// Ruta para recibir precios del ESP32
app.post('/api/precios', async (req, res) => {
  try {
    const { precio, moneda, timestamp } = req.body;
    
    if (!precio) {
      return res.status(400).json({ error: 'Precio requerido' });
    }

    // Crear nuevo documento
    const nuevoRegistro = new Precio({
      precio: parseFloat(precio),
      moneda: moneda || 'USD'
    });

    // Guardar en MongoDB
    const registroGuardado = await nuevoRegistro.save();

    console.log(`✅ Precio recibido: $${precio} ${moneda} - Guardado en MongoDB`);
    res.status(201).json({ 
      mensaje: 'Precio registrado OK en MongoDB', 
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
  console.log(`🗄️  Base de datos: MongoDB Atlas (TuCobradorDB)`);
  console.log(`\n⏳ Esperando datos del ESP32...\n`);
});
