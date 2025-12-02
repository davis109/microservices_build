const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const auth = require('../middleware/auth');


const validateProject = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('services').isArray().withMessage('Services must be an array'),
  body('connections').optional().isArray().withMessage('Connections must be an array')
];


router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const query = { owner: req.userId };
    
    if (search) {
      query.$text = { $search: search };
    }

    const projects = await Project.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const count = await Project.countDocuments(query);

    res.json({
      projects,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalProjects: count
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error fetching projects' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get a single project by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.userId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Server error fetching project' });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post('/', auth, validateProject, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, services, connections, metadata, tags } = req.body;

    const project = new Project({
      name,
      description,
      owner: req.userId,
      services,
      connections: connections || [],
      metadata: metadata || {},
      tags: tags || []
    });

    await project.save();

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error creating project' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
router.put('/:id', auth, validateProject, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, services, connections, metadata, tags } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      {
        name,
        description,
        services,
        connections,
        metadata,
        tags
      },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Server error updating project' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.userId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error deleting project' });
  }
});

module.exports = router;
