// Vercel Serverless Function to securely provide API keys
// This keeps your API keys hidden from the client-side code

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return API keys from environment variables
  const apiKeys = {
    groq: process.env.GROQ_API_KEY || '',
    huggingface: process.env.HUGGINGFACE_TOKEN || ''
  };

  // Check if keys are set
  if (!apiKeys.groq || !apiKeys.huggingface) {
    return res.status(500).json({ 
      error: 'API keys not configured on server',
      message: 'Please set GROQ_API_KEY and HUGGINGFACE_TOKEN in Vercel environment variables'
    });
  }

  res.status(200).json(apiKeys);
}
