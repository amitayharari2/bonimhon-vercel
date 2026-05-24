import { put } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { images } = req.body; // array of base64 strings

  try {
    const urls = [];
    for (let i = 0; i < images.length; i++) {
      const base64 = images[i].replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const blob = await put(`slides/slide-${Date.now()}-${i}.png`, buffer, {
        access: 'public',
        contentType: 'image/png'
      });
      urls.push(blob.url);
    }
    return res.status(200).json({ urls });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
