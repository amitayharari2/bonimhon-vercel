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
{"topic_title":"כותרת","slides":[{"num":1,"type":"hook","eyebrow":"תגית","headline":"שורה\\nשורה\\nשורה","body":"משפט. **מילה**.","stats":[],"bullets":[]}]}

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

    // Extract JSON object from the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'No JSON found: ' + rawText.substring(0, 200) });
    }

    let parsed;
    try {
      // First attempt: parse directly (works when model returns clean JSON)
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e1) {
      try {
        // Second attempt: remove only control chars that are NEVER valid in JSON strings
        // (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) — preserve \n (0x0A) and \r (0x0D)
        const cleaned = jsonMatch[0].replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        parsed = JSON.parse(cleaned);
      } catch (e2) {
        // Third attempt: replace literal newlines inside string values only
        // by using a state-machine-style replacer
        try {
          const fixed = jsonMatch[0]
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip bad control chars
            .replace(/\n/g, ' ')  // turn newlines into spaces as last resort
            .replace(/\r/g, '');
          parsed = JSON.parse(fixed);
        } catch (e3) {
          return res.status(500).json({ 
            error: 'JSON parse failed: ' + e3.message,
            raw: rawText.substring(0, 500)
          });
        }
      }
    }
    
    if (!parsed.slides) {
      return res.status(500).json({ error: 'Invalid response structure: ' + JSON.stringify(parsed).substring(0, 200) });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
