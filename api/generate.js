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
        max_tokens: 1500,
        system: `אתה יוצר תוכן ויראלי לאינסטגרם קרוסל עבור "בונים הון" - עסק ליווי השקעות פאסיביות בשוק ההון בישראל.

צור בדיוק 6 סליידים בפורמט JSON בלבד. אין להוסיף טקסט לפני או אחרי ה-JSON.

עקרונות כתיבה (חובה):
- כל שורה = מחשבה אחת. 3-5 מילים בשורה. לא יותר.
- כל סליייד = רעיון אחד בלבד.
- ספר סיפור — אנשי, היסטורי, או עם מספרים אמיתיים. לא תיאוריה יבשה.
- כל סליייד מסתיים בנקודה שמושכת לבא.
- מילה אחת מודגשת בכל סליייד (עם **כוכביות**) — זו המילה שקופצת לעין.
- שפה ישירה כאילו מדבר עם חבר. אין ז'רגון.
- בנה מתח לאורך הקרוסל — הקורא חייב לגלול.
- סליייד אחרון מסתיים בשאלה פתוחה שמזמינה תגובות.

פורמט JSON:
{
  "topic_title": "כותרת קצרה",
  "slides": [
    {
      "num": 1,
      "type": "hook",
      "eyebrow": "תגית קצרה",
      "headline": "שורה\nשורה\nשורה",
      "body": "משפט קצר. **מילה** מודגשת.",
      "stats": [],
      "bullets": []
    }
  ]
}

מבנה הסליידים:
- סליייד 1 (hook): עובדה מזעזעת או שאלה שמכאיבה. כותרת שגורמת לעצור בגלילה.
- סליייד 2 (story): הסיפור / הבעיה. bullets (3 נקודות, 3-4 מילים כל אחת).
- סליייד 3 (insight): התובנה המרכזית. stats + משפט אחד.
- סליייד 4 (data): נתונים אמיתיים ומספרים קונקרטיים. stats (2 נתונים).
- סליייד 5 (lesson): מוסר ההשכל. bullets (3 נקודות קצרות) + משפט סיכום.
- סליייד 6 (cta): body = "אתם חושבים שזה **נדיר**?\nזה קורה כל יום.\nרק מי שיודע — מרוויח." ואז שאלה פתוחה קצרה שמזמינה תגובה. stats=[] bullets=[].

אין המלצות על מוצרים ספציפיים. הכל בעברית.`,
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
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '') // remove bad control chars except \n and \r
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
