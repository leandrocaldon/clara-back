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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
