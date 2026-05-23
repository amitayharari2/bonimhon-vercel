export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `Return ONLY valid JSON, nothing else:
{"news":[{"headline":"כותרת בעברית","viral_angle":"זווית ויראלית בעברית","context":"הקשר קצר בעברית"}]}
Exactly 3 items. Search for today's top financial news relevant to Israeli investors. All values in Hebrew.`,
        messages: [{ 
          role: 'user', 
          content: 'Search: top financial market news today Israel stocks' 
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'API error' });
    }

    const rawText = data.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '');

    // Find the news JSON object specifically
    const jsonMatch = rawText.match(/\{\s*"news"\s*:\s*\[[\s\S]*?\]\s*\}/);
    if (!jsonMatch) {
      // Fallback: try any JSON object
      const fallback = rawText.match(/\{[\s\S]*\}/);
      if (!fallback) {
        return res.status(500).json({ error: 'No JSON found: ' + rawText.substring(0, 300) });
      }
      const cleaned = fallback[0].replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ');
      return res.status(200).json(JSON.parse(cleaned));
    }

    const cleaned = jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ');
    return res.status(200).json(JSON.parse(cleaned));

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
