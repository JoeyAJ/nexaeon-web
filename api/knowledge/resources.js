import { getKnowledgeResources } from '../../lib/knowledgeResources.js';
import { rejectUnsupportedMethod, sendJsonResponse } from '../_response.js';

export default async function handler(req, res) {
  if (rejectUnsupportedMethod(req, res)) return;

  const payload = await getKnowledgeResources();

  sendJsonResponse(req, res, payload);
}
