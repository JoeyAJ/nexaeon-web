import { getResearchLiterature } from '../../lib/researchLiterature.js';
import { rejectUnsupportedMethod, sendJsonResponse } from '../_response.js';

export default async function handler(req, res) {
  if (rejectUnsupportedMethod(req, res)) return;

  const payload = await getResearchLiterature();

  sendJsonResponse(req, res, payload);
}
