/* =============================================
   HYDRODOMUS — Soft password gate (learn, dataroom)
   Client-side only: it keeps casual visitors out, it is not
   real access control. Do not rely on it for secrets.
   ============================================= */
(function () {
  const me = document.currentScript;
  const scope = me.dataset.scope, hash = me.dataset.hash;
  const KEY = 'hd_gate_' + scope;

  async function sha(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const check = (pw) => sha('hydrodomus:' + scope + ':' + pw.trim().toUpperCase());

  const root = document.documentElement;
  if (sessionStorage.getItem(KEY) === hash) return;

  root.classList.add('gate-locked');
  const style = document.createElement('style');
  style.textContent = `
    html.gate-locked body > *:not(#gate-overlay) { visibility: hidden !important; }
    #gate-overlay { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; background: #0B1220; font-family: 'Inter', system-ui, sans-serif; }
    #gate-overlay form { width: min(92vw, 380px); background: #fff; border-radius: 14px; padding: 2rem; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
    #gate-overlay h1 { font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 1.3rem; margin: 0 0 .4rem; color: #0B1220; }
    #gate-overlay p { margin: 0 0 1.2rem; color: #5b6472; font-size: .9rem; }
    #gate-overlay input { width: 100%; box-sizing: border-box; padding: .8rem 1rem; border: 1px solid #cfd6e0; border-radius: 8px; font-size: 1rem; letter-spacing: .08em; }
    #gate-overlay button { width: 100%; margin-top: .8rem; padding: .8rem; border: 0; border-radius: 8px; background: #144EE0; color: #fff; font-weight: 600; font-size: 1rem; cursor: pointer; }
    #gate-overlay .gate-err { color: #c0392b; font-size: .85rem; margin-top: .6rem; min-height: 1.1em; }`;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', () => {
    const fr = (localStorage.getItem('hd_lang') || 'fr') === 'fr';
    const L = fr
      ? { t: 'Accès protégé', p: 'Entrez le mot de passe qui vous a été communiqué.', ph: 'Mot de passe', b: 'Accéder', e: 'Mot de passe incorrect.' }
      : { t: 'Protected access', p: 'Enter the password you were given.', ph: 'Password', b: 'Unlock', e: 'Incorrect password.' };
    const o = document.createElement('div');
    o.id = 'gate-overlay';
    o.innerHTML = `<form autocomplete="off"><h1>${L.t}</h1><p>${L.p}</p>
      <input type="password" placeholder="${L.ph}" aria-label="${L.ph}" autofocus>
      <button type="submit">${L.b}</button><div class="gate-err" role="alert"></div></form>`;
    document.body.appendChild(o);
    const input = o.querySelector('input'), err = o.querySelector('.gate-err');
    o.querySelector('form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!window.crypto || !crypto.subtle) { err.textContent = 'Secure context required (https).'; return; }
      if (await check(input.value) === hash) {
        try { sessionStorage.setItem(KEY, hash); } catch (_) {}
        root.classList.remove('gate-locked'); o.remove();
      } else { err.textContent = L.e; input.select(); }
    });
    input.focus();
  });
})();
