export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // Use Nominatim API (OpenStreetMap)
    const encodedQuery = encodeURIComponent(q);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&countrycodes=br`,
      {
        headers: {
          'User-Agent': 'PlataformaSama/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Nominatim error:', response.status);
      return res.status(response.status).json({ error: 'Geocoding service error' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in geocoding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
