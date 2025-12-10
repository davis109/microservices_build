const axios = require('axios');

/**
 * AI Service for Natural Language to Blueprint Conversion
 * Integrates with OpenAI or local LLM to parse user prompts into structured workflow blueprints
 */
class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  }

  /**
   * Parse natural language prompt into structured blueprint
   * @param {string} prompt - User's natural language description
   * @returns {Object} Structured blueprint with services and connections
   */
  async parsePromptToBlueprint(prompt) {
    const systemPrompt = `You are an expert DevOps architect. Convert user descriptions into structured microservice blueprints.
    
Return a JSON object with this exact structure:
{
  "services": [
    {
      "id": "unique-id",
      "type": "node|react|vue|angular|python|mongodb|postgresql|mysql|redis",
      "name": "service-name",
      "config": {
        "port": 3000,
        "environment": {},
        "volumes": []
      },
      "position": { "x": number, "y": number }
    }
  ],
  "connections": [
    {
      "source": "service-id",
      "target": "service-id",
      "type": "api|database|cache"
    }
  ],
  "metadata": {
    "name": "project-name",
    "description": "brief description"
  }
}

Supported service types:
- Frontend: react, vue, angular
- Backend: node (Express), python (Flask/FastAPI)
- Database: mongodb, postgresql, mysql
- Cache: redis

Guidelines:
1. Use standard ports (React: 3000, Node: 5000, MongoDB: 27017, etc.)
2. Position services logically (frontend left, backend center, database right)
3. Infer connections from context
4. Add reasonable default configurations`;

    try {
      const response = await axios.post(
        this.openaiEndpoint,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const blueprint = JSON.parse(response.data.choices[0].message.content);
      return this.validateAndEnhanceBlueprint(blueprint);
    } catch (error) {
      console.error('AI Service Error:', error.response?.data || error.message);
      throw new Error('Failed to generate blueprint from prompt');
    }
  }

  /**
   * Validate and enhance the generated blueprint
   * @param {Object} blueprint - Raw blueprint from AI
   * @returns {Object} Validated and enhanced blueprint
   */
  validateAndEnhanceBlueprint(blueprint) {
    // Ensure all required fields exist
    const enhanced = {
      services: blueprint.services || [],
      connections: blueprint.connections || [],
      metadata: blueprint.metadata || { name: 'Generated Project', description: '' }
    };

    // Add UUIDs if missing
    const { v4: uuidv4 } = require('uuid');
    enhanced.services = enhanced.services.map((service, index) => ({
      id: service.id || `service-${uuidv4()}`,
      type: service.type,
      name: service.name || `${service.type}-${index + 1}`,
      config: {
        port: service.config?.port || this.getDefaultPort(service.type),
        environment: service.config?.environment || {},
        volumes: service.config?.volumes || [],
        ...service.config
      },
      position: service.position || { x: index * 250, y: 100 }
    }));

    // Validate connections
    const serviceIds = new Set(enhanced.services.map(s => s.id));
    enhanced.connections = enhanced.connections.filter(conn => 
      serviceIds.has(conn.source) && serviceIds.has(conn.target)
    );

    return enhanced;
  }

  /**
   * Get default port for service type
   */
  getDefaultPort(type) {
    const defaults = {
      react: 3000,
      vue: 8080,
      angular: 4200,
      node: 5000,
      python: 8000,
      mongodb: 27017,
      postgresql: 5432,
      mysql: 3306,
      redis: 6379
    };
    return defaults[type] || 8080;
  }

  /**
   * Generate suggestions for improving a blueprint
   * @param {Object} blueprint - Current blueprint
   * @returns {Array} Array of suggestions
   */
  async generateSuggestions(blueprint) {
    const prompt = `Analyze this microservice architecture and suggest improvements:
${JSON.stringify(blueprint, null, 2)}

Provide 3-5 actionable suggestions for:
- Security best practices
- Performance optimization
- Scalability considerations
- Missing services (e.g., load balancer, monitoring)

Return as JSON array of strings.`;

    try {
      const response = await axios.post(
        this.openaiEndpoint,
        {
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a DevOps expert providing architecture recommendations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = JSON.parse(response.data.choices[0].message.content);
      return result.suggestions || [];
    } catch (error) {
      console.error('Suggestion generation error:', error.message);
      return [];
    }
  }

  /**
   * Convert natural language to specific service configuration
   */
  async enhanceServiceConfig(serviceType, requirements) {
    const prompt = `Generate detailed configuration for a ${serviceType} service with these requirements: ${requirements}
    
Return JSON with:
- environment variables
- recommended volumes
- security settings
- resource limits`;

    try {
      const response = await axios.post(
        this.openaiEndpoint,
        {
          model: this.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Config enhancement error:', error.message);
      return {};
    }
  }
}

module.exports = new AIService();
