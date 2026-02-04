export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { cnpj } = req.query;

  if (!cnpj || typeof cnpj !== 'string') {
    return res.status(400).json({ status: 'ERROR', message: 'CNPJ é obrigatório' });
  }

  // Clean CNPJ (remove non-digits)
  const cleanCnpj = cnpj.replace(/\D/g, '');

  if (cleanCnpj.length !== 14) {
    return res.status(400).json({ status: 'ERROR', message: 'CNPJ deve ter 14 dígitos' });
  }

  try {
    const token = process.env.RECEITAWS_TOKEN;

    // Build URL - token can be passed as query param or header depending on API version
    const baseUrl = `https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}`;
    const url = token ? `${baseUrl}?token=${token}` : baseUrl;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    // Some API versions require Authorization header
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ReceitaWS error:', response.status, errorText);
      return res.status(response.status).json({
        status: 'ERROR',
        message: `Erro na API: ${response.status}`
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching CNPJ:', error);
    return res.status(500).json({ status: 'ERROR', message: 'Erro ao consultar CNPJ' });
  }
}
