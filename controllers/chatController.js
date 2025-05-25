import OpenAI from 'openai';
import Conversation from '../models/Conversation.js';
import Patient from '../models/Patient.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Función para verificar y esperar la conexión de MongoDB
const ensureMongoConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return true; // Ya conectado
  }
  
  if (mongoose.connection.readyState === 0) {
    // No conectado, intentar conectar
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false,
      });
      return true;
    } catch (error) {
      console.error('Error al conectar MongoDB:', error);
      throw new Error('No se pudo conectar a la base de datos');
    }
  }
  
  // Si está conectando (readyState === 2), esperar hasta que esté listo
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout esperando conexión a MongoDB'));
    }, 10000);
    
    mongoose.connection.once('connected', () => {
      clearTimeout(timeout);
      resolve(true);
    });
    
    mongoose.connection.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};

// Configurar OpenAI con manejo de errores mejorado
let openai;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('La variable de entorno OPENAI_API_KEY no está definida')
  }

  openai = new OpenAI({ apiKey });
  console.log('✅ OpenAI configurado correctamente');
} catch (error) {
  console.error('Error al inicializar OpenAI:', error);
}

// Generar respuesta de ChatGPT
export const generateChatResponse = async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'El prompt es requerido' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'SessionId es requerido' });
    }

    // Verificar conexión a MongoDB antes de hacer consultas
    await ensureMongoConnection();

    // Verificar que el paciente esté registrado
    const patient = await Patient.findOne({ sessionId });
    if (!patient) {
      return res.status(401).json({ error: 'Paciente no registrado. Por favor complete el registro primero.' });
    }

    if (!openai) {
      return res.status(500).json({ 
        error: 'No se ha configurado correctamente la API de OpenAI',
        message: 'Error interno del servidor al configurar OpenAI'
      });
    }

    // Llamada a la API de OpenAI con modelo gpt-4o para respuestas más avanzadas
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: `Eres la Dra. Clara, una asistente médica virtual amigable y profesional. Estás atendiendo a ${patient.name}, ${patient.gender}, ${patient.age} años. Tus respuestas deben ser concisas (máximo 150 palabras), claras, empáticas e incluir emojis relevantes. Usa párrafos cortos para mejor legibilidad. Siempre recuerda que NO puedes dar diagnósticos definitivos y debes recomendar consultar con un médico presencial para casos serios.` 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    // Guardar la conversación en la base de datos con sessionId
    const conversation = new Conversation({
      prompt,
      response,
      sessionId
    });

    await conversation.save();

    res.json({ response });
  } catch (error) {
    console.error('Error al generar la respuesta:', error);
    res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      details: error.message 
    });
  }
};

// Obtener historial de conversaciones
export const getConversationHistory = async (req, res) => {
  try {
    // Verificar conexión a MongoDB antes de hacer consultas
    await ensureMongoConnection();
    
    const { sessionId } = req.query;
    
    let query = {};
    if (sessionId) {
      query.sessionId = sessionId;
    }
    
    const conversations = await Conversation.find(query).sort({ createdAt: -1 }).limit(20);
    res.json(conversations);
  } catch (error) {
    console.error('Error al obtener el historial:', error);
    res.status(500).json({ error: 'Error al obtener el historial de conversaciones', details: error.message });
  }
};

// Registrar o actualizar paciente
export const registerPatient = async (req, res) => {
  try {
    // Verificar conexión a MongoDB antes de hacer consultas
    await ensureMongoConnection();
    
    const { patientId, name, age, gender, email, phone, sessionId } = req.body;

    if (!patientId || !name || !age || !gender || !sessionId) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Verificar si el paciente ya existe
    let patient = await Patient.findOne({ patientId });
    
    if (patient) {
      // Actualizar paciente existente con nueva sesión
      patient.sessionId = sessionId;
      patient.consultationCount += 1;
      patient.lastSession = new Date();
      await patient.save();
    } else {
      // Crear nuevo paciente
      patient = new Patient({
        patientId,
        name,
        age,
        gender,
        email,
        phone,
        sessionId,
        consultationCount: 1
      });
      await patient.save();
    }

    res.json({
      patient,
      message: `¡Hola ${name}! Soy la Dra. Clara, tu asistente médica virtual. ¿En qué puedo ayudarte hoy? 👩‍⚕️`
    });

  } catch (error) {
    console.error('Error al registrar paciente:', error);
    res.status(500).json({ error: 'Error al registrar paciente', details: error.message });
  }
};

// Buscar paciente por ID
export const findPatient = async (req, res) => {
  try {
    // Verificar conexión a MongoDB antes de hacer consultas
    await ensureMongoConnection();
    
    const { patientId } = req.params;
    
    const patient = await Patient.findOne({ patientId });
    
    if (!patient) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json(patient);

  } catch (error) {
    console.error('Error al buscar paciente:', error);
    res.status(500).json({ error: 'Error al buscar paciente', details: error.message });
  }
};

// Obtener paciente por sesión
export const getPatientBySession = async (req, res) => {
  try {
    // Verificar conexión a MongoDB antes de hacer consultas
    await ensureMongoConnection();
    
    const { sessionId } = req.params;
    
    const patient = await Patient.findOne({ sessionId });
    
    if (!patient) {
      return res.status(404).json({ error: 'Paciente no registrado' });
    }

    res.json(patient);

  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({ error: 'Error al obtener paciente', details: error.message });
  }
};
