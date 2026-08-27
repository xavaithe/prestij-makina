import { t, getCurrentLang, categoryTranslations, productTranslations, referenceTranslations } from './i18n.js';
import { initFirebase, fetchContentFromFirebase } from './firebase-config.js';

let siteContent = null;

export async function loadSiteContent() {
  if (siteContent) return siteContent;

  try {
    const res = await fetch('/api/content');
    if (res.ok) {
      siteContent = await res.json();
    }
  } catch (err) {
    console.warn('Yerel içerik yüklenemedi:', err);
  }

  // If Firebase is enabled, pull live content from Cloud Firestore
  if (siteContent?.firebase?.enabled && siteContent.firebase.apiKey && siteContent.firebase.projectId) {
    try {
      const fbInit = await initFirebase(siteContent.firebase);
      if (fbInit.success) {
        const fbContent = await fetchContentFromFirebase();
        if (fbContent) {
          console.log('🔥 Site verileri ve tüm görseller Cloud Firestore bulutundan çekildi.');
          siteContent = fbContent;
        }
      }
    } catch (fbErr) {
      console.warn('Firestore canlı veri okuma hatası:', fbErr);
    }
  }

  return siteContent || {};
}

export function getSiteContent() {
  return siteContent;
}

export function applySiteContent(content, lang = getCurrentLang()) {
  const c = content || {};

  document.title = c.site?.title || document.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && c.site?.metaDescription) metaDesc.content = c.site.metaDescription;

  // 1. Top Bar
  setText('[data-content="top-phone"]', c.topBar?.phone || t('topPhoneText', lang));
  setAttr('[data-content="top-phone-link"]', 'href', `tel:${(c.topBar?.phone || '').replace(/\s/g, '')}`);
  setText('[data-content="top-email"]', c.topBar?.email || t('topEmailText', lang));
  setAttr('[data-content="top-email-link"]', 'href', `mailto:${c.topBar?.email || ''}`);
  setText('[data-content="top-location"]', t('topLocationText', lang));
  setText('[data-content="catalog-btn"]', t('catalogBtnText', lang));

  // 2. Brand Header & Navigation
  if (c.brand?.logo) setAttr('[data-content="brand-logo-img"]', 'src', c.brand.logo);
  if (c.brand?.logoWhite) setAttr('[data-content="footer-logo-img"]', 'src', c.brand.logoWhite);

  renderNavigation(c.navigation, lang);

  // 3. Hero Section / Slider
  renderHeroSlider(c, lang);

  // 4. Key Stats Strip
  renderStats(c.stats, lang);

  // 5. Corporate About Us Section
  renderCorporateAbout(c.aboutCorporate, lang);

  // 6. Products Section Headings
  setText('[data-content="products-subtitle"]', t('productsSubtitle', lang));
  setText('[data-content="products-title"]', t('productsTitle', lang));

  // 7. Central Wash Automation Section
  if (c.about?.image) setAttr('[data-content="about-image"]', 'src', c.about.image);
  setText('[data-content="about-subtitle"]', lang === 'tr' && c.about?.subtitle ? c.about.subtitle : t('aboutCentralSubtitle', lang));
  setText('[data-content="about-title"]', lang === 'tr' && c.about?.title ? c.about.title : t('aboutCentralTitle', lang));
  setHtml('[data-content="about-desc"]', formatMarkdown(lang === 'tr' && c.about?.description ? c.about.description : t('aboutCentralDesc', lang)));
  renderCentralWashFeatures(c.about?.features, lang);
  setText('[data-content="about-btn"]', lang === 'tr' && c.about?.buttonText ? c.about.buttonText : t('aboutCentralBtn', lang));

  // 8. References Section
  renderReferences(c.referencesSection, lang);

  // 9. Footer
  setText('[data-content="footer-company"]', c.footer?.companyName || 'PRESTİJ MAKİNA');
  setText('[data-content="footer-desc"]', t('footerDesc', lang));
  setText('[data-content="footer-address"]', c.footer?.address || 'Fevzi Çakmak Mah. Konya OSB, Selçuklu / KONYA');
  setText('[data-content="footer-quick-title"]', t('footerQuickTitle', lang));
  setText('[data-content="footer-products-title"]', t('footerProductsTitle', lang));
  setText('[data-content="footer-contact-title"]', t('footerContactTitle', lang));
  setText('[data-content="footer-weekday"]', t('footerWeekdays', lang));
  setText('[data-content="footer-saturday"]', t('footerSaturday', lang));
  setText('[data-content="footer-phone"]', c.companyInfo?.phone || '+90 332 237 80 00');
  setText('[data-content="footer-email"]', c.companyInfo?.email || 'info@prestijmakina.com.tr');
  setText('[data-content="footer-copyright"]', t('footerCopyright', lang));

  renderFooterMenus(c, lang);

  // 10. Quote Form Modal
  setText('[data-content="quote-title"]', t('quoteTitle', lang));
  setText('[data-content="quote-desc"]', t('quoteDesc', lang));
  setText('[data-content="quote-submit"]', t('quoteSubmit', lang));
  renderQuoteModalLabels(lang);
  renderQuoteOptions(c.quoteForm?.productOptions, lang);

  // 11. AI Chatbot Drawer
  setText('[data-content="ai-title"]', t('aiTitle', lang));
  setText('[data-content="ai-status"]', t('aiStatus', lang));
  setAttr('[data-content="ai-input"]', 'placeholder', t('aiPlaceholder', lang));
  document.querySelectorAll('[data-content="ai-header-btn"]').forEach(el => {
    el.innerHTML = `<i class="fa-solid fa-robot"></i> ${t('aiHeaderBtn', lang)}`;
  });

  // 12. e-Catalog Modal Title/Desc
  setText('[data-content="catalog-modal-title"]', t('catalogModalTitle', lang));
  setText('[data-content="catalog-modal-desc"]', t('catalogModalDesc', lang));
  setText('[data-content="catalog-download-btn"]', t('catalogDownloadBtn', lang));
  setText('[data-content="catalog-close-btn"]', t('catalogCloseBtn', lang));
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach(el => {
    if (value !== undefined) el.textContent = value;
  });
}

function setHtml(selector, value) {
  document.querySelectorAll(selector).forEach(el => {
    if (value !== undefined) el.innerHTML = value;
  });
}

function setAttr(selector, attr, value) {
  document.querySelectorAll(selector).forEach(el => {
    if (value !== undefined) el.setAttribute(attr, value);
  });
}

function formatMarkdown(text) {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function renderNavigation(nav, lang) {
  const navList = document.getElementById('nav-links');
  if (!navList) return;

  const defaultNavLabels = {
    anasayfa: t('navHome', lang),
    hakkimizda: t('navAbout', lang),
    urunler: t('navProducts', lang),
    'merkezi-yikama': t('navCentral', lang),
    referanslar: t('navReferences', lang),
    iletisim: t('navContact', lang)
  };

  const navItems = nav || [
    { id: 'anasayfa', label: t('navHome', lang), href: '#anasayfa' },
    { id: 'hakkimizda', label: t('navAbout', lang), href: '#hakkimizda' },
    { id: 'urunler', label: t('navProducts', lang), href: '#urunler' },
    { id: 'merkezi-yikama', label: t('navCentral', lang), href: '#merkezi-yikama' },
    { id: 'referanslar', label: t('navReferences', lang), href: '#referanslar' },
    { id: 'iletisim', label: t('navContact', lang), href: '#iletisim' }
  ];

  navList.innerHTML = navItems.map((item, i) => {
    const label = defaultNavLabels[item.id] || item.label;
    return `<li><a href="${item.href}" class="${i === 0 ? 'active' : ''}">${label}</a></li>`;
  }).join('');
}

export function renderHeroSlider(c, lang = getCurrentLang()) {
  const sliderContainer = document.getElementById('hero-slider');
  if (!sliderContainer) return;

  const slides = c.slides && c.slides.length > 0 ? c.slides : [
    {
      id: 'slide-1',
      tag: t('heroTag', lang),
      title: t('heroTitle', lang),
      description: t('heroDesc', lang),
      backgroundImage: c.hero?.backgroundImage || 'assets/upload/slider/1778135979_25974634.jpeg',
      primaryButtonText: t('heroBtn1', lang),
      primaryButtonLink: '#urunler',
      secondaryButtonText: t('heroBtn2', lang)
    }
  ];

  let slidesHtml = slides.map((slide, index) => {
    const bg = slide.backgroundImage || 'assets/upload/slider/1778135979_25974634.jpeg';
    const tag = lang === 'tr' ? (slide.tag || t('heroTag', lang)) : t('heroTag', lang);
    const title = lang === 'tr' ? (slide.title || t('heroTitle', lang)) : t('heroTitle', lang);
    const desc = lang === 'tr' ? (slide.description || t('heroDesc', lang)) : t('heroDesc', lang);
    const btn1 = lang === 'tr' ? (slide.primaryButtonText || t('heroBtn1', lang)) : t('heroBtn1', lang);
    const btn2 = lang === 'tr' ? (slide.secondaryButtonText || t('heroBtn2', lang)) : t('heroBtn2', lang);

    return `
      <div class="hero-slide ${index === 0 ? 'active' : ''}" data-slide-index="${index}" style="background-image: linear-gradient(rgba(18,20,29,0.75), rgba(18,20,29,0.6)), url('${bg}');">
        <div class="hero-content">
          <span class="hero-tag">${tag}</span>
          <h1 class="hero-title">${title}</h1>
          <p class="hero-desc">${desc}</p>
          <div class="hero-actions">
            <a href="${slide.primaryButtonLink || '#urunler'}" class="btn-primary">
              <i class="fa-solid fa-boxes-stacked"></i> <span>${btn1}</span>
            </a>
            <button class="btn-outline btn-ai-launch">
              <i class="fa-solid fa-comment-dots"></i> <span>${btn2}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  let controlsHtml = '';
  if (slides.length > 1) {
    controlsHtml = `
      <button class="slider-arrow prev" id="slider-prev"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="slider-arrow next" id="slider-next"><i class="fa-solid fa-chevron-right"></i></button>
      <div class="slider-dots" id="slider-dots">
        ${slides.map((_, idx) => `<span class="dot ${idx === 0 ? 'active' : ''}" data-dot-index="${idx}"></span>`).join('')}
      </div>
    `;
  }

  sliderContainer.innerHTML = slidesHtml + controlsHtml;
}

function renderStats(stats, lang) {
  const strip = document.getElementById('stats-strip');
  if (!strip) return;

  const statsList = (stats && stats.length > 0) ? stats : [
    { number: t('stat1Number', lang), label: t('stat1Label', lang) },
    { number: t('stat2Number', lang), label: t('stat2Label', lang) },
    { number: t('stat3Number', lang), label: t('stat3Label', lang) },
    { number: t('stat4Number', lang), label: t('stat4Label', lang) }
  ];

  strip.innerHTML = statsList.map(s => `
    <div class="stat-item">
      <div class="stat-number">${s.number}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');
}

function renderCorporateAbout(corp, lang) {
  setText('[data-content="about-corp-subtitle"]', lang === 'tr' && corp?.subtitle ? corp.subtitle : t('aboutCorpSubtitle', lang));
  setText('[data-content="about-corp-title"]', lang === 'tr' && corp?.title ? corp.title : t('aboutCorpTitle', lang));
  setHtml('[data-content="about-corp-badge"]', `<i class="fa-solid fa-industry"></i> ${lang === 'tr' && corp?.badgeText ? corp.badgeText : t('aboutCorpBadge', lang)}`);
  setText('[data-content="about-corp-desc"]', lang === 'tr' && corp?.description ? corp.description : t('aboutCorpDesc', lang));
  setHtml('[data-content="about-corp-mission-title"]', `<i class="fa-solid fa-bullseye"></i> ${t('aboutCorpMissionTitle', lang)}`);
  setText('[data-content="about-corp-mission"]', lang === 'tr' && corp?.mission ? corp.mission : t('aboutCorpMission', lang));
  setText('[data-content="about-corp-years"]', t('aboutCorpYears', lang));
  if (corp?.image) setAttr('[data-content="about-corp-image"]', 'src', corp.image);

  const highlightsList = document.getElementById('about-corp-highlights');
  if (highlightsList) {
    const highlights = (lang === 'tr' && corp?.highlights && corp.highlights.length > 0) ? corp.highlights : [
      t('aboutCorpHighlight1', lang),
      t('aboutCorpHighlight2', lang),
      t('aboutCorpHighlight3', lang),
      t('aboutCorpHighlight4', lang),
      t('aboutCorpHighlight5', lang),
      t('aboutCorpHighlight6', lang)
    ];
    highlightsList.innerHTML = highlights.map(h => `<li><i class="fa-solid fa-check-double"></i> ${h}</li>`).join('');
  }
}

function renderCentralWashFeatures(features, lang) {
  const list = document.getElementById('about-features');
  if (!list) return;
  const defaultFeatures = (lang === 'tr' && features && features.length > 0) ? features : [
    t('aboutCentralFeature1', lang),
    t('aboutCentralFeature2', lang),
    t('aboutCentralFeature3', lang),
    t('aboutCentralFeature4', lang)
  ];
  list.innerHTML = defaultFeatures.map(f =>
    `<li><i class="fa-solid fa-circle-check"></i> ${f}</li>`
  ).join('');
}

function renderReferences(ref, lang) {
  setText('[data-content="ref-subtitle"]', lang === 'tr' && ref?.subtitle ? ref.subtitle : t('refSubtitle', lang));
  setText('[data-content="ref-title"]', lang === 'tr' && ref?.title ? ref.title : t('refTitle', lang));
  setText('[data-content="ref-desc"]', lang === 'tr' && ref?.description ? ref.description : t('refDesc', lang));
  setText('[data-content="ref-testimonials-title"]', t('refTestimonialsTitle', lang));

  const brandsContainer = document.getElementById('references-brands');
  if (brandsContainer) {
    const brands = ref?.brands || [
      { name: 'BALLIPINAR PETROL', badge: 'AFYON', desc: 'Merkezi Yıkama & Jetonlu Otomatlar' },
      { name: 'MAVİ BEYAZ AKARYAKIT', badge: 'ANKARA', desc: 'Çoklu Peron Yıkama Sistemi' },
      { name: 'CANER YILMAZ', badge: 'ARTVİN / YUSUFELİ', desc: 'Yıkamatik & Süpürge' },
      { name: 'LENA ENERJİ', badge: 'AYDIN', desc: 'Self Servis Yıkama İstasyonu' },
      { name: 'DAĞKENT PETROL', badge: 'BOLU', desc: 'Kombi Köpük + Yıkama' },
      { name: 'VARLI PETROL', badge: 'BURSA', desc: 'Merkezi Yıkama & Z-Boom' }
    ];

    brandsContainer.innerHTML = brands.map(b => {
      const refTrans = referenceTranslations.brands[b.name]?.[lang];
      const badge = refTrans?.badge || b.badge;
      const desc = refTrans?.desc || b.desc;

      return `
        <div class="brand-card">
          <div class="brand-card-logo"><i class="fa-solid fa-gas-pump"></i> ${b.name}</div>
          <span class="brand-card-badge">${badge}</span>
          <span class="brand-card-desc">${desc}</span>
        </div>
      `;
    }).join('');
  }

  const testimonialsContainer = document.getElementById('references-testimonials');
  if (testimonialsContainer) {
    const defaultTestimonials = (ref?.testimonials && ref.testimonials.length > 0) ? ref.testimonials : referenceTranslations.testimonials.map(item => item[lang] || item.tr);

    testimonialsContainer.innerHTML = defaultTestimonials.map(t => `
      <div class="testimonial-card">
        <div class="rating-stars">★★★★★</div>
        <p class="testimonial-comment">"${t.comment}"</p>
        <div class="testimonial-author">
          <strong>${t.name}</strong>
          <span>${t.company}</span>
        </div>
      </div>
    `).join('');
  }
}

function renderFooterMenus(c, lang) {
  const quickMenu = document.getElementById('footer-quick-menu');
  if (quickMenu) {
    const defaultNavLabels = {
      anasayfa: t('navHome', lang),
      hakkimizda: t('navAbout', lang),
      urunler: t('navProducts', lang),
      'merkezi-yikama': t('navCentral', lang),
      referanslar: t('navReferences', lang),
      iletisim: t('navContact', lang)
    };

    const navItems = c.navigation || [
      { id: 'anasayfa', href: '#anasayfa' },
      { id: 'hakkimizda', href: '#hakkimizda' },
      { id: 'urunler', href: '#urunler' },
      { id: 'referanslar', href: '#referanslar' }
    ];

    quickMenu.innerHTML = navItems.slice(0, 5).map(n => {
      const label = defaultNavLabels[n.id] || n.label;
      return `<li><a href="${n.href}">${label}</a></li>`;
    }).join('');
  }

  const productMenu = document.getElementById('footer-product-menu');
  if (productMenu) {
    const categories = c.productCategories || [];
    productMenu.innerHTML = categories.slice(0, 5).map(cat => {
      const catTrans = categoryTranslations[cat.id]?.[lang] || cat.name;
      return `<li><a href="#urunler">${catTrans}</a></li>`;
    }).join('');
  }
}

function renderQuoteModalLabels(lang) {
  const form = document.getElementById('quote-form');
  if (!form) return;
  const labels = form.querySelectorAll('label');
  if (labels[0]) labels[0].textContent = t('labelFullName', lang);
  if (labels[1]) labels[1].textContent = t('labelPhone', lang);
  if (labels[2]) labels[2].textContent = t('labelProductSelect', lang);
  if (labels[3]) labels[3].textContent = t('labelNotes', lang);

  const inputs = form.querySelectorAll('input, textarea');
  if (inputs[0]) inputs[0].placeholder = t('placeholderFullName', lang);
  if (inputs[1]) inputs[1].placeholder = t('placeholderPhone', lang);
  if (inputs[2]) inputs[2].placeholder = t('placeholderNotes', lang);
}

function renderQuoteOptions(options, lang) {
  const select = document.getElementById('quote-product-select');
  if (!select) return;

  const defaultOptions = [
    categoryTranslations['parali-kopuk-yikama']?.[lang] || "Paralı Köpük + Yıkama Makinesi",
    categoryTranslations['jetonlu-oto-supurge']?.[lang] || "Jetonlu Çift Motorlu Süpürge",
    categoryTranslations['oto-yikama-pervaneleri']?.[lang] || "360° Paslanmaz Z-Boom Pervane",
    categoryTranslations['merkezi-yikama-sistemleri']?.[lang] || "Merkezi Yıkama Otomasyon Projesi (2-12 Peron)",
    categoryTranslations['oto-yikama-makineleri']?.[lang] || "Sıcak-Soğuk Basınçlı Yıkama Makinesi"
  ];

  select.innerHTML = defaultOptions.map(o => `<option>${o}</option>`).join('');
}

export function getProductsDataset() {
  return siteContent?.products || [];
}

export function getProductCategories() {
  return siteContent?.productCategories || [];
}

export function getCompanyInfo() {
  return siteContent?.companyInfo || {};
}

export function getFaqs() {
  return siteContent?.faqs || [];
}

export function getAiChatConfig() {
  return siteContent?.aiChat || {};
}

export function getQuoteFormConfig() {
  return siteContent?.quoteForm || {};
}

export function getCatalogConfig() {
  return siteContent?.catalog || {};
}

export function getSliderSettings() {
  return siteContent?.sliderSettings || { autoPlay: true, interval: 5, effect: 'fade' };
}
