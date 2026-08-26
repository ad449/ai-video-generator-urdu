// Vercel Serverless Function - Proxy for Hugging Face API
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
  
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'Hugging Face token not configured on server' });
  }

  const { model, prompt } = req.body;

  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required' });
  }

  try {
    const response = await fetch(model, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt })
    });

    // Handle blob response (video/image)
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      return res.status(200).json(data);
    } else {
      // Return video blob as base64
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      res.status(200).json({ 
        video: `data:video/mp4;base64,${base64}`,
        contentType: contentType
      });
    }
  } catch (error) {
    console.error('Hugging Face API error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
