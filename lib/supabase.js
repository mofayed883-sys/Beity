function getConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    const error = new Error('Supabase is not configured on the server.');
    error.status = 503;
    throw error;
  }
  return { url: url.replace(/\/$/, ''), anonKey };
}

function getBearer(req) {
  const value = req.headers.authorization || req.headers.Authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

async function getUserContext(req) {
  const { url, anonKey } = getConfig();
  const token = getBearer(req);
  if (!token) {
    const error = new Error('سجّل الدخول أولاً.');
    error.status = 401;
    throw error;
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const error = new Error('انتهت جلسة الدخول. سجّل الدخول مرة أخرى.');
    error.status = 401;
    throw error;
  }
  const user = await response.json();
  return { url, anonKey, token, user };
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function parseJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

module.exports = { getConfig, getUserContext, sendJson, parseJson };
