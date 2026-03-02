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

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not configured');
    return res.status(500).json({ error: 'Geocoding API key not configured' });
  }

  try {
    const encodedQuery = encodeURIComponent(q);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${apiKey}&language=pt-BR&region=br`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      console.error('Google Maps Geocoding error:', response.status);
      return res.status(response.status).json({ error: 'Geocoding service error' });
    }

    const data = await response.json();

    // Normalize to [{lat, lon}] format expected by the frontend
    if (data.status === 'OK' && data.results?.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return res.status(200).json([{ lat: String(lat), lon: String(lng) }]);
    }

    // ZERO_RESULTS or other non-error statuses → empty array
    return res.status(200).json([]);
  } catch (error) {
    console.error('Error in geocoding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
