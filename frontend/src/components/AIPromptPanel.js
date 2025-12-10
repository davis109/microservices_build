import React, { useState } from 'react';
import axios from 'axios';

const AIPromptPanel = ({ onBlueprintGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const examplePrompts = [
    "Create a microservices setup with Node backend and MongoDB",
    "Build a full-stack app with React frontend, Express API, and PostgreSQL database",
    "Setup an e-commerce platform with Redis cache and payment service",
    "Design a real-time chat application with WebSocket support",
    "Create a data analytics pipeline with Python and PostgreSQL"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/ai/parse',
        { prompt },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        onBlueprintGenerated(response.data.blueprint);
        
        // Get suggestions for the generated blueprint
        const suggestionsResponse = await axios.post(
          'http://localhost:5000/api/ai/suggestions',
          { blueprint: response.data.blueprint },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (suggestionsResponse.data.success) {
          setSuggestions(suggestionsResponse.data.suggestions);
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.response?.data?.error || 'Failed to generate blueprint');
    } finally {
      setLoading(false);
    }
  };

  const handleFullGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/ai/generate-full',
        { 
          prompt,
          projectName: prompt.substring(0, 30).toLowerCase().replace(/[^a-z0-9]/g, '-')
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        onBlueprintGenerated(response.data.blueprint);
        setSuggestions(response.data.suggestions);
        
        // Show download link
        alert(`Project generated! Download: ${response.data.downloadPath}`);
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.response?.data?.error || 'Failed to generate project');
    } finally {
      setLoading(false);
    }
  };

  const useExamplePrompt = (example) => {
    setPrompt(example);
    setError('');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🤖 AI-Powered Blueprint Generator
        </h2>
        <p className="text-gray-600">
          Describe your architecture in natural language, and we'll generate a complete blueprint
        </p>
      </div>

      {/* Prompt Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe Your Architecture
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Create a microservices setup with Node.js backend, React frontend, MongoDB database, and Redis cache"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          disabled={loading}
        />
      </div>

      {/* Example Prompts */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              onClick={() => useExamplePrompt(example)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition"
              disabled={loading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? '🔄 Generating...' : '✨ Generate Blueprint'}
        </button>
        <button
          onClick={handleFullGenerate}
          disabled={loading || !prompt.trim()}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? '🔄 Generating...' : '🚀 Generate Full Project'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3">💡 AI Recommendations</h3>
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center mr-2 flex-shrink-0">
                  {suggestion.priority === 'high' ? '!' : 'i'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    {suggestion.type ? `[${suggestion.type}] ` : ''}
                    {suggestion.description || suggestion}
                  </p>
                  {suggestion.impact && (
                    <p className="text-xs text-blue-700 mt-1">
                      Impact: {suggestion.impact}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>How it works:</strong> Our AI analyzes your description and generates a complete
          architecture blueprint with proper service configurations, networking, and best practices.
        </p>
      </div>
    </div>
  );
};

export default AIPromptPanel;
