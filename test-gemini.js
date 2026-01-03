// Test script for Gemini API integration
require('dotenv').config({ path: './backend/.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Integration...\n');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-pro',
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json"
    }
  });

  const prompt = `You are an expert DevOps architect. Convert this description into a structured microservice blueprint:

"Create a microservices setup with Node backend and MongoDB"

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
}`;

  try {
    console.log('📤 Sending prompt to Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Response received!\n');
    console.log('📄 Generated Blueprint:');
    console.log(JSON.stringify(JSON.parse(text), null, 2));
    console.log('\n🎉 Gemini API is working correctly!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testGeminiAPI();
