export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic } = req.body;
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `אתה יוצר תוכן לאינסטגרם קרוסל עבור "בונים הון" - עסק ליווי השקעות פאסיביות בשוק ההון בישראל.

צור בדיוק 6 סליידים בפורמט JSON בלבד. אין להוסיף טקסט לפני או אחרי ה-JSON.

פורמט:
{
  "topic_title": "כותרת הנושא בקצרה",
  "slides": [
    {
      "num": 1,
      "type": "hook",
      "eyebrow": "תגית קצרה עד 3 מילים",
      "headline": "כותרת מכה - שורה 1\nשורה 2\nשורה 3 אופציונלי",
      "body": "טקסט קצר 1-2 משפטים. השתמש ב**הדגשה** לביטויים חשובים.",
      "stats": [{"num": "מספר/אחוז", "label": "תיאור"}],
      "bullets": []
    }
  ]
}

כללים לסליידים:
- סליייד 1 (hook): שאלה שמכאיבה או עובדה מפתיעה. stats אם רלוונטי.
- סליייד 2 (story): הסיפור / הבעיה. body + bullets (3 נקודות).
- סליייד 3 (insight): התובנה המרכזית. stats + body.
- סליייד 4 (data): נתונים / דוגמה קונקרטית. stats (2 נתונים) + body.
- סליייד 5 (lesson): מוסר ההשכל / הפתרון. bullets (3 נקודות) + body.
- סליייד 6 (cta): קריאה לפעולה. body = "הצטרפו לקהילת בונים הון ולמדו להשקיע נכון ✅", stats = []

בכל הסליידים: eyebrow קצר, headline מושך עם ירידת שורה בנקודות מתאימות.
לא להמליץ על מוצר פיננסי ספציפי. לא להשתמש ב-markdown חוץ מ-**הדגשה**.
הכל בעברית.`,
        messages: [{ role: 'user', content: `נושא: ${topic}` }]
      })
    });

    const data = await response.json();
    let raw = data.content.map(c => c.text || '').join('');
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(raw);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
