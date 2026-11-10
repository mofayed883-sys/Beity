const { getUserContext, sendJson, parseJson } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  try {
    const context = await getUserContext(req);
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'Method not allowed.' });
    }
    const { path } = await parseJson(req);
    if (typeof path !== 'string' || !path.startsWith(`${context.user.id}/`) || path.includes('..')) {
      return sendJson(res, 400, { error: 'مسار الصورة غير صالح.' });
    }
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${context.url}/storage/v1/object/sign/room-photos/${encodedPath}`, {
      method: 'POST',
      headers: {
        apikey: context.anonKey,
        Authorization: `Bearer ${context.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: 3600 })
    });
    const data = await response.json();
    if (!response.ok) return sendJson(res, response.status, data);
    const signedPath = data.signedURL || data.signedUrl || '';
    const signedUrl = signedPath.startsWith('http')
      ? signedPath
      : signedPath.startsWith('/storage/v1/')
        ? `${context.url}${signedPath}`
        : `${context.url}/storage/v1/${signedPath.replace(/^\//, '')}`;
    return sendJson(res, 200, { url: signedUrl });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'تعذر تجهيز رابط الصورة.' });
  }
};
