export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY environment variable' });
  if (!topic) return res.status(400).json({ error: 'Missing topic in request body' });

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `אתה יוצר תוכן לאינסטגרם קרוסל עבור "בונים הון" - עסק ליווי השקעות פאסיביות בשוק ההון בישראל.
צור בדיוק 6 סליידים בפורמט JSON בלבד. אין להוסיף טקסט לפני או אחרי ה-JSON.
פורמט:
{"topic_title":"כותרת","slides":[{"num":1,"type":"hook","eyebrow":"תגית","headline":"כותרת\nשורה2","body":"טקסט **הדגשה**","stats":[{"num":"מספר","label":"תיאור"}],"bullets":[]}]}
כללים: סליייד 1=hook, 2=story+bullets, 3=insight+stats, 4=data+stats, 5=lesson+bullets, 6=cta. הכל בעברית. אין המלצות ספציפיות.`,
        messages: [{ role: 'user', content: `נושא: ${topic}` }]
      })
    });

    const anthropicData = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(500).json({ 
        error: `Anthropic API error: ${anthropicData.error?.message || JSON.stringify(anthropicData)}` 
      });
    }

    const raw = anthropicData.content
      .map(c => c.text || '')
      .join('')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(raw);
    
    if (!parsed.slides) {
      return res.status(500).json({ error: 'Invalid response structure: ' + raw.substring(0, 200) });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
