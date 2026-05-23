export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { images, caption } = req.body;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_USER_ID;

  if (!accessToken || !igUserId) {
    return res.status(500).json({ error: 'Missing Instagram credentials in environment variables' });
  }

  try {
    // Step 1: Create media containers for each image
    const containerIds = [];
    for (const imageUrl of images) {
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            is_carousel_item: true,
            access_token: accessToken
          })
        }
      );
      const data = await r.json();
      if (!data.id) throw new Error(`Failed to create container: ${JSON.stringify(data)}`);
      containerIds.push(data.id);
    }

    // Step 2: Create carousel container
    const carouselRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: containerIds.join(','),
          caption: caption,
          access_token: accessToken
        })
      }
    );
    const carouselData = await carouselRes.json();
    if (!carouselData.id) throw new Error(`Failed to create carousel: ${JSON.stringify(carouselData)}`);

    // Step 3: Publish
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: carouselData.id,
          access_token: accessToken
        })
      }
    );
    const publishData = await publishRes.json();

    return res.status(200).json({ success: true, id: publishData.id });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
