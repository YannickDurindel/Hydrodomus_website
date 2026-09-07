/* =============================================
   HYDRODOMUS — Main JavaScript
   Translations · Navigation · Animations
   ============================================= */

const translations = {
  fr: {
    'nav.home':     'Accueil',
    'nav.how':      'Comment ça marche',
    'nav.waitlist': "Liste d'attente",
    'nav.contact':  'Contact',

    'home.headline': 'Ravitaillez votre voiture à hydrogène chez vous',
    'home.subline':  "Rendons l'hydrogène abordable et propre",

    'chem.s1':    'Eau non traitée',
    'chem.s2':    'Filtration par osmose inverse',
    'chem.s3':    'Électrolyse',
    'chem.s4':    "Rejet de l'O₂",
    'chem.s5':    'Séchage',
    'chem.s6':    'Filtration finale',
    'chem.s7':    'Compression',

    'how.s1': 'Eau',
    'how.s2': 'Filtration',
    'how.s3': 'Électrolyse (PEM)',
    'how.s4': 'Filtration et séchage',
    'how.s5': 'Tampon basse pression',
    'how.s6': 'Tampon haute pression',
    'how.s7': 'Réservoir final',
    'how.s8': 'Distribution 700 bar',

    'how.lbl.filter':      'Filtre',
    'how.lbl.pem':         'Électrolyse',
    'how.lbl.dryer':       'Filtre + séchage',
    'how.lbl.buf1':        'Tampon BP',
    'how.lbl.compressor':  'Compresseur',
    'how.lbl.buf2':        'Tampon HP',
    'how.lbl.pump2':       'Pompe HP',
    'how.lbl.tank':        'Réservoir',

    'wl.step':    'Étape {n} sur {total}',
    'wl.back':    '← Modifier',
    'wl.enter':   'Appuyez sur Entrée ↵',

    'wl.q.name':        'Comment vous appelez-vous ?',
    'wl.ph.name':       'Nom complet',
    'wl.q.car':         'Que conduisez-vous aujourd’hui ?',
    'wl.ph.car':        'Ex. Renault Clio, Tesla Model 3…',
    'wl.q.status':      'Roulez-vous déjà à l’hydrogène, ou aimeriez-vous essayer ?',
    'wl.status.opt1':   'Je roule déjà à l’hydrogène',
    'wl.status.opt2':   'J’aimerais essayer',
    'wl.status.opt3':   'Je ne sais pas encore',
    'wl.q.interest':    'Quel véhicule à hydrogène vous intéresse le plus ?',
    'wl.interest.opt1': 'Toyota Mirai',
    'wl.interest.opt2': 'Hyundai Nexo',
    'wl.interest.opt3': 'BMW iX5 Hydrogen',
    'wl.interest.opt4': 'Honda CR-V e:FCEV',
    'wl.interest.opt5': 'Autre / pas encore décidé',
    'wl.q.country':     'De quel pays venez-vous ?',
    'wl.ph.country':    'France, Belgique, Suisse…',
    'wl.q.email':       'Votre email',
    'wl.ph.email':      'vous@exemple.com',
    'wl.err.required':  'Ce champ est requis.',
    'wl.err.email':     'Veuillez entrer un email valide.',

    'wl.done.title': 'Merci ! Vous êtes sur la liste.',
    'wl.done.sub':   'Nous vous recontacterons bientôt avec des nouvelles d’Hydrodomus.',
    'wl.err.submit': 'Une erreur est survenue. Merci de réessayer, ou écrivez-nous directement.',

    'ft.tagline': "Hydrogène résidentiel.",
    'ft.nav':     'Navigation',
    'ft.contact': 'Contact',
    'ft.copy':    '© 2026 Hydrodomus. Tous droits réservés.',
    'ft.frenchtech': 'Membre de',

    /* ── CONTACT PAGE ── */
    'ct.tag':      'Contact',
    'ct.title':    'Contactez-nous',
    'ct.sub':      "Une question, un partenariat, une candidature — écrivez-nous.",
    'ct.name':     'Nom complet',
    'ct.email':    'Email',
    'ct.company':  'Société (optionnel)',
    'ct.subject':  'Objet',
    'ct.msg':      'Message',
    'ct.send':     'Envoyer le message',
    'ct.info':     'Informations',
    'ct.response': 'Réponse sous 48h ouvrées',
    'ct.opt.general':  'Question générale',
    'ct.opt.waitlist': "Liste d'attente",
    'ct.opt.careers':  'Candidature / Recrutement',
    'ct.opt.partner':  'Partenariat',
    'ct.opt.press':    'Presse / Médias',
    'ct.opt.other':    'Autre',
    'ct.hiring.tag':   'Nous recrutons',
    'ct.hiring.text':  "Hydrodomus agrandit son équipe. Si vous souhaitez nous rejoindre, sélectionnez « Candidature / Recrutement » dans le formulaire et présentez-vous — nous n'avons pas de liste de postes fixe pour le moment.",
  },

  en: {
    'nav.home':     'Home',
    'nav.how':      'How it works',
    'nav.waitlist': 'Waiting list',
    'nav.contact':  'Contact',

    'home.headline': 'Refuel your hydrogen car at home',
    'home.subline':  "Let's make hydrogen affordable and clean",

    'chem.s1':    'Untreated water',
    'chem.s2':    'Reverse osmosis filtration',
    'chem.s3':    'Electrolysis',
    'chem.s4':    'O₂ released',
    'chem.s5':    'Drying',
    'chem.s6':    'Final filtration',
    'chem.s7':    'Compression',

    'how.s1': 'Water',
    'how.s2': 'Filtration',
    'how.s3': 'Electrolysis (PEM)',
    'how.s4': 'Filtration and drying',
    'how.s5': 'Low-pressure buffer',
    'how.s6': 'High-pressure buffer',
    'how.s7': 'Final tank',
    'how.s8': 'Dispensing at 700 bar',

    'how.lbl.filter':      'Filter',
    'how.lbl.pem':         'Electrolysis',
    'how.lbl.dryer':       'Filter + dryer',
    'how.lbl.buf1':        'Low-P buffer',
    'how.lbl.compressor':  'Compressor',
    'how.lbl.buf2':        'High-P buffer',
    'how.lbl.pump2':       'HP pump',
    'how.lbl.tank':        'Tank',

    'wl.step':    'Step {n} of {total}',
    'wl.back':    '← Edit',
    'wl.enter':   'Press Enter ↵',

    'wl.q.name':        "What's your name?",
    'wl.ph.name':       'Full name',
    'wl.q.car':         'What do you drive today?',
    'wl.ph.car':        'e.g. Renault Clio, Tesla Model 3…',
    'wl.q.status':      'Do you already drive hydrogen, or would you like to try?',
    'wl.status.opt1':   'I already drive hydrogen',
    'wl.status.opt2':   "I'd like to try",
    'wl.status.opt3':   'Not sure yet',
    'wl.q.interest':    'Which hydrogen vehicle interests you most?',
    'wl.interest.opt1': 'Toyota Mirai',
    'wl.interest.opt2': 'Hyundai Nexo',
    'wl.interest.opt3': 'BMW iX5 Hydrogen',
    'wl.interest.opt4': 'Honda CR-V e:FCEV',
    'wl.interest.opt5': 'Other / not decided yet',
    'wl.q.country':     'What country are you from?',
    'wl.ph.country':    'France, Belgium, Switzerland…',
    'wl.q.email':       'Your email',
    'wl.ph.email':      'you@example.com',
    'wl.err.required':  'This field is required.',
    'wl.err.email':     'Please enter a valid email.',

    'wl.done.title': "Thanks! You're on the list.",
    'wl.done.sub':   "We'll be in touch soon with news from Hydrodomus.",
    'wl.err.submit': 'Something went wrong. Please try again, or write to us directly.',

    'ft.tagline': 'Residential hydrogen.',
    'ft.nav':     'Navigation',
    'ft.contact': 'Contact',
    'ft.copy':    '© 2026 Hydrodomus. All rights reserved.',
    'ft.frenchtech': 'Member of',

    /* ── CONTACT PAGE ── */
    'ct.tag':      'Contact',
    'ct.title':    'Get in touch',
    'ct.sub':      'A question, a partnership, an application — write to us.',
    'ct.name':     'Full name',
    'ct.email':    'Email',
    'ct.company':  'Company (optional)',
    'ct.subject':  'Subject',
    'ct.msg':      'Message',
    'ct.send':     'Send message',
    'ct.info':     'Information',
    'ct.response': 'Response within 48 business hours',
    'ct.opt.general':  'General question',
    'ct.opt.waitlist': 'Waiting list',
    'ct.opt.careers':  'Application / Careers',
    'ct.opt.partner':  'Partnership',
    'ct.opt.press':    'Press / Media',
    'ct.opt.other':    'Other',
    'ct.hiring.tag':   "We're hiring",
    'ct.hiring.text':  'Hydrodomus is growing its team. If you would like to join us, select "Application / Careers" in the form and introduce yourself — we do not have a fixed list of open roles right now.',
  }
};

/* =========================================
   LANGUAGE SYSTEM
   ========================================= */
let lang = localStorage.getItem('hd_lang') || 'fr';

function t(key) {
  return (translations[lang] && translations[lang][key]) ||
         (translations.en[key]) || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

function setLang(l) {
  lang = l;
  localStorage.setItem('hd_lang', l);
  applyTranslations();
}

/* =========================================
   NAVIGATION
   ========================================= */
function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.getElementById('mobile-close');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }
  if (mobileClose && mobileMenu) {
    mobileClose.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-page-link').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
}

/* =========================================
   SCROLL REVEAL
   ========================================= */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal, .reveal-l, .reveal-r');

  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  revealEls.forEach(el => revealObs.observe(el));
}

/* =========================================
   INIT
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  initNav();
  initScrollReveal();

  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
});
