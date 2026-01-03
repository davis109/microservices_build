// List all available models
const axios = require('axios');
require('dotenv').config();

async function listAvailableModels() {
  console.log('🔍 Fetching available Gemini models...\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  
  try {
    const response = await axios.get(url);
    
    console.log('✅ Available Models:\n');
    response.data.models.forEach(model => {
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`📦 ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Methods: ${model.supportedGenerationMethods.join(', ')}`);
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

listAvailableModels();
