const { getUserContext, sendJson, parseJson } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  try {
    const context = await getUserContext(req);
    const headers = {
      apikey: context.anonKey,
      Authorization: `Bearer ${context.token}`,
      'Content-Type': 'application/json'
    };

    if (req.method === 'GET') {
      const response = await fetch(`${context.url}/rest/v1/projects?select=*&order=updated_at.desc`, { headers });
      const data = await response.json();
      return sendJson(res, response.status, data);
    }

    if (req.method === 'POST') {
      const body = await parseJson(req);
      if (!body.project_name || !String(body.project_name).trim()) {
        return sendJson(res, 400, { error: 'اسم المشروع مطلوب.' });
      }
      if (body.room_image_path && (typeof body.room_image_path !== 'string' || !body.room_image_path.startsWith(`${context.user.id}/`))) {
        return sendJson(res, 400, { error: 'مسار الصورة غير صالح.' });
      }
      const project = {
        owner_id: context.user.id,
        project_name: String(body.project_name).trim().slice(0, 160),
        client_name: String(body.client_name || '').slice(0, 160),
        client_phone: String(body.client_phone || '').slice(0, 40),
        room_type: String(body.room_type || '').slice(0, 100),
        design_style: String(body.design_style || '').slice(0, 100),
        notes: String(body.notes || '').slice(0, 3000),
        room_image_path: body.room_image_path || null,
        selected_furniture: Array.isArray(body.selected_furniture) ? body.selected_furniture.slice(0, 50).map((item) => String(item).slice(0, 160)) : [],
        status: 'draft'
      };
      const response = await fetch(`${context.url}/rest/v1/projects`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(project)
      });
      const data = await response.json();
      return sendJson(res, response.status, Array.isArray(data) ? data[0] : data);
    }

    if (req.method === 'PATCH') {
      const id = new URL(req.url, 'http://localhost').searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: 'معرّف المشروع مطلوب.' });
      const body = await parseJson(req);
      const fields = ['project_name', 'client_name', 'client_phone', 'room_type', 'design_style', 'notes', 'room_image_path', 'selected_furniture', 'status'];
      const updates = {};
      for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field];
      }
      if (updates.room_image_path && !updates.room_image_path.startsWith(`${context.user.id}/`)) {
        return sendJson(res, 400, { error: 'مسار الصورة غير صالح.' });
      }
      if (Object.keys(updates).length === 0) return sendJson(res, 400, { error: 'لا توجد بيانات لتحديثها.' });
      const response = await fetch(`${context.url}/rest/v1/projects?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      return sendJson(res, response.status, Array.isArray(data) ? data[0] : data);
    }

    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://localhost').searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: 'معرّف المشروع مطلوب.' });
      const response = await fetch(`${context.url}/rest/v1/projects?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=minimal' }
      });
      return sendJson(res, response.ok ? 200 : response.status, response.ok ? { ok: true } : await response.json());
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'حدث خطأ غير متوقع.' });
  }
};
