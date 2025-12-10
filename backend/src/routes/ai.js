const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiService = require('../services/aiService');
const mcpService = require('../services/mcpService');
const builderService = require('../services/builderService');

/**
 * @route   POST /api/ai/parse
 * @desc    Parse natural language prompt into blueprint
 * @access  Private
 */
router.post('/parse', auth, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const blueprint = await aiService.parsePromptToBlueprint(prompt);

    res.json({
      success: true,
      blueprint,
      message: 'Blueprint generated successfully from natural language'
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ 
      error: 'Failed to parse prompt', 
      details: error.message 
    });
  }
});

/**
 * @route   POST /api/ai/mcp
 * @desc    Handle MCP protocol requests
 * @access  Private
 */
router.post('/mcp', auth, async (req, res) => {
  try {
    const { operation, payload, context } = req.body;

    if (!operation) {
      return res.status(400).json({ error: 'Operation is required' });
    }

    const result = await mcpService.handleRequest({
      operation,
      payload,
      context: {
        ...context,
        userId: req.user.id,
        timestamp: new Date().toISOString()
      }
    });

    res.json(result);
  } catch (error) {
    console.error('MCP error:', error);
    res.status(500).json({ 
      error: 'MCP request failed', 
      details: error.message 
    });
  }
});

/**
 * @route   POST /api/ai/validate
 * @desc    Validate a blueprint
 * @access  Private
 */
router.post('/validate', auth, async (req, res) => {
  try {
    const { blueprint } = req.body;

    if (!blueprint) {
      return res.status(400).json({ error: 'Blueprint is required' });
    }

    const validation = await mcpService.validateBlueprint(blueprint);

    res.json(validation);
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ 
      error: 'Validation failed', 
      details: error.message 
    });
  }
});

/**
 * @route   POST /api/ai/suggestions
 * @desc    Get AI-powered improvement suggestions
 * @access  Private
 */
router.post('/suggestions', auth, async (req, res) => {
  try {
    const { blueprint } = req.body;

    if (!blueprint) {
      return res.status(400).json({ error: 'Blueprint is required' });
    }

    const suggestions = await mcpService.suggestImprovements(blueprint);

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ 
      error: 'Failed to generate suggestions', 
      details: error.message 
    });
  }
});

/**
 * @route   POST /api/ai/enhance
 * @desc    Enhance blueprint with AI recommendations
 * @access  Private
 */
router.post('/enhance', auth, async (req, res) => {
  try {
    const { blueprint, context } = req.body;

    if (!blueprint) {
      return res.status(400).json({ error: 'Blueprint is required' });
    }

    const enhanced = await mcpService.enhanceBlueprint(blueprint, context);

    res.json({
      success: true,
      ...enhanced
    });
  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ 
      error: 'Failed to enhance blueprint', 
      details: error.message 
    });
  }
});

/**
 * @route   POST /api/ai/generate-full
 * @desc    Generate complete project from natural language (end-to-end)
 * @access  Private
 */
router.post('/generate-full', auth, async (req, res) => {
  try {
    const { prompt, projectName } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Step 1: Parse prompt to blueprint
    const blueprint = await aiService.parsePromptToBlueprint(prompt);
    
    // Step 2: Validate blueprint
    const validation = await mcpService.validateBlueprint(blueprint);
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Generated blueprint has issues',
        validation
      });
    }

    // Step 3: Enhance blueprint
    const enhanced = await mcpService.enhanceBlueprint(blueprint, {
      projectName: projectName || blueprint.metadata?.name
    });

    // Step 4: Generate project files
    const projectPath = await builderService.generateProject({
      name: projectName || blueprint.metadata?.name || 'ai-generated-project',
      services: enhanced.enhancedBlueprint.services,
      connections: enhanced.enhancedBlueprint.connections
    });

    res.json({
      success: true,
      blueprint: enhanced.enhancedBlueprint,
      validation,
      suggestions: enhanced.suggestions,
      downloadPath: `/api/projects/download/${projectPath}`,
      message: 'Project generated successfully from natural language'
    });
  } catch (error) {
    console.error('Full generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate project', 
      details: error.message 
    });
  }
});

/**
 * @route   POST /api/ai/export
 * @desc    Export blueprint to various formats
 * @access  Private
 */
router.post('/export', auth, async (req, res) => {
  try {
    const { blueprint, formats } = req.body;

    if (!blueprint) {
      return res.status(400).json({ error: 'Blueprint is required' });
    }

    const exports = await mcpService.exportConfiguration(blueprint, { formats });

    res.json({
      success: true,
      exports
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Failed to export configuration', 
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/ai/capabilities
 * @desc    Get MCP server capabilities
 * @access  Public
 */
router.get('/capabilities', (req, res) => {
  res.json({
    server: 'Kontrol MCP Server',
    version: '1.0.0',
    capabilities: mcpService.capabilities,
    supportedOperations: mcpService.supportedOperations,
    models: {
      primary: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      fallback: 'local-llm'
    },
    features: [
      'Natural Language to Blueprint Conversion',
      'Intelligent Service Configuration',
      'Best Practice Recommendations',
      'Multi-format Export (Docker Compose, K8s, Terraform)',
      'Real-time Validation',
      'Architecture Optimization Suggestions'
    ]
  });
});

module.exports = router;
