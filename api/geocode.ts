export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const apiKey = process.env.HERE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('HERE_MAPS_API_KEY not configured');
    return res.status(500).json({ error: 'Geocoding API key not configured' });
  }

  try {
    const encodedQuery = encodeURIComponent(q);
    const response = await fetch(
      `https://geocode.search.hereapi.com/v1/geocode?q=${encodedQuery}&apiKey=${apiKey}&lang=pt&in=countryCode:BRA&limit=1`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      console.error('HERE Maps Geocoding error:', response.status, await response.text());
      return res.status(response.status).json({ error: 'Geocoding service error' });
    }

    const data = await response.json();

    // Normalize to [{lat, lon}] format expected by the frontend
    if (data.items?.length > 0) {
      const { lat, lng } = data.items[0].position;
      return res.status(200).json([{ lat: String(lat), lon: String(lng) }]);
    }

    return res.status(200).json([]);
  } catch (error) {
    console.error('Error in geocoding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
