import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { router as chatRoutes } from './routes/chatRoutes.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Verificar configuración de variables de entorno críticas
const requiredEnvVars = ['MONGODB_URI', 'OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ VARIABLES DE ENTORNO FALTANTES:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  console.log('\n📋 Para configurar en Vercel:');
  console.log('1. Ve a tu proyecto en Vercel Dashboard');
  console.log('2. Settings → Environment Variables');
  console.log('3. Agrega las variables faltantes');
  console.log('4. Redeploy el proyecto\n');
}

// MongoDB Connection con mejor manejo de errores
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no está configurada');
  console.log('⚠️  El servidor continuará sin base de datos');
} else {
  // Configuración de conexión optimizada para Vercel
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout después de 5s en lugar de 30s
    socketTimeoutMS: 45000, // Cerrar sockets después de 45s de inactividad
    bufferCommands: false, // Deshabilitar mongoose buffering
  })
  .then(() => {
    console.log('✅ MongoDB conectado correctamente');
    console.log(`📍 Base de datos: ${MONGODB_URI.split('@')[1]?.split('/')[0] || 'MongoDB Atlas'}`);
  })
  .catch(err => {
    console.error('❌ Error de conexión a MongoDB:', err.message);
    console.log('⚠️  El servidor continuará sin base de datos');
  });

  // Manejar eventos de conexión
  mongoose.connection.on('error', (err) => {
    console.error('❌ Error de MongoDB:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB desconectado');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconectado');
  });
}

// Rutas
app.use('/api/chat', chatRoutes);

// Ruta para probar el servidor con información de estado
app.get('/', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoStates = {
    0: 'desconectado',
    1: 'conectado',
    2: 'conectando',
    3: 'desconectando'
  };

  res.json({ 
    message: 'API de ChatGPT funcionando correctamente',
    status: 'OpenAI configurado',
    mongodb: {
      status: mongoStates[mongoStatus] || 'desconocido',
      connected: mongoStatus === 1
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Ruta de salud para verificar servicios
app.get('/health', (req, res) => {
  const health = {
    server: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'OK' : 'ERROR',
    openai: process.env.OPENAI_API_KEY ? 'OK' : 'ERROR',
    timestamp: new Date().toISOString()
  };

  const status = Object.values(health).every(v => v === 'OK' || typeof v === 'string') ? 200 : 503;
  res.status(status).json(health);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
