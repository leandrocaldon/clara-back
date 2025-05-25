import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: false
  },
  patientId: {
    type: String,
    required: false,
    index: true // Índice para búsquedas rápidas por paciente
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto para búsquedas eficientes
conversationSchema.index({ patientId: 1, createdAt: -1 });
conversationSchema.index({ sessionId: 1, createdAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
