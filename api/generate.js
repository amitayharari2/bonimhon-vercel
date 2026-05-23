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
        tools: [{
          name: 'create_slides',
          description: 'Create Instagram carousel slides',
          input_schema: {
            type: 'object',
            properties: {
              topic_title: { type: 'string' },
              slides: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    num:      { type: 'integer' },
                    type:     { type: 'string' },
                    eyebrow:  { type: 'string' },
                    headline: { type: 'string' },
                    body:     { type: 'string' },
                    stats:    { type: 'array', items: { type: 'object', properties: { num: { type: 'string' }, label: { type: 'string' } }, required: ['num','label'] } },
                    bullets:  { type: 'array', items: { type: 'string' } }
                  },
                  required: ['num','type','eyebrow','headline','body','stats','bullets']
                }
              }
            },
            required: ['topic_title', 'slides']
          }
        }],
        tool_choice: { type: 'tool', name: 'create_slides' },
        system: `צור 6 סליידים לקרוסל אינסטגרם עבור "בונים הון" — השקעות פאסיביות בישראל.

חוקי כתיבה:
• כל שורה בכותרת = 3-5 מילים, הפרד שורות עם | (לא \\n)
• כל סליייד = רעיון אחד
• מילה אחת **מודגשת** בכל סליייד
• שפה פשוטה, ישירה, בלי ז'רגון

מבנה: 1=hook, 2=story+bullets, 3=insight+stats, 4=data+stats, 5=lesson+bullets, 6=cta
אסור: המלצות ספציפיות. הכל בעברית.`,
        messages: [{ role: 'user', content: `נושא: ${topic}` }]
      })
    });

    const anthropicData = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(500).json({ error: `Anthropic API error: ${anthropicData.error?.message || JSON.stringify(anthropicData)}` });
    }

    const toolUse = anthropicData.content.find(c => c.type === 'tool_use');
    if (!toolUse || !toolUse.input || !toolUse.input.slides) {
      return res.status(500).json({ error: 'No tool response found', debug: JSON.stringify(anthropicData.content).substring(0, 300) });
    }

    return res.status(200).json(toolUse.input);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
