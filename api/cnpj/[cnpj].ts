import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const url = token
      ? `https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}?token=${token}`
      : `https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching CNPJ:', error);
    return res.status(500).json({ status: 'ERROR', message: 'Erro ao consultar CNPJ' });
  }
}
