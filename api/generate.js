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
        model: 'claude-sonnet-4-5',
        max_tokens: 900,
        system: `צור 6 סליידים לקרוסל אינסטגרם עבור "בונים הון" — השקעות פאסיביות בישראל.
החזר JSON בלבד, ללא טקסט נוסף:
{"topic_title":"כותרת","slides":[{"num":1,"type":"hook","eyebrow":"תגית","headline":"שורה\nשורה\nשורה","body":"משפט. **מילה**.","stats":[],"bullets":[]}]}

חוקי כתיבה:
• כל שורה = 3-5 מילים בלבד
• כל סליייד = רעיון אחד
• מילה אחת **מודגשת** בכל סליייד
• סיפור שמבנה מתח — כל סליייד מושך לבא
• שפה פשוטה, ישירה, בלי ז'רגון

מבנה: 1=hook(עובדה מזעזעת), 2=story+bullets(3×3מילים), 3=insight+stats, 4=data+stats(2נתונים), 5=lesson+bullets(3×3מילים), 6=cta(שאלה פתוחה שמזמינה תגובה)
אסור: המלצות ספציפיות. הכל בעברית.`,
        messages: [{ role: 'user', content: `נושא: ${topic}` }]
      })
    });

    const anthropicData = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(500).json({ 
        error: `Anthropic API error: ${anthropicData.error?.message || JSON.stringify(anthropicData)}` 
      });
    }

    const rawText = anthropicData.content
      .map(c => c.text || '')
      .join('');

    // Extract JSON object
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'No JSON found: ' + rawText.substring(0, 200) });
    }

    const clean = jsonMatch[0]
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove all control chars except \n \r
      .replace(/\n/g, '\\n') // escape newlines inside strings
      .replace(/\r/g, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch(e) {
      // Try more aggressive cleaning
      const aggressive = clean.replace(/[\x00-\x1F\x7F]/g, '');
      parsed = JSON.parse(aggressive);
    }
    
    if (!parsed.slides) {
      return res.status(500).json({ error: 'Invalid response structure: ' + raw.substring(0, 200) });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
