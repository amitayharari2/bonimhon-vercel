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
        max_tokens: 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `אתה עוזר לעסק בישראל שמייצר תוכן על שוק ההון והשקעות.
חפש 5 חדשות פיננסיות חמות מהיומיים האחרונים הרלוונטיות לישראלים.
לכל חדשה — הצע זווית ויראלית: לא "מה קרה" אלא "מה זה אומר עליך".
החזר JSON בלבד:
{
  "news": [
    {
      "headline": "כותרת החדשה בעברית",
      "viral_angle": "הזווית הויראלית — מה זה אומר למשקיע הישראלי",
      "context": "הקשר קצר לבניית הסיפור"
    }
  ]
}`,
        messages: [{ 
          role: 'user', 
          content: 'חפש חדשות פיננסיות חמות מהיומיים האחרונים: שוק ההון, ריבית, מניות, כלכלה ישראלית וגלובלית. הצע זווית ויראלית לכל אחת.' 
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
      .join('');

    // Extract JSON object from anywhere in the text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'No JSON found in response: ' + rawText.substring(0, 200) });
    }

    const clean = jsonMatch[0]
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '')
      .trim();

    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
