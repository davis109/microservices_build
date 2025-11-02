const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['react', 'vue', 'angular', 'node', 'python-flask', 'python-fastapi', 
           'mongodb', 'postgresql', 'mysql', 'redis', 'pyspark']
  },
  label: {
    type: String,
    required: true
  },
  position: {
    x: Number,
    y: Number
  },
  config: {
    port: Number,
    environment: mongoose.Schema.Types.Mixed,
    volumes: [String],
    customSettings: mongoose.Schema.Types.Mixed
  }
}, { _id: false });

const connectionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  target: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'default'
  }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  services: [serviceSchema],
  connections: [connectionSchema],
  metadata: {
    networkName: {
      type: String,
      default: 'app-network'
    },
    composeVersion: {
      type: String,
      default: '3.8'
    }
  },
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false
  },
  lastGenerated: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Project', projectSchema);
