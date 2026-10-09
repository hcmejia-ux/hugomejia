// ===== Hero Bolt Parallax (DISABLED) =====
// The decorative bolt background is turned off for now. Uncomment to
// bring it back — the scroll handler further down already guards its call
// with `if (window._onParallaxScroll)`, so no other changes are needed.
/*
(function () {
  const hero = document.querySelector('.hero');
  const container = document.querySelector('.hero__bolts');
  if (!hero || !container) return;

  const BOLT_PATH    = "M11 2L5 13h5l-2 9 9-12h-5l3-8z";
  const BLUES        = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1e40af'];
  const BOLT_COUNT   = 71;   // number of decorative lightning bolts in the hero
  const BOLT_MIN_SIZE   = 36;   // px — minimum bolt size
  const BOLT_SIZE_RANGE = 80;   // px — random range added to min size (36–116 px)
  const OPACITY_BASE    = 0.08; // minimum bolt opacity (8%)
  const OPACITY_RANGE   = 0.10; // random range added to base opacity (8–18%)
  const PARALLAX_BASE   = 0.20; // slowest layer scroll factor
  const PARALLAX_RANGE  = 0.60; // random range — creates depth spread (0.20–0.80)

  for (let i = 0; i < BOLT_COUNT; i++) {
    const el    = document.createElement('div');
    el.className = 'hero__bolt';

    const size    = BOLT_MIN_SIZE + Math.random() * BOLT_SIZE_RANGE;
    const left    = Math.random() * 100;
    const top     = Math.random() * 100;
    const opacity = (OPACITY_BASE + Math.random() * OPACITY_RANGE).toFixed(3);
    const color   = BLUES[Math.floor(Math.random() * BLUES.length)];
    const factor  = (PARALLAX_BASE + Math.random() * PARALLAX_RANGE).toFixed(3);

    el.style.cssText = `left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;opacity:${opacity};`;
    el.dataset.pf    = factor;
    el.innerHTML     = `<svg width="${size.toFixed(0)}" height="${size.toFixed(0)}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="${BOLT_PATH}"/></svg>`;
    container.appendChild(el);
  }

  const bolts = Array.from(container.querySelectorAll('.hero__bolt'));

  // Registered in the shared scroll handler below
  window._onParallaxScroll = function () {
    const scrolled = window.scrollY;
    bolts.forEach(b => {
      b.style.transform = `translateY(${(scrolled * parseFloat(b.dataset.pf)).toFixed(2)}px)`;
    });
  };
})();
*/


// ===== Shared Utilities =====

/**
 * Memoised CSS variable reader — avoids repeated getComputedStyle calls
 * across the scroll handler and subnav logic.
 */
const _cssVarCache = {};
function getCSSVar(name, fallback) {
  if (_cssVarCache[name] !== undefined) return _cssVarCache[name];
  const val = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  _cssVarCache[name] = isNaN(val) ? fallback : val;
  return _cssVarCache[name];
}

/** Smooth-scroll `el` to just below all sticky navbars. */
function scrollToElement(el, subnav) {
  if (!el) return;
  const navH         = getCSSVar('--nav-h', 64);
  const projectsNavH = getCSSVar('--projects-nav-h', 53);
  const subnavH      = subnav ? subnav.offsetHeight : 0;
  const visualOffset = window.visualViewport ? window.visualViewport.offsetTop : 0;
  const top = el.getBoundingClientRect().top + window.scrollY + visualOffset - navH - projectsNavH - subnavH - 8;
  window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * Wire up scroll-spy, click-scroll, and bottom-of-page fallback for a
 * project subnav.  Called once per project after its HTML is injected.
 *
 * @param {Element} subnav  - The .project__subnav element
 * @param {Element} slot    - The #project-X-slot div that holds the content
 */
function setupSubnav(subnav, slot) {
  const links      = Array.from(subnav.querySelectorAll('.project__subnav-link'));
  const spySections = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);

  // Activate first link by default
  links.forEach((l, i) => l.classList.toggle('active', i === 0));

  // Scroll-spy
  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
  spySections.forEach(s => spyObserver.observe(s));

  // Click-to-scroll (first link → project title; others → their section)
  links.forEach((link, i) => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = i === 0
        ? slot.querySelector('.project__title')
        : document.querySelector(link.getAttribute('href'));
      scrollToElement(target, subnav);
    });
  });

  // Fallback: activate last link when scrolled to bottom of page.
  // Chrome iOS can miss the last section due to dynamic toolbar height changes.
  function checkAtBottom() {
    const projectEl = slot.querySelector('.project');
    if (!projectEl || !projectEl.classList.contains('active')) return;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    if (window.scrollY + vh >= document.documentElement.scrollHeight - 80 && links.length > 0) {
      links.forEach(l => l.classList.remove('active'));
      links[links.length - 1].classList.add('active');
    }
  }

  // Register with the consolidated scroll handler
  if (!window._subnavScrollHandlers) window._subnavScrollHandlers = [];
  window._subnavScrollHandlers.push(checkAtBottom);
}


// ===== Consolidated Scroll Handler =====
// All scroll-driven work (parallax, nav shadow, project-nav fade, subnav
// bottom-fallback) funnels through a single RAF-throttled listener.
const nav = document.getElementById('nav');
const projectsNav = document.getElementById('projectsNav');

let _raf = null;
window.addEventListener('scroll', () => {
  if (_raf) return;
  _raf = requestAnimationFrame(() => {
    _raf = null;

    // Parallax bolts
    if (window._onParallaxScroll) window._onParallaxScroll();

    // Nav shadow on scroll
    nav.classList.toggle('nav--scrolled', window.scrollY > 20);

    // Project-tab carousel fade edges
    if (projectsNav) updateNavFade(projectsNav);

    // Subnav bottom-fallback handlers (registered by setupSubnav)
    if (window._subnavScrollHandlers) {
      window._subnavScrollHandlers.forEach(fn => fn());
    }
  });
}, { passive: true });


// ===== Leadership Disclosure =====
document.querySelectorAll('.leadership__toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const list = toggle.closest('.leadership__col').querySelector('.leadership__list');
    toggle.setAttribute('aria-expanded', 'true');
    list.setAttribute('aria-hidden', 'false');
    list.classList.add('is-open');
  });
});


// ===== Contact Modal =====
const contactLink       = document.getElementById('contactLink');
const contactLinkAbout  = document.getElementById('contactLinkAbout');
const contactModal      = document.getElementById('contactModal');
const contactOverlay    = document.getElementById('contactOverlay');
const contactClose      = document.getElementById('contactClose');
const contactMessage    = document.getElementById('contactMessage');
const charCount         = document.getElementById('charCount');
const contactModalTitle = document.querySelector('.contact-modal__title');
const contactForm       = document.getElementById('contactForm');
const contactSuccess    = document.getElementById('contactSuccess');

function openContactModal(e) {
  e.preventDefault();
  contactForm.style.display = '';
  contactSuccess.classList.remove('visible');
  contactModalTitle.textContent = 'Get in touch';
  contactModal.classList.add('active');
}

contactLink.addEventListener('click', openContactModal);
if (contactLinkAbout) contactLinkAbout.addEventListener('click', openContactModal);

contactOverlay.addEventListener('click', () => contactModal.classList.remove('active'));
contactClose.addEventListener('click',   () => contactModal.classList.remove('active'));

contactMessage.addEventListener('input', () => {
  charCount.textContent = contactMessage.value.length;
});

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  fetch(contactForm.action, {
    method:  'POST',
    body:    new FormData(contactForm),
    headers: { 'Accept': 'application/json' },
  }).then((res) => {
    if (res.ok) {
      contactForm.style.display = 'none';
      contactForm.reset();
      charCount.textContent = '0';
      contactModalTitle.textContent = 'Thanks!';
      setTimeout(() => contactSuccess.classList.add('visible'), 100);
    }
  }).catch((err) => {
    console.error('Form submission error:', err);
    alert('Something went wrong. Please try again or email me directly.');
  });
});


// ===== Back to Top =====
document.getElementById('backToTop').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});


// ===== Theme Toggle (DISABLED) =====
// Dark mode isn't needed for now. Uncomment to bring it back.
/*
const themeToggle = document.getElementById('themeToggle');
const storedTheme = localStorage.getItem('theme');

if (storedTheme) {
  document.documentElement.setAttribute('data-theme', storedTheme);
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next   = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  navToggle.classList.remove('open');
  navLinksEl.classList.remove('open');
});
*/


// ===== Scroll Reveal =====
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


// ===== Active nav link on scroll =====
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.nav__link').forEach(link => {
          link.classList.toggle('active', link.dataset.section === id);
        });
      }
    });
  },
  { rootMargin: '-40% 0px -60% 0px' }
);
document.querySelectorAll('.section, .hero').forEach(s => sectionObserver.observe(s));


// ===== Mobile Menu Toggle =====
const navToggle  = document.getElementById('navToggle');
const navLinksEl = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinksEl.classList.toggle('open');
});

navLinksEl.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinksEl.classList.remove('open');
  });
});

// Mobile sub-nav toggle — attach once per item, guard with innerWidth inside handler
['nav__item--projects', 'nav__item--about'].forEach(cls => {
  const item = document.querySelector('.' + cls);
  if (item) {
    item.querySelector('.nav__link').addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        item.classList.toggle('sub-open');
      }
    });
  }
});


// ===== Project Tab Navigation =====
const projectTabs             = document.querySelectorAll('.projects__tab');
const projectsPanelsContainer = document.querySelector('.projects__panels');
const projectsLock            = document.getElementById('projectsLock');
const lockInner               = document.querySelector('.projects__lock-inner');
const lockIcon                = document.getElementById('lockIcon');

// Password lock temporarily disabled (see "Project Password Lock" section
// below, commented out) — force everything into the "unlocked" state.
// To re-enable: delete this sessionStorage.setItem line and uncomment the
// "Project Password Lock" block further down.
sessionStorage.setItem('projectsUnlocked', 'true');

const PROJECT_IDS = ['project-1', 'project-2', 'project-3'];

// A project is "continued" once its blurb + disclaimer + Continue button
// have been clicked through, once per session.
function isProjectContinued(projectId) {
  return sessionStorage.getItem('continued-' + projectId) === 'true';
}

// Default to project-1 on page load (lock overlay is hidden until a protected tab is clicked)
projectsPanelsContainer.classList.add('visible');
projectsLock.style.display = 'none';
projectsPanelsContainer.addEventListener('animationend', () => {
  projectsPanelsContainer.style.animation = 'none';
}, { once: true });

const defaultTab = document.querySelector('.projects__tab[data-project="project-1"]');
if (defaultTab) defaultTab.classList.add('active');
// Note: project-1's own .active class is applied once its content has
// loaded (content is always fetched asynchronously — see the bottom of
// this file), not here.

// Show the teaser blurb (+ disclaimer + Continue button) instead of the
// real content until this project has been continued past (content itself
// isn't loaded yet either — see loadProjectContent() near the bottom).
const defaultBlurb = document.getElementById('project-1-blurb');
if (!isProjectContinued('project-1')) {
  if (defaultBlurb) defaultBlurb.style.display = '';
}

// Center default tab in carousel on mobile
if (defaultTab) {
  const pNav = defaultTab.closest('.projects__nav');
  if (pNav) {
    requestAnimationFrame(() => {
      pNav.scrollTo({ left: defaultTab.offsetLeft + defaultTab.offsetWidth / 2 - pNav.offsetWidth / 2, behavior: 'instant' });
      updateNavFade(pNav);
    });
  }
}

function updateNavFade(pNav) {
  pNav.classList.toggle('projects__nav--at-start', pNav.scrollLeft <= 8);
  pNav.classList.toggle('projects__nav--at-end', pNav.scrollLeft + pNav.offsetWidth >= pNav.scrollWidth - 8);
}

if (projectsNav) {
  projectsNav.addEventListener('scroll', () => updateNavFade(projectsNav), { passive: true });
}

async function switchProject(projectId, showPasswordForm) {
  projectsPanelsContainer.classList.add('visible');
  document.querySelectorAll('.project').forEach(p => p.classList.remove('active'));
  projectTabs.forEach(t => t.classList.remove('active'));

  const tab        = document.querySelector(`[data-project="${projectId}"]`);
  const isUnlocked = sessionStorage.getItem('projectsUnlocked') === 'true';
  const continued  = isProjectContinued(projectId);

  // Show matching blurb (+ disclaimer + Continue button) only if this
  // project hasn't been continued past yet this session.
  PROJECT_IDS.forEach(id => {
    const blurb = document.getElementById(id + '-blurb');
    if (!blurb) return;
    blurb.style.display = (id === projectId && !continued) ? '' : 'none';
  });

  // If it was continued earlier this session but the content hasn't been
  // fetched yet in this page load, load it now before looking it up below.
  if (continued) await loadProjectContent(projectId);

  const target = document.getElementById(projectId);
  if (target) {
    target.classList.add('active');
    const subnav = target.querySelector('.project__subnav');
    if (subnav) {
      subnav.querySelectorAll('.project__subnav-link').forEach((l, i) => l.classList.toggle('active', i === 0));
    }
    requestAnimationFrame(() => scrollToElement(target.querySelector('.project__title'), subnav));
  }

  if (tab) {
    tab.classList.add('active');
    const pNav = tab.closest('.projects__nav');
    if (pNav) {
      pNav.scrollTo({ left: tab.offsetLeft + tab.offsetWidth / 2 - pNav.offsetWidth / 2, behavior: 'smooth' });
      setTimeout(() => updateNavFade(pNav), 350);
    }
  }

  if (isUnlocked || (tab && !tab.classList.contains('protected'))) {
    projectsLock.style.display = 'none';
  } else {
    projectsLock.style.display = '';
    projectsLock.classList.remove('unlocked');
    if (showPasswordForm) {
      lockIcon.classList.remove('hidden');
      lockInner.style.display = '';
      lockPassword.value = '';
      lockError.classList.remove('visible');
      lockPassword.focus({ preventScroll: true });
    } else {
      lockIcon.classList.remove('hidden');
      lockInner.style.display = 'none';
    }
  }
}

projectTabs.forEach(tab => tab.addEventListener('click', () => switchProject(tab.dataset.project, true)));

// Header sub-nav links also switch project tabs
document.querySelectorAll('.nav__item--projects .nav__sublink').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchProject(link.getAttribute('href').replace('#', ''), true);
    document.getElementById('projects').scrollIntoView({ behavior: 'smooth' });
  });
});

// Each project's blurb ends with a disclaimer + "Continue" button; clicking
// it marks that project as continued and reveals its real content.
document.querySelectorAll('.project__continue').forEach(btn => {
  btn.addEventListener('click', () => {
    sessionStorage.setItem('continued-' + btn.dataset.project, 'true');
    switchProject(btn.dataset.project, true);
  });
});



// ===== Project Password Lock (DISABLED) =====
// The password requirement is turned off for now — see the
// sessionStorage.setItem('projectsUnlocked', 'true') line above.
// Uncomment the block below (and the lockForm listener further down) to
// bring the password lock back.
/*
const lockForm     = document.getElementById('lockForm');
const lockPassword = document.getElementById('lockPassword');
const lockError    = document.getElementById('lockError');
const lockEye      = document.getElementById('lockEye');
const lockEyeIcon  = document.getElementById('lockEyeIcon');

const EYE_OPEN = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const EYE_SHUT = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;

lockEye.addEventListener('click', () => {
  const isPassword = lockPassword.type === 'password';
  lockPassword.type = isPassword ? 'text' : 'password';
  lockEyeIcon.innerHTML = isPassword ? EYE_SHUT : EYE_OPEN;
  lockEye.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

// SHA-256 hashes of valid passwords (no plaintext stored in source)
const validHashes = [
  '05437713140e11df631aeb2ef8d64a9d032cc3e443437fc7c9dbc9bb15335c31',
  'dc5f1e95a338ec691e4e5f801452f143c0b4eb399fab1ff9ff71a031182546cb',
  '17c0e0d89372fbf2c98517768ad583951276b39556f9a83156715c7f8c2778b6',
];

// Map each hash to a visitor label — edit these to match who has each password
const hashVisitorMap = {
  '05437713140e11df631aeb2ef8d64a9d032cc3e443437fc7c9dbc9bb15335c31': 'Testing',
  'dc5f1e95a338ec691e4e5f801452f143c0b4eb399fab1ff9ff71a031182546cb': 'Everyone so far',
  '17c0e0d89372fbf2c98517768ad583951276b39556f9a83156715c7f8c2778b6': 'Special access',
};

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRhgyVJHCFJrWrPiQlroWrFSKdMlLLDHILS6TDwoEFlb-iozIFMZeg9T6iJtIBEBQskQ/exec';

function logUnlock(hash) {
  if (!APPS_SCRIPT_URL) return;
  const activeTab = document.querySelector('.projects__tab.active');
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({
      visitor: hashVisitorMap[hash] || 'Unknown',
      project: activeTab ? activeTab.dataset.project : 'unknown',
      hash,
    }),
  }).catch(() => {});
}

async function hashPassword(password) {
  const encoder    = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
*/

async function loadProjectContent(projectId) {
  const slot = document.getElementById(projectId + '-slot');
  if (!slot || slot.dataset.loaded) return;
  try {
    const res = await fetch('protected/' + projectId + '.html');
    if (res.ok) {
      slot.innerHTML = await res.text();
      slot.dataset.loaded = 'true';
      attachLightbox(slot);

      // Wire up subnav scroll-spy for this project
      const subnav = slot.querySelector('.project__subnav');
      if (subnav) setupSubnav(subnav, slot);

      // Counter animation for project stats
      slot.querySelectorAll('.project__stats').forEach(statsEl => {
        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.querySelectorAll('.stat__number').forEach(el => {
                animateCounter(el, parseFloat(el.dataset.target), (el.dataset.target.split('.')[1] || '').length);
              });
              obs.disconnect();
            }
          });
        }, { threshold: 0.3 });
        observer.observe(statsEl);
      });
    }
  } catch (err) {
    console.error('Failed to load protected content:', err);
  }
}

/*
lockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const inputHash = await hashPassword(lockPassword.value);
  if (validHashes.includes(inputHash)) {
    logUnlock(inputHash);
    projectsLock.classList.add('unlocked');
    sessionStorage.setItem('projectsUnlocked', 'true');
    lockError.classList.remove('visible');
    document.querySelectorAll('.project__blurb').forEach(b => b.style.display = 'none');
    await loadProtectedContent();
    const activeTab = document.querySelector('.projects__tab.active');
    if (activeTab) {
      const target = document.getElementById(activeTab.dataset.project);
      if (target) target.classList.add('active');
    }
    projectsLock.addEventListener('transitionend', () => {
      projectsLock.style.display = 'none';
    }, { once: true });
  } else {
    lockError.classList.add('visible');
    lockPassword.value = '';
    lockPassword.focus();
  }
});
*/

// Load content for any projects already continued past earlier this
// session — otherwise it loads when each project's Continue button is clicked.
PROJECT_IDS.forEach(async (id) => {
  if (!isProjectContinued(id)) return;
  await loadProjectContent(id);
  // Re-apply .active for whichever project is currently the active tab
  // (defaults to project-1), since it wasn't loaded yet when the initial
  // "Default to project-1" setup ran further up this file.
  const activeTab = document.querySelector('.projects__tab.active');
  if (activeTab && activeTab.dataset.project === id) {
    document.getElementById(id).classList.add('active');
  }
});


// ===== Number Counter Animation =====
// Uses requestAnimationFrame for smooth, display-rate-aware animation
// instead of setTimeout-based polling.
function animateCounter(el, target, decimals) {
  const duration = 1200; // ms
  const suffix   = el.dataset.suffix !== undefined ? el.dataset.suffix : '+';
  const prefix   = el.dataset.prefix || '';
  const startTime = performance.now();

  function formatValue(value) {
    return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  }

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - (1 - progress) * (1 - progress); // ease-out quad
    el.textContent = prefix + formatValue(eased * target);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = prefix + formatValue(target) + suffix;
    }
  }

  requestAnimationFrame(tick);
}

// Trigger counter animation when the about stats section scrolls into view
const aboutStats = document.querySelector('.about__stats');
if (aboutStats) {
  const statsObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.stat__number').forEach(el => {
          animateCounter(el, parseFloat(el.dataset.target), (el.dataset.target.split('.')[1] || '').length);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });
  statsObserver.observe(aboutStats);
}


// ===== Image Lightbox =====
const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxClose   = document.getElementById('lightboxClose');
const lightboxPrev    = document.getElementById('lightboxPrev');
const lightboxNext    = document.getElementById('lightboxNext');
const lightboxCaption = document.getElementById('lightboxCaption');

let lbImages = [];
let lbIndex  = 0;

function getCaption(img) {
  return img.closest('figure')?.querySelector('figcaption')?.textContent || '';
}

function openLightbox(img, images) {
  lbImages = images;
  lbIndex  = images.indexOf(img);
  lightboxImg.src             = img.src;
  lightboxImg.alt             = img.alt;
  lightboxCaption.textContent = getCaption(img);
  const multi = images.length > 1;
  lightboxPrev.hidden = !multi;
  lightboxNext.hidden = !multi;
  lightbox.classList.add('active');
}

function showLightboxAt(index) {
  lbIndex = (index + lbImages.length) % lbImages.length;
  lightboxImg.src             = lbImages[lbIndex].src;
  lightboxImg.alt             = lbImages[lbIndex].alt;
  lightboxCaption.textContent = getCaption(lbImages[lbIndex]);
}

function attachLightbox(container) {
  const images = Array.from(container.querySelectorAll('.project img:not(.no-zoom)'));
  images.forEach(img => img.addEventListener('click', () => openLightbox(img, images)));
}

lightboxClose.addEventListener('click', () => lightbox.classList.remove('active'));
lightbox.addEventListener('click',      e => { if (e.target === lightbox) lightbox.classList.remove('active'); });
lightboxPrev.addEventListener('click',  e => { e.stopPropagation(); showLightboxAt(lbIndex - 1); });
lightboxNext.addEventListener('click',  e => { e.stopPropagation(); showLightboxAt(lbIndex + 1); });

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape')     lightbox.classList.remove('active');
  if (e.key === 'ArrowLeft')  showLightboxAt(lbIndex - 1);
  if (e.key === 'ArrowRight') showLightboxAt(lbIndex + 1);
});
