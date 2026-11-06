(() => {
  const $ = (id) => document.getElementById(id);
  const API = String(window.BOTLOC_API || '').replace(/\/+$/, '');
  const TOKEN_KEY = 'botloc_token';
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
  const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* stockage bloqué */ } };
  const state = { user: null, plans: [], currency: '€', trialCredits: 2, oauthReady: true };

  const DISCORD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.5a18 18 0 0 0-6.4 0L8.6 3a19.8 19.8 0 0 0-4.9 1.4C.6 9 -.3 13.5.1 18a19.9 19.9 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.6ZM8.5 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4Zm7 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4Z"/></svg>';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => n.toFixed(2).replace('.', ',') + '\u202f' + state.currency;
  const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;

  async function api(path, opts = {}) {
    const headers = {};
    if (opts.body) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(API + path, {
      method: opts.body ? 'POST' : 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) setToken(null);
    if (!res.ok) throw new Error(data.error || 'Une erreur est survenue. Réessaie dans un instant.');
    return data;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
  }

  /* ---------- Messages de retour OAuth ---------- */
  function readBanner() {
    const p = new URLSearchParams(location.search);
    const msgs = {
      access_denied: 'Connexion annulée. Tu peux réessayer quand tu veux.',
      invalid_state: 'La connexion a expiré. Clique à nouveau sur « Se connecter avec Discord ».',
      oauth_failed: 'Discord n’a pas répondu comme prévu. Réessaie dans un instant.',
      oauth_not_configured: 'La connexion Discord n’est pas encore configurée sur ce site (DISCORD_CLIENT_ID et DISCORD_CLIENT_SECRET).',
    };
    const err = p.get('error');
    if (err) {
      $('banner').innerHTML = `<div class="err">${esc(msgs[err] || 'Une erreur est survenue.')}</div>`;
      $('banner').hidden = false;
    }
    if (err) history.replaceState(null, '', location.pathname);
  }

  // Le backend renvoie vers « /#token=… » après la connexion Discord
  function readToken() {
    const m = /^#token=([\w.-]+)$/.exec(location.hash);
    if (!m) return;
    setToken(m[1]);
    history.replaceState(null, '', location.pathname + location.search);
  }

  /* ---------- Rendu ---------- */
  function loginButton(cls = '') {
    return `<a class="btn ${cls}" href="${API}/auth/discord">${DISCORD_ICON} Se connecter avec Discord</a>`;
  }

  function renderTop() {
    const u = state.user;
    $('topRight').innerHTML = u
      ? `<span class="balance" title="1 crédit = 1 jour">${plural(u.credits, 'crédit')}</span>
         <span class="user"><img src="${esc(u.avatar)}" alt="" width="34" height="34"><span class="name">${esc(u.name)}</span></span>
         <button class="linklike" id="logout" type="button">Déconnexion</button>`
      : loginButton('small');
    const out = $('logout');
    if (out) out.onclick = () => { setToken(null); state.user = null; render(); toast('Tu es déconnecté.'); };
  }

  function renderHero() {
    const u = state.user;
    $('heroAction').innerHTML = u
      ? `<a class="btn" href="#shop">Choisir une durée</a>`
      : loginButton();
  }

  function renderPlans() {
    $('plans').innerHTML = state.plans.map((p) => `
      <li class="plan${p.highlight ? ' best' : ''}">
        <span class="plan-name">${esc(p.label)}${p.highlight ? '<span class="tag">Le plus choisi</span>' : ''}</span>
        <span class="plan-credits">${plural(p.credits, 'crédit')}</span>
        <span class="plan-price">${money(p.price)}</span>
        ${state.user
          ? `<button class="btn${p.highlight ? ' coin' : ''}" type="button" data-buy="${p.days}">Acheter</button>`
          : `<a class="btn ghost" href="${API}/auth/discord">Se connecter</a>`}
      </li>`).join('');
    $('plans').querySelectorAll('[data-buy]').forEach((b) => { b.onclick = () => openCheckout(Number(b.dataset.buy)); });

    // essai gratuit
    document.querySelector('.trial')?.remove();
    if (state.user?.trialAvailable) {
      const div = document.createElement('div');
      div.className = 'trial';
      div.innerHTML = `<span>Première visite ? ${plural(state.trialCredits, 'crédit')} offerts, une seule fois.</span><button class="btn ghost small" id="trialBtn" type="button">Récupérer l’essai gratuit</button>`;
      $('plans').after(div);
      $('trialBtn').onclick = async (e) => {
        e.target.disabled = true;
        try {
          const { user } = await api('/api/trial', { body: {} });
          state.user = user; render();
          toast(`${plural(state.trialCredits, 'crédit')} ajoutés à ton compte.`);
        } catch (err) { toast(err.message); e.target.disabled = false; }
      };
    }
  }

  async function renderOrders() {
    const box = $('account');
    if (!state.user) { box.hidden = true; return; }
    box.hidden = false;
    try {
      const { orders } = await api('/api/orders');
      $('orders').innerHTML = orders.length
        ? orders.map((o) => `
            <li>
              <span class="ref">#${esc(o.id)}</span>
              <span>${esc(o.label)} · ${plural(o.credits, 'crédit')}</span>
              <span class="muted">${new Date(o.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <strong>${money(o.price)}</strong>
            </li>`).join('')
        : '<li class="empty">Aucune commande pour l’instant. Choisis une durée ci-dessus pour commencer.</li>';
    } catch { /* session expirée : le prochain /api/me remettra l'état à jour */ }
  }

  function render() { renderTop(); renderHero(); renderPlans(); renderOrders(); }

  /* ---------- Fenêtre d'achat (démo) ---------- */
  let lastFocus = null;
  function closeModal() {
    $('modal').hidden = true;
    document.removeEventListener('keydown', onKey);
    lastFocus?.focus?.();
  }
  function onKey(e) { if (e.key === 'Escape') closeModal(); }

  function openCheckout(days) {
    const p = state.plans.find((x) => x.days === days);
    if (!p) return;
    lastFocus = document.activeElement;
    $('mBody').innerHTML = `
      <h3 id="mTitle">Ta commande</h3>
      <div class="recap">
        <div><span>Durée</span><span>${esc(p.label)}</span></div>
        <div><span>Crédits ajoutés</span><span>${plural(p.credits, 'crédit')}</span></div>
        <div class="total"><span>Total</span><span>${money(p.price)}</span></div>
      </div>
      <div class="pay" role="radiogroup" aria-label="Moyen de paiement">
        <label><input type="radio" name="pay" value="card" checked> Carte bancaire</label>
        <label><input type="radio" name="pay" value="paypal"> PayPal</label>
        <label><input type="radio" name="pay" value="crypto"> Crypto</label>
      </div>
      <div class="row">
        <button class="btn ghost" type="button" id="mCancel">Annuler</button>
        <button class="btn coin" type="button" id="mConfirm">Payer ${money(p.price)}</button>
      </div>
      <p class="note">Démonstration : aucun paiement n’est effectué.</p>`;
    $('modal').hidden = false;
    document.addEventListener('keydown', onKey);
    $('mCancel').onclick = closeModal;
    $('modal').onclick = (e) => { if (e.target === $('modal')) closeModal(); };
    $('mConfirm').focus();

    $('mConfirm').onclick = async (e) => {
      const btn = e.target;
      btn.disabled = true;
      btn.textContent = 'Paiement en cours…';
      try {
        await new Promise((r) => setTimeout(r, 900)); // petite attente pour le côté « vrai paiement »
        const { order, user } = await api('/api/purchase', { body: { days } });
        state.user = user;
        render();
        $('mBody').innerHTML = `
          <div class="done">
            <div class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
            <h3 id="mTitle">Commande confirmée</h3>
            <p>${plural(order.credits, 'crédit')} ajoutés à ton compte. Commande #${esc(order.id)}.</p>
            <button class="btn" type="button" id="mDone">Terminé</button>
          </div>`;
        $('mDone').onclick = closeModal;
        $('mDone').focus();
      } catch (err) {
        closeModal();
        toast(err.message);
        if (/Connecte-toi/.test(err.message)) { state.user = null; render(); }
      }
    };
  }

  /* ---------- Compte à rebours décoratif ---------- */
  function startTicker() {
    const total = 7 * 86400;
    let left = total - 1;
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const d = Math.floor(left / 86400), h = Math.floor(left % 86400 / 3600), m = Math.floor(left % 3600 / 60), s = left % 60;
      $('tickerTime').textContent = `${d}j ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
      $('tickerFill').style.width = (left / total * 100).toFixed(3) + '%';
      left = left > 1 ? left - 1 : total - 1;
    };
    tick();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(tick, 1000);
  }

  /* ---------- Démarrage ---------- */
  (async function init() {
    readBanner();
    readToken();
    startTicker();
    if (!API) {
      $('banner').innerHTML = '<div class="err">L’adresse de l’API n’est pas configurée (fichier config.js).</div>';
      $('banner').hidden = false;
    }
    try {
      const [plans, me] = await Promise.all([api('/api/plans'), api('/api/me')]);
      Object.assign(state, { plans: plans.plans, currency: plans.currency, trialCredits: plans.trialCredits, user: me.user, oauthReady: me.oauthReady });
    } catch (e) {
      $('banner').innerHTML = '<div class="err">Impossible de charger la boutique. Recharge la page.</div>';
      $('banner').hidden = false;
    }
    render();
  })();
})();
