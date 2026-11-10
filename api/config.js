const { getConfig, sendJson } = require('../lib/supabase');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  try {
    const { url, anonKey } = getConfig();
    res.setHeader('Cache-Control', 'no-store');
    return sendJson(res, 200, { supabaseUrl: url, supabaseAnonKey: anonKey });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: 'Supabase is not configured.' });
  }
};
