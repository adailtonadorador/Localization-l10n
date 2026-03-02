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
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${apiKey}&region=br&language=pt-BR`
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Geocoding service error' });
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return res.status(200).json({ lat, lng });
    }

    return res.status(404).json({ error: 'Address not found', status: data.status });
  } catch (error) {
    console.error('Error in geocoding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
