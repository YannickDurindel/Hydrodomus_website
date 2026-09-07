/* =============================================
   HYDRODOMUS LEARN — per-page bilingual engine
   Reads window.LEARN_I18N = { fr: {...}, en: {...} }
   and applies it to [data-li18n] / [data-li18n-html].
   Shares the same 'hd_lang' localStorage key as the
   main site, so the language choice stays in sync.
   ============================================= */

(function () {
  const DICT = window.LEARN_I18N;
  if (!DICT) return;

  function currentLang() {
    return localStorage.getItem('hd_lang') || 'fr';
  }

  function lt(key) {
    const lang = currentLang();
    return (DICT[lang] && DICT[lang][key]) || (DICT.en && DICT.en[key]) || key;
  }

  function apply() {
    const lang = currentLang();
    document.querySelectorAll('[data-li18n]').forEach((el) => {
      el.textContent = lt(el.dataset.li18n);
    });
    document.querySelectorAll('[data-li18n-html]').forEach((el) => {
      el.innerHTML = lt(el.dataset.li18nHtml);
    });
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    document.documentElement.lang = lang;
  }

  function init() {
    apply();
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => apply());
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
