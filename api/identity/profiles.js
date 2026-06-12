import { getIdentityProfiles } from '../../lib/identityProfiles.js';
import { rejectUnsupportedMethod, sendJsonResponse } from '../_response.js';

export default async function handler(req, res) {
  if (rejectUnsupportedMethod(req, res)) return;

  const payload = await getIdentityProfiles();

  sendJsonResponse(req, res, payload);
}
