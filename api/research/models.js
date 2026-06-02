import { sendModuleData } from '../_moduleResponse.js';

export default function handler(req, res) {
  sendModuleData(res, 'research');
}
