(function () {
  const nameWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nameNodes = [];
  let nameNode;
  while ((nameNode = nameWalker.nextNode())) nameNodes.push(nameNode);
  nameNodes.forEach((node) => {
    node.nodeValue = node.nodeValue.replaceAll('أحمد الشريف', 'محمد فايد');
  });

  const routes = {
    'landing-page': '../beity/code.html',
    dashboard: '../_1/code.html',
    'new-project': '../_3/code.html',
    'projects-and-clients': '../_4/code.html',
    'pricing-and-plans': '../beity/code.html',
    result: '../_2/code.html',
    login: '../beity/code.html'
  };

  function toast(message) {
    let el = document.getElementById('app-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-toast';
      el.className = 'fixed bottom-5 left-5 z-[100] rounded-xl bg-primary px-4 py-3 text-sm text-white shadow-xl transition-all duration-300 opacity-0 pointer-events-none translate-y-3';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-3');
    el.classList.add('opacity-100', 'translate-y-0');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.classList.remove('opacity-100', 'translate-y-0');
      el.classList.add('opacity-0', 'pointer-events-none', 'translate-y-3');
    }, 2200);
  }

  const config = window.BEITY_CONFIG || {};
  const sessionKey = 'beity.supabase.session';
  let authBase = String(config.supabaseUrl || '').replace(/\/$/, '');
  let session = null;
  try { session = JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch (_) {}

  const configReady = fetch('/api/config').then(async (response) => {
    if (response.ok) Object.assign(config, await response.json());
    authBase = String(config.supabaseUrl || '').replace(/\/$/, '');
  }).catch(() => {});

  function configured() {
    return Boolean(authBase && config.supabaseAnonKey);
  }

  async function authRequest(path, body) {
    await configReady;
    const response = await fetch(`${authBase}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: config.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || 'تعذر تسجيل الدخول.');
    return data;
  }

  function saveSession(nextSession) {
    session = nextSession;
    if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
    else localStorage.removeItem(sessionKey);
    const button = document.getElementById('beity-account-button');
    if (button) button.textContent = session?.user?.email || 'دخول / إنشاء حساب';
  }

  async function apiFetch(path, options = {}) {
    await configReady;
    if (!configured()) throw new Error('إعداد Supabase غير مكتمل. أضف SUPABASE_URL وSUPABASE_ANON_KEY في إعدادات Vercel.');
    if (!session?.access_token) throw new Error('سجّل الدخول أو أنشئ حسابًا أولاً.');
    const send = (token) => fetch(path, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }
    });
    let response = await send(session.access_token);
    if (response.status === 401 && session.refresh_token) {
      const refreshed = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
      saveSession({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, user: refreshed.user });
      response = await send(session.access_token);
    }
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.message || data?.error_description || data?.error || 'تعذر تنفيذ العملية.');
    return data;
  }

  function mountAccount() {
    if (document.getElementById('beity-account-button')) return;
    const button = document.createElement('button');
    button.id = 'beity-account-button';
    button.type = 'button';
    button.className = 'fixed bottom-5 right-5 z-[90] rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-xl';
    button.textContent = session?.user?.email || 'دخول / إنشاء حساب';

    const modal = document.createElement('div');
    modal.id = 'beity-auth-modal';
    modal.className = 'fixed inset-0 z-[110] hidden items-center justify-center bg-black/40 p-4';
    modal.innerHTML = `<section class="w-full max-w-md rounded-2xl bg-white p-6 text-right shadow-2xl" dir="rtl"><div class="mb-4 flex items-center justify-between"><h2 class="text-2xl font-bold text-primary">حساب بيتي</h2><button type="button" data-auth-close class="rounded-lg px-3 py-1 text-xl text-outline" aria-label="إغلاق">×</button></div><p class="mb-4 text-sm text-on-surface-variant">سجّل الدخول لحفظ مشاريعك وصور الغرف في حسابك.</p><div data-auth-config class="mb-4 hidden rounded-xl bg-amber-50 p-3 text-sm text-amber-800">أضف SUPABASE_URL وSUPABASE_ANON_KEY في متغيرات بيئة Vercel.</div><form id="beity-auth-form" class="space-y-3"><label class="block text-sm font-bold">البريد الإلكتروني<input required type="email" name="email" autocomplete="email" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 font-normal"></label><label class="block text-sm font-bold">كلمة المرور<input required minlength="8" type="password" name="password" autocomplete="current-password" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 font-normal"></label><div class="flex gap-2"><button class="flex-1 rounded-xl bg-primary px-4 py-3 font-bold text-white" type="submit" data-auth-mode="login">دخول</button><button class="flex-1 rounded-xl bg-surface-container px-4 py-3 font-bold text-primary" type="submit" data-auth-mode="signup">إنشاء حساب</button></div></form><button type="button" id="beity-logout" class="mt-3 hidden w-full rounded-xl border border-gray-200 px-4 py-3 font-bold text-red-700">تسجيل الخروج</button><p id="beity-auth-message" role="status" class="mt-3 text-sm text-primary"></p></section>`;
    document.body.append(button, modal);

    const form = modal.querySelector('#beity-auth-form');
    const message = modal.querySelector('#beity-auth-message');
    const logout = modal.querySelector('#beity-logout');
    async function open() {
      await configReady;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      modal.querySelector('[data-auth-config]').classList.toggle('hidden', configured());
      logout.classList.toggle('hidden', !session);
      message.textContent = '';
    }
    button.addEventListener('click', open);
    modal.querySelector('[data-auth-close]').addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.querySelector('[data-auth-close]').click();
    });
    logout.addEventListener('click', async () => {
      try {
        if (session?.access_token && configured()) {
          await fetch(`${authBase}/auth/v1/logout`, { method: 'POST', headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${session.access_token}` } });
        }
      } finally {
        saveSession(null);
        modal.querySelector('[data-auth-close]').click();
        toast('تم تسجيل الخروج');
      }
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!configured()) return open();
      const values = new FormData(form);
      const mode = event.submitter?.dataset.authMode || 'login';
      message.textContent = 'جارٍ الاتصال…';
      try {
        const data = await authRequest(mode === 'signup' ? 'signup' : 'token?grant_type=password', {
          email: values.get('email'), password: values.get('password')
        });
        if (data.access_token) {
          saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user });
          message.textContent = 'تم تسجيل الدخول. يمكنك إغلاق النافذة.';
          logout.classList.remove('hidden');
          refreshProjects();
        } else {
          message.textContent = 'تم إنشاء الحساب. راجع بريدك لتأكيده، ثم سجّل الدخول.';
        }
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  async function uploadRoomPhoto(file) {
    await configReady;
    if (!file) return null;
    if (!session?.access_token) throw new Error('سجّل الدخول أولاً لرفع صورة الغرفة.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('صيغة الصورة يجب أن تكون JPG أو PNG أو WebP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('الحد الأقصى لحجم الصورة 5 ميجابايت.');
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${authBase}/storage/v1/object/room-photos/${encodedPath}`, {
      method: 'POST',
      headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': file.type, 'x-upsert': 'false' },
      body: file
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'تعذر رفع الصورة.');
    return path;
  }

  async function refreshProjects() {
    const projectsTable = document.querySelector('main table tbody');
    if (!projectsTable || !window.location.pathname.endsWith('/_4/code.html') || !session?.access_token) return;
    try {
      const projects = await apiFetch('/api/projects');
      projectsTable.innerHTML = projects.length ? projects.map((project) => `<tr><td class="px-5 py-4 font-bold text-primary">${escapeHtml(project.project_name)}</td><td class="px-5 py-4">${escapeHtml(project.client_name || '—')}</td><td class="px-5 py-4">${escapeHtml(project.room_type || '—')}</td><td class="px-5 py-4"><span class="rounded-full bg-surface-container px-3 py-1 text-xs">${escapeHtml(project.status || 'مسودة')}</span></td><td class="px-5 py-4 text-outline">${new Date(project.updated_at).toLocaleDateString('ar-EG')}</td><td class="px-5 py-4"><button type="button" data-delete-project="${escapeHtml(project.id)}" class="font-bold text-red-700">حذف</button></td></tr>`).join('') : '<tr><td colspan="6" class="p-8 text-center text-outline">لا توجد مشاريع محفوظة في هذا الحساب حتى الآن.</td></tr>';
      projectsTable.querySelectorAll('[data-delete-project]').forEach((deleteButton) => {
        deleteButton.addEventListener('click', async () => {
          if (!window.confirm('هل تريد حذف هذا المشروع؟')) return;
          try {
            await apiFetch(`/api/projects?id=${encodeURIComponent(deleteButton.dataset.deleteProject)}`, { method: 'DELETE' });
            refreshProjects();
          } catch (error) { toast(error.message); }
        });
      });
    } catch (error) {
      toast(error.message);
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function wireProjectForm() {
    const form = document.querySelector('form');
    if (!form || !window.location.pathname.endsWith('/_3/code.html')) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button:last-of-type');
      const original = submit?.textContent;
      if (submit) { submit.disabled = true; submit.textContent = 'جارٍ حفظ المشروع…'; }
      try {
        const cards = [...form.querySelectorAll('div.bg-surface-container-lowest')];
        const roomCard = cards.find((card) => card.querySelector('h2')?.textContent.includes('نوع الغرفة'));
        const styleCard = cards.find((card) => card.querySelector('h2')?.textContent.includes('نمط التصميم'));
        const roomType = [...(roomCard?.querySelectorAll('button') || [])].find((item) => item.classList.contains('bg-primary'))?.textContent.trim() || '';
        const designStyle = [...(styleCard?.querySelectorAll('button') || [])].find((item) => item.classList.contains('bg-surface-container-lowest'))?.textContent.trim() || '';
        const imagePath = await uploadRoomPhoto(window.beityRoomFile);
        const project = await apiFetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_name: form.querySelector('#projectName')?.value,
            client_name: form.querySelector('#clientName')?.value,
            client_phone: form.querySelector('#clientPhone')?.value,
            room_type: roomType,
            design_style: designStyle,
            notes: form.querySelector('#designNotes')?.value,
            room_image_path: imagePath,
            selected_furniture: [...form.querySelectorAll('button[title="حذف"]')].map((button) => button.parentElement?.querySelector('.truncate')?.textContent.trim()).filter(Boolean)
          })
        });
        toast('تم حفظ المشروع في حسابك');
        window.location.href = `../_4/code.html?project=${encodeURIComponent(project.id)}`;
      } catch (error) {
        toast(error.message);
        if (!session) mountAccount();
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = original; }
      }
    });
  }

  mountAccount();
  wireProjectForm();
  refreshProjects();

  function navigate(path) {
    const target = routes[path];
    if (target) window.location.href = target;
    else toast('هذه الشاشة غير متاحة في النسخة الحالية');
  }

  if (window.location.pathname.endsWith('/beity/code.html')) {
    const showcase = document.getElementById('demo-preview');
    if (showcase && !document.getElementById('same-scene-note')) {
      const note = document.createElement('div');
      note.id = 'same-scene-note';
      note.className = 'mx-2 mt-2 rounded-lg bg-secondary-fixed/30 px-4 py-2 text-center text-sm font-bold text-primary';
      note.textContent = 'نفس الشقة • نفس الزاوية • نفس الإضاءة والألوان • التغيير في الأثاث فقط';
      showcase.insertBefore(note, showcase.firstChild);
    }
  }

  function attachImagePicker(button) {
    let input = document.getElementById('beity-image-picker');
    if (!input) {
      input = document.createElement('input');
      input.id = 'beity-image-picker';
      input.type = 'file';
      input.accept = 'image/*';
      input.className = 'hidden';
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        window.beityRoomFile = file;
        const image = button.closest('div.relative')?.querySelector('img');
        if (image) image.src = URL.createObjectURL(file);
        toast('تم اختيار صورة الغرفة');
      });
    }
    input.click();
  }

  document.querySelectorAll('[data-path]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.dataset.path);
    });
  });

  document.querySelectorAll('a[href="#"]').forEach((link) => {
    if (link.dataset.path) return;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      toast('هذا الرابط جاهز للربط بالخدمة');
    });
  });

  document.querySelectorAll('button[type="button"]').forEach((button) => {
    const label = button.textContent.trim();
    const hasInlineAction = button.hasAttribute('onclick');

    if (/استبدال|رفع صورة|رفع ملف/.test(label)) {
      button.addEventListener('click', () => attachImagePicker(button));
      return;
    }

    if (/صمّم الغرفة/.test(label)) {
      button.addEventListener('click', () => {
        if (window.location.pathname.endsWith('/_3/code.html')) {
          button.closest('form')?.requestSubmit();
        } else {
          navigate('result');
        }
      });
      return;
    }

    if (button.title === 'حذف') {
      button.addEventListener('click', () => {
        button.closest('.border')?.remove();
        toast('تم حذف قطعة الأثاث');
      });
      return;
    }

    const grid = button.closest('.grid');
    if (grid && !hasInlineAction && label) {
      button.addEventListener('click', () => {
        grid.querySelectorAll('button').forEach((item) => {
          item.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
          item.classList.add('text-outline');
        });
        button.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
        button.classList.remove('text-outline');
        toast(`تم اختيار: ${label}`);
      });
      return;
    }

    if (!hasInlineAction && label) {
      button.addEventListener('click', () => toast(`تم الضغط على: ${label}`));
    }
  });
})();
