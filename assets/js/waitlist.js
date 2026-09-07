/* =============================================
   HYDRODOMUS — Waitlist: one question at a time
   ============================================= */

(function () {
  const cardEl = document.getElementById('qflow-card');
  const progressEl = document.getElementById('qflow-progress');
  if (!cardEl || !progressEl) return;

  const FORM_ENDPOINT = 'https://formspree.io/f/xzdjzoba';

  const QUESTIONS = [
    { key: 'name',     type: 'text',   q: 'wl.q.name',     ph: 'wl.ph.name' },
    { key: 'car',      type: 'text',   q: 'wl.q.car',      ph: 'wl.ph.car' },
    { key: 'status',   type: 'choice', q: 'wl.q.status',   options: ['wl.status.opt1', 'wl.status.opt2', 'wl.status.opt3'] },
    { key: 'interest', type: 'choice', q: 'wl.q.interest', options: ['wl.interest.opt1', 'wl.interest.opt2', 'wl.interest.opt3', 'wl.interest.opt4', 'wl.interest.opt5'],
      skip: (a) => a.status === (window.t ? window.t('wl.status.opt1') : '') },
    { key: 'country',  type: 'text',   q: 'wl.q.country',  ph: 'wl.ph.country' },
    { key: 'email',    type: 'email',  q: 'wl.q.email',    ph: 'wl.ph.email' },
  ];

  const answers = {};
  const history = [];
  let current = -1;
  let finished = false;

  function t(key) { return window.t ? window.t(key) : key; }

  function firstIndex() {
    let i = 0;
    while (i < QUESTIONS.length && QUESTIONS[i].skip && QUESTIONS[i].skip(answers)) i++;
    return i;
  }
  function nextIndex(from) {
    let i = from + 1;
    while (i < QUESTIONS.length && QUESTIONS[i].skip && QUESTIONS[i].skip(answers)) i++;
    return i;
  }

  function updateProgress() {
    progressEl.innerHTML = '';
    if (finished) {
      const dot = document.createElement('div');
      dot.className = 'qflow-dot done';
      progressEl.appendChild(dot);
      return;
    }
    for (let i = 0; i < QUESTIONS.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'qflow-dot' + (i < current ? ' done' : i === current ? ' current' : '');
      progressEl.appendChild(dot);
    }
  }

  function goBack() {
    if (history.length <= 1) return;
    history.pop();
    current = history[history.length - 1];
    render();
  }

  function advance(key, value) {
    answers[key] = value;
    const next = nextIndex(current);
    if (next >= QUESTIONS.length) {
      submit();
      return;
    }
    current = next;
    history.push(current);
    render();
  }

  function render() {
    cardEl.classList.remove('qflow-card');
    void cardEl.offsetWidth; // restart entry animation
    cardEl.classList.add('qflow-card');
    updateProgress();

    const q = QUESTIONS[current];
    cardEl.innerHTML = '';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'qflow-eyebrow';
    eyebrow.textContent = t('wl.step').replace('{n}', current + 1).replace('{total}', QUESTIONS.length);
    cardEl.appendChild(eyebrow);

    const question = document.createElement('div');
    question.className = 'qflow-question';
    question.textContent = t(q.q);
    cardEl.appendChild(question);

    if (q.type === 'choice') {
      const wrap = document.createElement('div');
      wrap.className = 'qflow-choices';
      q.options.forEach((optKey) => {
        const label = t(optKey);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'qflow-choice-btn';
        btn.textContent = label;
        if (answers[q.key] === label) btn.classList.add('selected');
        btn.addEventListener('click', () => advance(q.key, label));
        wrap.appendChild(btn);
      });
      cardEl.appendChild(wrap);
    } else {
      const form = document.createElement('form');
      form.noValidate = true;
      const input = document.createElement('input');
      input.className = 'qflow-input';
      input.type = q.type === 'email' ? 'email' : 'text';
      input.placeholder = t(q.ph);
      input.value = answers[q.key] || '';
      input.autocomplete = q.type === 'email' ? 'email' : 'off';
      form.appendChild(input);

      const error = document.createElement('div');
      error.className = 'qflow-error';
      form.appendChild(error);

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) { error.textContent = t('wl.err.required'); return; }
        if (q.type === 'email' && !/^\S+@\S+\.\S+$/.test(val)) { error.textContent = t('wl.err.email'); return; }
        advance(q.key, val);
      });

      cardEl.appendChild(form);
      setTimeout(() => input.focus(), 10);
    }

    const actions = document.createElement('div');
    actions.className = 'qflow-actions';
    if (history.length > 1) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'qflow-back';
      back.textContent = t('wl.back');
      back.addEventListener('click', goBack);
      actions.appendChild(back);
    }
    if (q.type !== 'choice') {
      const hint = document.createElement('span');
      hint.className = 'qflow-hint';
      hint.textContent = t('wl.enter');
      actions.appendChild(hint);
    }
    cardEl.appendChild(actions);
  }

  function renderDone(errorMsg) {
    finished = !errorMsg;
    updateProgress();
    cardEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'qflow-done';
    const title = document.createElement('div');
    title.className = 'qflow-done-title';
    const sub = document.createElement('div');
    sub.className = 'qflow-done-sub';
    if (errorMsg) {
      title.textContent = t('wl.q.email');
      sub.textContent = errorMsg;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn btn-primary';
      retry.style.marginTop = '1.5rem';
      retry.textContent = t('wl.back');
      retry.addEventListener('click', () => { finished = false; render(); });
      wrap.appendChild(title);
      wrap.appendChild(sub);
      wrap.appendChild(retry);
    } else {
      title.textContent = t('wl.done.title');
      sub.textContent = t('wl.done.sub');
      wrap.appendChild(title);
      wrap.appendChild(sub);
    }
    cardEl.appendChild(wrap);
  }

  function submit() {
    cardEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'qflow-done';
    wrap.textContent = '…';
    cardEl.appendChild(wrap);

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name: answers.name,
        current_vehicle: answers.car,
        hydrogen_status: answers.status,
        hydrogen_interest: answers.interest || 'n/a',
        country: answers.country,
        email: answers.email,
        _subject: "Nouvelle inscription — liste d'attente Hydrodomus",
      }),
    })
      .then((res) => { if (res.ok) renderDone(null); else renderDone(t('wl.err.submit')); })
      .catch(() => renderDone(t('wl.err.submit')));
  }

  function init() {
    current = firstIndex();
    history.push(current);
    render();
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => { if (!finished) render(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
