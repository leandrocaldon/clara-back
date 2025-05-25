import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['masculino', 'femenino', 'otro']
  },
  email: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  sessionId: {
    type: String,
    required: true
  },
  consultationCount: {
    type: Number,
    default: 1
  },
  isRegistered: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSession: {
    type: Date,
    default: Date.now
  }
});

const Patient = mongoose.model('Patient', patientSchema);

export default Patient; 