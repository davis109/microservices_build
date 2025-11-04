const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const builderService = require('../services/builderService');
const Project = require('../models/Project');

// Validation middleware
const validateGenerate = [
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('projectName').trim().notEmpty().withMessage('Project name is required')
];

// @route   POST /api/generate
// @desc    Generate project files from architecture
// @access  Private
router.post('/', auth, validateGenerate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { services, connections, projectName, metadata, projectId } = req.body;

    console.log(`🔨 Generating project: ${projectName}`);
    console.log(`📦 Services: ${services.length}`);
    console.log(`🔗 Connections: ${connections?.length || 0}`);

    // Generate the project
    const result = await builderService.generateProject({
      projectName,
      services,
      connections: connections || [],
      metadata: metadata || {}
    });

    // Update project's lastGenerated timestamp if projectId provided
    if (projectId) {
      await Project.findByIdAndUpdate(projectId, {
        lastGenerated: new Date()
      });
    }

    // Send the zip file
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${projectName}.zip"`,
      'Content-Length': result.size
    });

    result.stream.pipe(res);

    console.log(`✅ Project generated successfully: ${projectName}`);

  } catch (error) {
    console.error('Generate project error:', error);
    res.status(500).json({ 
      error: 'Failed to generate project',
      details: error.message 
    });
  }
});

// @route   GET /api/generate/supported-services
// @desc    Get list of supported service types
// @access  Public
router.get('/supported-services', (req, res) => {
  const supportedServices = [
    {
      category: 'Frontend',
      services: [
        { type: 'react', name: 'React', icon: '⚛️', defaultPort: 3000 },
        { type: 'vue', name: 'Vue.js', icon: '💚', defaultPort: 8080 },
        { type: 'angular', name: 'Angular', icon: '🅰️', defaultPort: 4200 }
      ]
    },
    {
      category: 'Backend',
      services: [
        { type: 'node', name: 'Node.js (Express)', icon: '🟢', defaultPort: 5000 },
        { type: 'python-flask', name: 'Python (Flask)', icon: '🐍', defaultPort: 5000 },
        { type: 'python-fastapi', name: 'Python (FastAPI)', icon: '⚡', defaultPort: 8000 }
      ]
    },
    {
      category: 'Database',
      services: [
        { type: 'mongodb', name: 'MongoDB', icon: '🍃', defaultPort: 27017 },
        { type: 'postgresql', name: 'PostgreSQL', icon: '🐘', defaultPort: 5432 },
        { type: 'mysql', name: 'MySQL', icon: '🐬', defaultPort: 3306 }
      ]
    },
    {
      category: 'Cache & Others',
      services: [
        { type: 'redis', name: 'Redis', icon: '🔴', defaultPort: 6379 },
        { type: 'pyspark', name: 'PySpark', icon: '✨', defaultPort: 8080 }
      ]
    }
  ];

  res.json({ supportedServices });
});

module.exports = router;
