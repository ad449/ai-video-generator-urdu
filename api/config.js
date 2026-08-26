// Vercel Serverless Function - Get API Configuration
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return API keys from environment variables (NEVER exposed to client)
  const config = {
    groqKey: process.env.GROQ_API_KEY || '',
    huggingfaceToken: process.env.HUGGINGFACE_TOKEN || '',
    // Don't expose paid API keys unless you want to
    hasFal: !!process.env.FAL_API_KEY,
    hasReplicate: !!process.env.REPLICATE_API_KEY
  };

  res.status(200).json(config);
}
