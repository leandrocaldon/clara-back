import express from 'express';
import { 
  generateChatResponse, 
  getConversationHistory,
  registerPatient,
  findPatient,
  getPatientBySession
} from '../controllers/chatController.js';

const router = express.Router();

// Ruta para generar respuestas de ChatGPT
router.post('/', generateChatResponse);
// Ruta para obtener el historial de conversaciones
router.get('/history', getConversationHistory);

// Nuevas rutas para pacientes
router.post('/register', registerPatient);
router.get('/find/:patientId', findPatient);
router.get('/patient/:sessionId', getPatientBySession);

export { router };
