import { getResearchLiterature } from '../../lib/researchLiterature.js';

export default async function handler(req, res) {
  const payload = await getResearchLiterature();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json(payload);
}
