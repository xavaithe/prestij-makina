import { PrestijAIEngine } from '../js/ai-engine.js';
import { initFirebase, syncContentToFirebase, fetchContentFromFirebase } from '../js/firebase-config.js';

let content = {};
let currentSection = 'site';
let authToken = localStorage.getItem('prestij_admin_token');

const SECTION_TITLES = {
  site: 'Genel Site Ayarları',
  topBar: 'Üst Bar & İletişim',
  brand: 'Marka & Navigasyon',
  hero: 'Hero Banner & Hareketli Slider Yönetimi',
  catalog: '📄 e-Katalog PDF Yönetimi',
  stats: 'Sayısal İstatistikler',
  aboutCorporate: 'Hakkımızda (Kurumsal & Fabrika)',
  productsSection: 'Ürünler Bölüm Başlıkları',
  productCategories: 'Ürün Kategorileri',
  products: 'Ürün Kataloğu',
  about: 'Merkezi Yıkama Sistemleri',
  referencesSection: 'Referanslarımız (Petrol İstasyonları)',
  footer: 'Footer İçeriği',
  companyInfo: 'Şirket Künyesi & Garanti',
  quoteForm: 'Fiyat Teklifi Formu',
  aiChat: 'AI Asistan Widget Ayarları',
  faqs: '🤖 AI Bot Soru & Cevap Veri Seti (Q&A Manager)',
  firebase: '🔥 Firebase & Firestore Bağlantı'
};

const loginScreen = document.getElementById('login-screen');
const adminLayout = document.getElementById('admin-layout');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const adminContent = document.getElementById('admin-content');
const sectionTitle = document.getElementById('section-title');
const saveStatus = document.getElementById('save-status');
const toast = document.getElementById('toast');

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Bir hata oluştu.');
  return data;
}

async function checkAuth() {
  if (!authToken) return false;
  try {
    await apiFetch('/api/admin/verify');
    return true;
  } catch {
    localStorage.removeItem('prestij_admin_token');
    authToken = null;
    return false;
  }
}

function showAdmin() {
  loginScreen.style.display = 'none';
  adminLayout.style.display = 'flex';
}

function showLogin() {
  loginScreen.style.display = 'flex';
  adminLayout.style.display = 'none';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  try {
    const data = await apiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('login-username').value,
        password: document.getElementById('login-password').value
      })
    });
    authToken = data.token;
    localStorage.setItem('prestij_admin_token', authToken);
    showAdmin();
    await loadContent();
    renderSection(currentSection);
  } catch (err) {
    loginError.textContent = err.message;
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  try { await apiFetch('/api/admin/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem('prestij_admin_token');
  authToken = null;
  showLogin();
});

async function loadContent() {
  content = await apiFetch('/api/content');
  updateMetricsDisplay();
  if (content.firebase && content.firebase.enabled) {
    initFirebase(content.firebase).then(res => {
      updateFirebaseBadge(res.success);
    });
  }
}

function updateMetricsDisplay() {
  document.getElementById('dash-prod-count').textContent = content.products ? content.products.length : 0;
  document.getElementById('dash-faq-count').textContent = content.faqs ? content.faqs.length : 0;
  document.getElementById('dash-ref-count').textContent = content.referencesSection?.brands ? content.referencesSection.brands.length : 0;
  updateFirebaseBadge(content.firebase?.enabled);
}

function updateFirebaseBadge(active) {
  const statusEl = document.getElementById('dash-fb-status');
  const topBadge = document.getElementById('fb-topbar-status');
  if (active) {
    statusEl.textContent = 'Aktif 🔥';
    topBadge.className = 'fb-badge-status';
    topBadge.style.background = '#E8F5E9';
    topBadge.style.color = '#2E7D32';
    topBadge.innerHTML = '<i class="fa-solid fa-circle"></i> Firebase/Firestore Canlı Senkron';
  } else {
    statusEl.textContent = 'Yerel Mod';
    topBadge.className = 'fb-badge-status';
    topBadge.style.background = '#FFF3E0';
    topBadge.style.color = '#E65100';
    topBadge.innerHTML = '<i class="fa-solid fa-circle"></i> Yerel Express Modu';
  }
}

function field(label, id, value = '', type = 'text', hint = '') {
  const val = value ?? '';
  if (type === 'textarea') {
    return `<div class="form-group">
      <label for="${id}">${label}</label>
      <textarea id="${id}" class="form-control" rows="3">${escapeHtml(String(val))}</textarea>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
  }
  return `<div class="form-group">
    <label for="${id}">${label}</label>
    <input type="${type}" id="${id}" class="form-control" value="${escapeAttr(String(val))}">
    ${hint ? `<p class="form-hint">${hint}</p>` : ''}
  </div>`;
}

function imageField(label, id, value = '') {
  const val = value ?? '';
  return `<div class="form-group">
    <label for="${id}">${label}</label>
    <div style="display: flex; gap: 10px; align-items: center;">
      <input type="text" id="${id}" class="form-control" value="${escapeAttr(String(val))}" placeholder="Örn: assets/images/hero_banner.png veya Base64">
      <label class="btn-primary" style="padding: 10px 14px; font-size: 0.85rem; cursor: pointer; white-space: nowrap;">
        <i class="fa-solid fa-upload"></i> Dosya Seç
        <input type="file" class="img-file-uploader" data-target-id="${id}" accept="image/*" style="display: none;">
      </label>
    </div>
    ${val ? `<div style="margin-top: 8px;"><img src="${escapeAttr(String(val))}" style="max-height: 80px; border-radius: 8px; border: 1px solid #ccc;"></div>` : ''}
  </div>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escapeAttr(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function renderSection(section) {
  currentSection = section;
  sectionTitle.textContent = SECTION_TITLES[section] || section;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  const renderers = {
    site: renderSite,
    topBar: renderTopBar,
    brand: renderBrand,
    hero: renderHero,
    catalog: renderCatalog,
    stats: renderStats,
    aboutCorporate: renderAboutCorporate,
    productsSection: renderProductsSection,
    productCategories: renderCategories,
    products: renderProducts,
    about: renderAbout,
    referencesSection: renderReferencesSection,
    footer: renderFooter,
    companyInfo: renderCompanyInfo,
    quoteForm: renderQuoteForm,
    aiChat: renderAiChat,
    faqs: renderFaqs,
    firebase: renderFirebase
  };

  adminContent.innerHTML = renderers[section]?.() || '<p>Bölüm bulunamadı.</p>';
  attachSectionListeners(section);
  updateMetricsDisplay();
}

function renderSite() {
  const s = content.site || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-globe"></i> Genel Site Bilgileri</h3>
    ${field('Sayfa Başlığı (Title)', 'site-title', s.title)}
    ${field('Meta Açıklama', 'site-meta', s.metaDescription, 'textarea')}
  </div>`;
}

function renderTopBar() {
  const t = content.topBar || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-bars"></i> Üst Bar İletişim</h3>
    ${field('Telefon', 'top-phone', t.phone)}
    ${field('E-Posta', 'top-email', t.email, 'email')}
    ${field('Konum', 'top-location', t.location)}
    ${field('Katalog Buton Metni', 'top-catalog', t.catalogButtonText)}
  </div>`;
}

function renderBrand() {
  const b = content.brand || {};
  const nav = content.navigation || [];
  let navHtml = nav.map((item, i) => `
    <div class="list-item" data-nav-index="${i}">
      <div class="list-item-header">
        <h4>Menü Öğesi #${i + 1}</h4>
        <button class="btn-delete" data-delete-nav="${i}"><i class="fa-solid fa-trash"></i> Sil</button>
      </div>
      <div class="form-row">
        ${field('Menü Metni', `nav-label-${i}`, item.label)}
        ${field('Link (#anchor)', `nav-href-${i}`, item.href)}
      </div>
    </div>
  `).join('');

  return `<div class="form-card">
    <h3><i class="fa-solid fa-building"></i> Logo & Marka</h3>
    ${field('Logo Harfi', 'brand-badge', b.badge)}
    ${field('Marka Adı', 'brand-title', b.title)}
    ${field('Alt Başlık', 'brand-subtitle', b.subtitle)}
  </div>
  <div class="form-card">
    <h3><i class="fa-solid fa-route"></i> Navigasyon Menüsü</h3>
    ${navHtml}
    <button class="btn-add" id="btn-add-nav"><i class="fa-solid fa-plus"></i> Yeni Menü Öğesi Ekle</button>
  </div>`;
}

function renderHero() {
  const h = content.hero || {};
  const settings = content.sliderSettings || { autoPlay: true, interval: 5, effect: 'fade' };
  const slides = content.slides || [
    {
      id: 'slide-1',
      tag: h.tag || "2003'ten Beri Güven ve Kalite",
      title: h.title || "Endüstriyel Yıkama & <span>Self-Servis</span> Otomat Sistemleri",
      description: h.description || "Akaryakıt istasyonları için oto yıkama makineleri üretimi.",
      backgroundImage: h.backgroundImage || 'assets/images/hero_banner.png',
      primaryButtonText: h.primaryButtonText || 'Ürünlerimizi İnceleyin',
      primaryButtonLink: h.primaryButtonLink || '#urunler',
      secondaryButtonText: h.secondaryButtonText || 'AI Asistana Soru Sor'
    }
  ];

  let slidesHtml = slides.map((slide, i) => `
    <div class="form-card list-item" data-slide-index="${i}">
      <div class="list-item-header">
        <h4><i class="fa-solid fa-image"></i> Slayt #${i + 1}</h4>
        <button class="btn-delete" data-delete-slide="${i}"><i class="fa-solid fa-trash"></i> Sil</button>
      </div>
      ${field('Etiket Metni', `slide-tag-${i}`, slide.tag)}
      ${field('Başlık (HTML <span> Vurgulu)', `slide-title-${i}`, slide.title, 'textarea')}
      ${field('Açıklama', `slide-desc-${i}`, slide.description, 'textarea')}
      ${imageField('Arka Plan Görseli', `slide-bg-${i}`, slide.backgroundImage)}
      <div class="form-row">
        ${field('Birincil Buton Metni', `slide-btn1-${i}`, slide.primaryButtonText)}
        ${field('Birincil Buton Linki', `slide-btn1-link-${i}`, slide.primaryButtonLink)}
      </div>
      ${field('İkincil Buton Metni', `slide-btn2-${i}`, slide.secondaryButtonText)}
    </div>
  `).join('');

  return `<div class="form-card">
    <h3><i class="fa-solid fa-sliders"></i> Hareketli Banner / Slider Ayarları</h3>
    <div class="form-row">
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 10px;">
          <input type="checkbox" id="slider-autoplay" ${settings.autoPlay !== false ? 'checked' : ''}>
          <strong>Slider Otomatik Kaymayı Aktifleştir</strong>
        </label>
      </div>
      ${field('Geçiş Süresi (Saniye)', 'slider-interval', settings.interval || 5, 'number')}
    </div>
  </div>
  <h3>Slayt Listesi</h3>
  ${slidesHtml}
  <button class="btn-add" id="btn-add-slide"><i class="fa-solid fa-plus"></i> Yeni Slayt Ekle</button>`;
}

function renderCatalog() {
  const cat = content.catalog || { title: 'Prestij Makina 2026 e-Katalog', description: 'Ürün kataloğumuzu online inceleyin.', pdfUrl: 'assets/catalog.pdf' };
  return `<div class="form-card">
    <h3><i class="fa-solid fa-file-pdf"></i> e-Katalog PDF Dosyası & Önizleme Yönetimi</h3>
    <p class="form-hint" style="margin-bottom: 20px;">
      Buradan yükleyeceğiniz PDF dosyası, web sitesindeki "e-Katalog İndir/İncele" butonuna tıklayan tüm ziyaretçilere açılan PDF penceresinde gösterilecektir.
    </p>
    ${field('Katalog Başlığı', 'cat-modal-title', cat.title)}
    ${field('Katalog Açıklaması', 'cat-modal-desc', cat.description, 'textarea')}
    
    <div class="form-group">
      <label for="cat-pdf-url">PDF Dosyası (URL veya Yükleme)</label>
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" id="cat-pdf-url" class="form-control" value="${escapeAttr(cat.pdfUrl || '')}" placeholder="Örn: assets/catalog.pdf">
        <label class="btn-primary" style="padding: 10px 14px; font-size: 0.85rem; cursor: pointer; white-space: nowrap;">
          <i class="fa-solid fa-file-upload"></i> PDF Seç & Yükle
          <input type="file" id="pdf-file-uploader" accept="application/pdf" style="display: none;">
        </label>
      </div>
    </div>
  </div>`;
}

function renderStats() {
  const stats = content.stats || [];
  return `<div class="form-card">
    <h3><i class="fa-solid fa-chart-simple"></i> Sayısal İstatistik Şeridi</h3>
    ${stats.map((s, i) => `
      <div class="list-item">
        <div class="form-row">
          ${field('Sayı', `stat-num-${i}`, s.number)}
          ${field('Etiket', `stat-label-${i}`, s.label)}
        </div>
      </div>
    `).join('')}
    <button class="btn-add" id="btn-add-stat"><i class="fa-solid fa-plus"></i> İstatistik Ekle</button>
  </div>`;
}

function renderAboutCorporate() {
  const ac = content.aboutCorporate || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-industry"></i> Kurumsal Hakkımızda & Fabrika Bilgileri</h3>
    ${field('Bölüm Alt Başlığı', 'corp-subtitle', ac.subtitle)}
    ${field('Bölüm Ana Başlığı', 'corp-title', ac.title)}
    ${field('Rozet Metni', 'corp-badge', ac.badgeText)}
    ${imageField('Fabrika Görseli', 'corp-image', ac.image)}
    ${field('Kurumsal Detaylı Açıklama', 'corp-desc', ac.description, 'textarea')}
    ${field('Şirket Misyonu', 'corp-mission', ac.mission, 'textarea')}
    ${field('Öne Çıkanlar (her satıra bir özellik)', 'corp-highlights', (ac.highlights || []).join('\n'), 'textarea')}
  </div>`;
}

function renderProductsSection() {
  const p = content.productsSection || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-layer-group"></i> Ürünler Bölüm Başlıkları</h3>
    ${field('Alt Başlık', 'prod-subtitle', p.subtitle)}
    ${field('Ana Başlık', 'prod-title', p.title)}
  </div>`;
}

function renderCategories() {
  const cats = content.productCategories || [];
  return cats.map((cat, i) => `
    <div class="form-card list-item" data-cat-index="${i}">
      <div class="list-item-header">
        <h4>Kategori #${i + 1} (${escapeHtml(cat.name)})</h4>
        <button class="btn-delete" data-delete-cat="${i}"><i class="fa-solid fa-trash"></i> Sil</button>
      </div>
      ${field('Kategori ID (benzersiz)', `cat-id-${i}`, cat.id)}
      ${field('Kategori Adı', `cat-name-${i}`, cat.name)}
      ${field('Açıklama', `cat-desc-${i}`, cat.desc, 'textarea')}
    </div>
  `).join('') + `<button class="btn-add" id="btn-add-cat"><i class="fa-solid fa-plus"></i> Kategori Ekle</button>`;
}

function renderProducts() {
  const prods = content.products || [];
  const cats = content.productCategories || [];
  const catOptions = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  return prods.map((p, i) => `
    <div class="form-card list-item" data-prod-index="${i}">
      <div class="list-item-header">
        <h4><i class="fa-solid fa-cube"></i> ${escapeHtml(p.name)}</h4>
        <button class="btn-delete" data-delete-prod="${i}"><i class="fa-solid fa-trash"></i> Sil</button>
      </div>
      ${field('Ürün ID', `prod-id-${i}`, p.id)}
      ${field('Ürün Adı', `prod-name-${i}`, p.name)}
      <div class="form-group">
        <label for="prod-cat-${i}">Kategori</label>
        <select id="prod-cat-${i}" class="form-control">
          ${catOptions.replace(`value="${p.category}"`, `value="${p.category}" selected`)}
        </select>
      </div>
      ${field('Kısa Açıklama', `prod-desc-${i}`, p.desc, 'textarea')}
      ${imageField('Ürün Görseli', `prod-image-${i}`, p.image || '')}
      <div class="form-row">
        ${field('Basınç / Özellik Etiketi', `prod-pressure-${i}`, p.pressure || '')}
        ${field('Motor / Güç', `prod-motor-${i}`, p.motor || '')}
      </div>
      ${field('Kullanım Alanı', `prod-usage-${i}`, p.usageArea || '')}
      ${field('Fiyat Metni', `prod-price-${i}`, p.price || '')}
      ${field('Özellikler (her satıra bir özellik)', `prod-features-${i}`, (p.features || []).join('\n'), 'textarea')}
    </div>
  `).join('') + `<button class="btn-add" id="btn-add-prod"><i class="fa-solid fa-plus"></i> Yeni Ürün Ekle</button>`;
}

function renderAbout() {
  const a = content.about || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-gears"></i> Merkezi Yıkama Sistemleri Bölümü</h3>
    ${imageField('Bölüm Görseli', 'about-image', a.image)}
    ${field('Görsel Alt Metni', 'about-alt', a.imageAlt)}
    ${field('Alt Başlık', 'about-subtitle', a.subtitle)}
    ${field('Başlık', 'about-title', a.title)}
    ${field('Açıklama (**kalın** destekler)', 'about-desc', a.description, 'textarea')}
    ${field('Özellikler (her satıra bir madde)', 'about-features', (a.features || []).join('\n'), 'textarea')}
    ${field('Buton Metni', 'about-btn', a.buttonText)}
  </div>`;
}

function renderReferencesSection() {
  const r = content.referencesSection || {};
  const brands = r.brands || [];
  const testimonials = r.testimonials || [];

  const brandsHtml = brands.map((b, i) => `
    <div class="list-item" data-ref-brand="${i}">
      <div class="list-item-header">
        <h4>Referans Marka #${i + 1} (${escapeHtml(b.name)})</h4>
        <button class="btn-delete" data-delete-brand="${i}"><i class="fa-solid fa-trash"></i> Sil</button>
      </div>
      <div class="form-row">
        ${field('Marka Adı', `ref-bname-${i}`, b.name)}
        ${field('Rozet', `ref-bbadge-${i}`, b.badge)}
      </div>
      ${field('Açıklama / İletişim / Sayı', `ref-bdesc-${i}`, b.desc)}
    </div>
  `).join('');

  const testimonialsHtml = testimonials.map((t, i) => `
    <div class="list-item" data-ref-test="${i}">
      <div class="list-item-header">
        <h4>Müşteri Yorumu #${i + 1}</h4>
        <button class="btn-delete" data-delete-test="${i}"><i class="fa-solid fa-trash"></i> Sil</button>
      </div>
      <div class="form-row">
        ${field('Kişi / İsim', `ref-tname-${i}`, t.name)}
        ${field('Firma / İstasyon', `ref-tcomp-${i}`, t.company)}
      </div>
      ${field('Yorum Metni', `ref-tcomm-${i}`, t.comment, 'textarea')}
      ${field('Puan (1-5)', `ref-trating-${i}`, t.rating || 5, 'number')}
    </div>
  `).join('');

  return `<div class="form-card">
    <h3><i class="fa-solid fa-gas-pump"></i> Referanslar Bölüm Başlıkları</h3>
    ${field('Alt Başlık', 'ref-subtitle', r.subtitle)}
    ${field('Ana Başlık', 'ref-title', r.title)}
    ${field('Açıklama', 'ref-desc', r.description, 'textarea')}
  </div>
  <div class="form-card">
    <h3><i class="fa-solid fa-handshake"></i> Akaryakıt İstasyon / Bayi Logoları</h3>
    ${brandsHtml}
    <button class="btn-add" id="btn-add-ref-brand"><i class="fa-solid fa-plus"></i> Referans Marka Ekle</button>
  </div>
  <div class="form-card">
    <h3><i class="fa-solid fa-comments"></i> İstasyon İşletmeci Yorumları</h3>
    ${testimonialsHtml}
    <button class="btn-add" id="btn-add-ref-test"><i class="fa-solid fa-plus"></i> Müşteri Yorumu Ekle</button>
  </div>`;
}

function renderFooter() {
  const f = content.footer || {};
  const ci = content.companyInfo || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-shoe-prints"></i> Footer İçeriği</h3>
    ${field('Şirket Adı', 'footer-company', f.companyName)}
    ${field('Açıklama', 'footer-desc', f.description, 'textarea')}
    ${field('Adres', 'footer-address', f.address)}
    ${field('Hafta İçi Saatler', 'footer-weekday', f.weekdayHours)}
    ${field('Cumartesi Saatler', 'footer-saturday', f.saturdayHours)}
    ${field('Telefon (footer)', 'footer-phone', ci.phone)}
    ${field('E-Posta (footer)', 'footer-email', ci.email)}
    ${field('Telif Metni', 'footer-copyright', f.copyright, 'textarea')}
  </div>`;
}

function renderCompanyInfo() {
  const c = content.companyInfo || {};
  const wh = c.workingHours || {};
  const st = c.stats || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-address-card"></i> Şirket & İletişim Bilgileri (AI Asistan dahil)</h3>
    ${field('Şirket Tam Adı', 'ci-name', c.name)}
    ${field('Kuruluş Yılı', 'ci-founded', c.foundedYear, 'number')}
    ${field('Adres', 'ci-location', c.location, 'textarea')}
    ${field('Telefon', 'ci-phone', c.phone)}
    ${field('WhatsApp', 'ci-whatsapp', c.whatsapp)}
    ${field('E-Posta', 'ci-email', c.email, 'email')}
    ${field('Web Sitesi', 'ci-website', c.website)}
    ${field('Hafta İçi', 'ci-wh-weekdays', wh.weekdays)}
    ${field('Cumartesi', 'ci-wh-saturday', wh.saturday)}
    ${field('Pazar', 'ci-wh-sunday', wh.sunday)}
    ${field('Garanti Metni', 'ci-warranty', c.warranty, 'textarea')}
    ${field('Teslimat Metni', 'ci-delivery', c.delivery, 'textarea')}
  </div>
  <div class="form-card">
    <h3>İstatistikler (AI & Site)</h3>
    <div class="form-row">
      ${field('Petrol İstasyonu', 'ci-stat-petrol', st.petrolStations)}
      ${field('Ürün Sayısı', 'ci-stat-products', st.productsCount)}
    </div>
    <div class="form-row">
      ${field('Memnun Müşteri', 'ci-stat-customers', st.happyCustomers)}
      ${field('İhracat Ülkesi', 'ci-stat-export', st.exportCountries)}
    </div>
  </div>`;
}

function renderQuoteForm() {
  const q = content.quoteForm || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-file-invoice"></i> Fiyat Teklifi Formu Ayarları</h3>
    ${field('Form Başlığı', 'quote-title', q.title)}
    ${field('Form Açıklaması', 'quote-desc', q.description, 'textarea')}
    ${field('Ürün Seçenekleri (her satıra bir seçenek)', 'quote-options', (q.productOptions || []).join('\n'), 'textarea')}
    ${field('Gönder Buton Metni', 'quote-submit', q.submitButtonText)}
    ${field('Başarı Mesajı', 'quote-success', q.successMessage, 'textarea')}
  </div>`;
}

function renderAiChat() {
  const a = content.aiChat || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-robot"></i> AI Asistan Widget Görünüm Ayarları</h3>
    ${field('Widget Başlığı', 'ai-title', a.widgetTitle)}
    ${field('Durum Metni', 'ai-status', a.widgetStatus)}
    ${field('Giriş Placeholder', 'ai-placeholder', a.inputPlaceholder)}
    ${field('Header Buton Metni', 'ai-header-btn', a.headerButtonText)}
    ${field('Karşılama Mesajı (**kalın** destekler)', 'ai-welcome', a.welcomeMessage, 'textarea')}
    ${field('Karşılama Hızlı Yanıtlar (her satıra bir)', 'ai-welcome-replies', (a.welcomeQuickReplies || []).join('\n'), 'textarea')}
    ${field('Temizleme Mesajı', 'ai-clear-msg', a.clearMessage)}
    ${field('Temizleme Hızlı Yanıtlar (her satıra bir)', 'ai-clear-replies', (a.clearQuickReplies || []).join('\n'), 'textarea')}
  </div>`;
}

function renderFaqs() {
  const faqs = content.faqs || [];
  const faqsHtml = faqs.map((faq, i) => `
    <div class="form-card list-item" data-faq-index="${i}">
      <div class="list-item-header">
        <h4><i class="fa-solid fa-lightbulb"></i> AI Soru-Cevap Kuralı #${i + 1}</h4>
        <button class="btn-delete" data-delete-faq="${i}"><i class="fa-solid fa-trash"></i> Sil</button>
      </div>
      ${field('Örnek Soru', `faq-q-${i}`, faq.question)}
      ${field('Detaylı Cevap (**kalın** destekler)', `faq-a-${i}`, faq.answer, 'textarea')}
      ${field('Tetikleyici Anahtar Kelimeler (virgülle ayırın)', `faq-kw-${i}`, (faq.keywords || []).join(', '))}
      ${field('Hızlı Yanıt Butonları (virgülle ayırın)', `faq-qr-${i}`, (faq.quickReplies || []).join(', '))}
    </div>
  `).join('');

  return `<div class="form-card">
    <h3><i class="fa-solid fa-brain"></i> AI Asistan Soru & Cevap Veri Seti Yönetimi</h3>
    <p class="form-hint" style="margin-bottom: 20px;">
      Buradan ekleyeceğiniz veya düzenleyeceğiniz sorular, AI Asistanın doğal dil arama motoru tarafından anında öğrenilir.
    </p>
    ${faqsHtml}
    <button class="btn-add" id="btn-add-faq"><i class="fa-solid fa-plus"></i> Yeni AI Soru-Cevap Kuralı Ekle</button>
  </div>

  <!-- Canlı AI Bot Simülatörü -->
  <div class="ai-simulator-box">
    <div class="sim-header">
      <h4><i class="fa-solid fa-vial-circle-check"></i> Canlı AI Asistan Test Simülatörü</h4>
      <span class="sim-badge">Test Modu</span>
    </div>
    <div class="sim-body" id="sim-body">
      <div class="sim-bubble bot">
        Merhaba! AI Veri Setini yukarıda düzenleyebilirsiniz. Aşağıdaki alana soru yazıp yanıtı anında test edin! 🤖
      </div>
    </div>
    <div class="sim-footer">
      <input type="text" id="sim-input" placeholder="Test sorusu yazın (örn: Garanti süresi ne kadar?)..." autocomplete="off">
      <button id="sim-send-btn"><i class="fa-solid fa-paper-plane"></i> Test Et</button>
    </div>
  </div>`;
}

function renderFirebase() {
  const fb = content.firebase || {};
  return `<div class="form-card">
    <h3><i class="fa-solid fa-fire"></i> Firebase Realtime Database & Cloud Firestore Yapılandırması</h3>
    <p class="form-hint" style="margin-bottom: 20px;">
      Firebase ve Cloud Firestore entegrasyonu sayesinde sitenizin tüm içeriğini doğrudan Firebase / Firestore bulutuna senkronize edebilir, canlıda anlık güncelleme yapabilirsiniz.
    </p>
    <div class="form-group">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" id="fb-enabled" ${fb.enabled ? 'checked' : ''}>
        <strong>Firebase / Firestore Entegrasyonunu Aktifleştir</strong>
      </label>
    </div>
    <div class="form-row">
      ${field('API Key (apiKey)', 'fb-apikey', fb.apiKey)}
      ${field('Auth Domain (authDomain)', 'fb-authdomain', fb.authDomain)}
    </div>
    <div class="form-row">
      ${field('Database URL (databaseURL)', 'fb-dburl', fb.databaseURL)}
      ${field('Project ID (projectId)', 'fb-projectid', fb.projectId)}
    </div>
    <div class="form-row">
      ${field('Storage Bucket', 'fb-storage', fb.storageBucket)}
      ${field('App ID', 'fb-appid', fb.appId)}
    </div>

    <div style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;">
      <button type="button" class="btn-primary" id="btn-test-fb" style="background: #E65100;">
        <i class="fa-solid fa-plug"></i> Bağlantıyı Test Et
      </button>
      <button type="button" class="btn-save-all" id="btn-sync-to-fb">
        <i class="fa-solid fa-cloud-arrow-up"></i> Firestore / Firebase'e Yükle
      </button>
      <button type="button" class="btn-save-all" id="btn-fetch-from-fb" style="background: #1976D2;">
        <i class="fa-solid fa-cloud-arrow-down"></i> Firestore / Firebase'den Çek
      </button>
    </div>
  </div>`;
}

function collectSectionData(section) {
  switch (section) {
    case 'site':
      return {
        title: getVal('site-title'),
        metaDescription: getVal('site-meta')
      };
    case 'topBar':
      return {
        phone: getVal('top-phone'),
        email: getVal('top-email'),
        location: getVal('top-location'),
        catalogButtonText: getVal('top-catalog')
      };
    case 'brand': {
      const navItems = document.querySelectorAll('[data-nav-index]');
      const navigation = Array.from(navItems).map((_, i) => ({
        id: getVal(`nav-href-${i}`).replace('#', '') || `menu-${i}`,
        label: getVal(`nav-label-${i}`),
        href: getVal(`nav-href-${i}`)
      }));
      return {
        brand: {
          badge: getVal('brand-badge'),
          title: getVal('brand-title'),
          subtitle: getVal('brand-subtitle')
        },
        navigation
      };
    }
    case 'hero': {
      const autoPlay = document.getElementById('slider-autoplay')?.checked ?? true;
      const interval = parseInt(getVal('slider-interval')) || 5;
      const slideItems = document.querySelectorAll('[data-slide-index]');
      const slides = Array.from(slideItems).map((_, i) => ({
        id: `slide-${i + 1}`,
        tag: getVal(`slide-tag-${i}`),
        title: getVal(`slide-title-${i}`),
        description: getVal(`slide-desc-${i}`),
        backgroundImage: getVal(`slide-bg-${i}`),
        primaryButtonText: getVal(`slide-btn1-${i}`),
        primaryButtonLink: getVal(`slide-btn1-link-${i}`),
        secondaryButtonText: getVal(`slide-btn2-${i}`)
      }));

      // Keep hero object sync with slide 1 for fallbacks
      const hero = slides[0] ? {
        tag: slides[0].tag,
        title: slides[0].title,
        description: slides[0].description,
        backgroundImage: slides[0].backgroundImage,
        primaryButtonText: slides[0].primaryButtonText,
        primaryButtonLink: slides[0].primaryButtonLink,
        secondaryButtonText: slides[0].secondaryButtonText
      } : (content.hero || {});

      return {
        sliderSettings: { autoPlay, interval, effect: 'fade' },
        slides,
        hero
      };
    }
    case 'catalog':
      return {
        title: getVal('cat-modal-title'),
        description: getVal('cat-modal-desc'),
        pdfUrl: getVal('cat-pdf-url')
      };
    case 'stats': {
      const items = document.querySelectorAll('.list-item');
      return Array.from(items).map((_, i) => ({
        number: getVal(`stat-num-${i}`),
        label: getVal(`stat-label-${i}`)
      }));
    }
    case 'aboutCorporate':
      return {
        subtitle: getVal('corp-subtitle'),
        title: getVal('corp-title'),
        badgeText: getVal('corp-badge'),
        image: getVal('corp-image'),
        description: getVal('corp-desc'),
        mission: getVal('corp-mission'),
        highlights: getVal('corp-highlights').split('\n').filter(Boolean)
      };
    case 'productsSection':
      return {
        subtitle: getVal('prod-subtitle'),
        title: getVal('prod-title')
      };
    case 'productCategories': {
      const items = document.querySelectorAll('[data-cat-index]');
      return Array.from(items).map((_, i) => ({
        id: getVal(`cat-id-${i}`),
        name: getVal(`cat-name-${i}`),
        desc: getVal(`cat-desc-${i}`)
      }));
    }
    case 'products': {
      const items = document.querySelectorAll('[data-prod-index]');
      return Array.from(items).map((_, i) => ({
        id: getVal(`prod-id-${i}`),
        name: getVal(`prod-name-${i}`),
        category: getVal(`prod-cat-${i}`),
        desc: getVal(`prod-desc-${i}`),
        image: getVal(`prod-image-${i}`),
        pressure: getVal(`prod-pressure-${i}`),
        motor: getVal(`prod-motor-${i}`),
        usageArea: getVal(`prod-usage-${i}`),
        price: getVal(`prod-price-${i}`),
        features: getVal(`prod-features-${i}`).split('\n').filter(Boolean)
      }));
    }
    case 'about':
      return {
        image: getVal('about-image'),
        imageAlt: getVal('about-alt'),
        subtitle: getVal('about-subtitle'),
        title: getVal('about-title'),
        description: getVal('about-desc'),
        features: getVal('about-features').split('\n').filter(Boolean),
        buttonText: getVal('about-btn')
      };
    case 'referencesSection': {
      const brandItems = document.querySelectorAll('[data-ref-brand]');
      const brands = Array.from(brandItems).map((_, i) => ({
        name: getVal(`ref-bname-${i}`),
        badge: getVal(`ref-bbadge-${i}`),
        desc: getVal(`ref-bdesc-${i}`)
      }));

      const testItems = document.querySelectorAll('[data-ref-test]');
      const testimonials = Array.from(testItems).map((_, i) => ({
        name: getVal(`ref-tname-${i}`),
        company: getVal(`ref-tcomp-${i}`),
        comment: getVal(`ref-tcomm-${i}`),
        rating: parseInt(getVal(`ref-trating-${i}`)) || 5
      }));

      return {
        subtitle: getVal('ref-subtitle'),
        title: getVal('ref-title'),
        description: getVal('ref-desc'),
        brands,
        testimonials
      };
    }
    case 'footer': {
      const footerData = {
        companyName: getVal('footer-company'),
        description: getVal('footer-desc'),
        address: getVal('footer-address'),
        weekdayHours: getVal('footer-weekday'),
        saturdayHours: getVal('footer-saturday'),
        copyright: getVal('footer-copyright'),
        quickMenuTitle: content.footer?.quickMenuTitle || 'Hızlı Menü',
        productGroupsTitle: content.footer?.productGroupsTitle || 'Ürün Grupları',
        contactTitle: content.footer?.contactTitle || 'İletişim & Çalışma'
      };
      content.companyInfo = content.companyInfo || {};
      content.companyInfo.phone = getVal('footer-phone');
      content.companyInfo.email = getVal('footer-email');
      return footerData;
    }
    case 'companyInfo':
      return {
        name: getVal('ci-name'),
        foundedYear: parseInt(getVal('ci-founded')) || 2003,
        location: getVal('ci-location'),
        phone: getVal('ci-phone'),
        whatsapp: getVal('ci-whatsapp'),
        email: getVal('ci-email'),
        website: getVal('ci-website'),
        workingHours: {
          weekdays: getVal('ci-wh-weekdays'),
          saturday: getVal('ci-wh-saturday'),
          sunday: getVal('ci-wh-sunday')
        },
        warranty: getVal('ci-warranty'),
        delivery: getVal('ci-delivery'),
        stats: {
          petrolStations: getVal('ci-stat-petrol'),
          productsCount: getVal('ci-stat-products'),
          happyCustomers: getVal('ci-stat-customers'),
          exportCountries: getVal('ci-stat-export')
        }
      };
    case 'quoteForm':
      return {
        title: getVal('quote-title'),
        description: getVal('quote-desc'),
        productOptions: getVal('quote-options').split('\n').filter(Boolean),
        submitButtonText: getVal('quote-submit'),
        successMessage: getVal('quote-success')
      };
    case 'aiChat':
      return {
        widgetTitle: getVal('ai-title'),
        widgetStatus: getVal('ai-status'),
        inputPlaceholder: getVal('ai-placeholder'),
        headerButtonText: getVal('ai-header-btn'),
        welcomeMessage: getVal('ai-welcome'),
        welcomeQuickReplies: getVal('ai-welcome-replies').split('\n').filter(Boolean),
        clearMessage: getVal('ai-clear-msg'),
        clearQuickReplies: getVal('ai-clear-replies').split('\n').filter(Boolean)
      };
    case 'faqs': {
      const items = document.querySelectorAll('[data-faq-index]');
      return Array.from(items).map((_, i) => ({
        id: `faq-${i + 1}`,
        question: getVal(`faq-q-${i}`),
        answer: getVal(`faq-a-${i}`),
        keywords: getVal(`faq-kw-${i}`).split(',').map(k => k.trim()).filter(Boolean),
        quickReplies: getVal(`faq-qr-${i}`).split(',').map(k => k.trim()).filter(Boolean)
      }));
    }
    case 'firebase': {
      const enabled = document.getElementById('fb-enabled')?.checked || false;
      return {
        enabled,
        apiKey: getVal('fb-apikey'),
        authDomain: getVal('fb-authdomain'),
        databaseURL: getVal('fb-dburl'),
        projectId: getVal('fb-projectid'),
        storageBucket: getVal('fb-storage'),
        appId: getVal('fb-appid')
      };
    }
    default:
      return null;
  }
}

function applySectionToContent(section, data) {
  if (section === 'brand') {
    content.brand = data.brand;
    content.navigation = data.navigation;
  } else if (section === 'hero') {
    content.sliderSettings = data.sliderSettings;
    content.slides = data.slides;
    content.hero = data.hero;
  } else {
    content[section] = data;
  }
}

async function saveSection(section) {
  const data = collectSectionData(section);
  if (section === 'brand') {
    content.brand = data.brand;
    content.navigation = data.navigation;
    await apiFetch('/api/admin/content/brand', { method: 'PATCH', body: JSON.stringify(data.brand) });
    await apiFetch('/api/admin/content/navigation', { method: 'PATCH', body: JSON.stringify(data.navigation) });
  } else if (section === 'hero') {
    applySectionToContent('hero', data);
    await apiFetch('/api/admin/content/hero', { method: 'PATCH', body: JSON.stringify(data.hero) });
    await apiFetch('/api/admin/content/sliderSettings', { method: 'PATCH', body: JSON.stringify(data.sliderSettings) });
    await apiFetch('/api/admin/content/slides', { method: 'PATCH', body: JSON.stringify(data.slides) });
  } else if (section === 'footer') {
    applySectionToContent('footer', data);
    await apiFetch('/api/admin/content/footer', { method: 'PATCH', body: JSON.stringify(data) });
    await apiFetch('/api/admin/content/companyInfo', { method: 'PATCH', body: JSON.stringify(content.companyInfo) });
  } else {
    applySectionToContent(section, data);
    await apiFetch(`/api/admin/content/${section}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  // Auto sync to Firebase & Firestore if enabled
  if (content.firebase?.enabled) {
    try {
      await syncContentToFirebase(content);
    } catch (e) {
      console.warn('Firebase sync warning:', e);
    }
  }
  updateMetricsDisplay();
}

async function saveCurrentSection() {
  saveStatus.textContent = 'Kaydediliyor...';
  try {
    await saveSection(currentSection);
    saveStatus.textContent = 'Kaydedildi ✓';
    showToast('Değişiklikler başarıyla kaydedildi!');
    setTimeout(() => saveStatus.textContent = '', 3000);
  } catch (err) {
    saveStatus.textContent = '';
    showToast(err.message, 'error');
  }
}

async function saveAll() {
  saveStatus.textContent = 'Tümü kaydediliyor...';
  try {
    const data = collectSectionData(currentSection);
    if (currentSection === 'brand') {
      content.brand = data.brand;
      content.navigation = data.navigation;
    } else if (currentSection === 'hero') {
      content.sliderSettings = data.sliderSettings;
      content.slides = data.slides;
      content.hero = data.hero;
    } else if (data !== null) {
      content[currentSection] = data;
    }
    await apiFetch('/api/admin/content', { method: 'PUT', body: JSON.stringify(content) });

    if (content.firebase?.enabled) {
      try {
        await syncContentToFirebase(content);
      } catch (e) { console.warn('Firebase sync error:', e); }
    }

    saveStatus.textContent = 'Tümü kaydedildi ✓';
    showToast('Tüm web sitesi ve AI veri seti başarıyla kaydedildi!');
    setTimeout(() => saveStatus.textContent = '', 3000);
    updateMetricsDisplay();
  } catch (err) {
    saveStatus.textContent = '';
    showToast(err.message, 'error');
  }
}

function attachSectionListeners(section) {
  // Image Uploader Listener
  document.querySelectorAll('.img-file-uploader').forEach(fileInput => {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const targetId = e.target.dataset.targetId;
      if (!file || !targetId) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const inputEl = document.getElementById(targetId);
        if (inputEl) {
          inputEl.value = evt.target.result;
          const data = collectSectionData(currentSection);
          if (data) applySectionToContent(currentSection, data);
          showToast('Görsel başarıyla yüklendi!');
          renderSection(currentSection);
        }
      };
      reader.readAsDataURL(file);
    });
  });

  // PDF File Uploader Listener
  const pdfInput = document.getElementById('pdf-file-uploader');
  if (pdfInput) {
    pdfInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const urlInput = document.getElementById('cat-pdf-url');
        if (urlInput) {
          urlInput.value = evt.target.result;
          showToast('e-Katalog PDF dosyası başarıyla yüklendi!');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Slide Add / Delete
  document.getElementById('btn-add-slide')?.addEventListener('click', () => {
    content.slides = content.slides || [];
    content.slides.push({
      id: 'slide-' + (content.slides.length + 1),
      tag: 'Yeni Banner Etiketi',
      title: 'Yeni Banner <span>Başlığı</span>',
      description: 'Açıklama metni...',
      backgroundImage: 'assets/images/hero_banner.png',
      primaryButtonText: 'İnceleyin',
      primaryButtonLink: '#urunler',
      secondaryButtonText: 'Soru Sor'
    });
    renderSection('hero');
  });

  document.querySelectorAll('[data-delete-slide]').forEach(btn => {
    btn.addEventListener('click', () => {
      content.slides.splice(parseInt(btn.dataset.deleteSlide), 1);
      renderSection('hero');
    });
  });

  document.getElementById('btn-add-stat')?.addEventListener('click', () => {
    content.stats = content.stats || [];
    content.stats.push({ number: '0', label: 'Yeni İstatistik' });
    renderSection('stats');
  });

  document.getElementById('btn-add-nav')?.addEventListener('click', () => {
    content.navigation = content.navigation || [];
    content.navigation.push({ id: 'yeni', label: 'Yeni Menü', href: '#yeni' });
    renderSection('brand');
  });

  document.getElementById('btn-add-cat')?.addEventListener('click', () => {
    content.productCategories = content.productCategories || [];
    content.productCategories.push({ id: 'yeni-kategori', name: 'Yeni Kategori', desc: '' });
    renderSection('productCategories');
  });

  document.getElementById('btn-add-prod')?.addEventListener('click', () => {
    content.products = content.products || [];
    content.products.push({
      id: 'yeni-urun-' + Date.now(),
      name: 'Yeni Ürün',
      category: content.productCategories?.[0]?.id || 'parali-kopuk-yikama',
      desc: '',
      image: 'assets/images/foam_machine.png',
      features: []
    });
    renderSection('products');
  });

  document.getElementById('btn-add-faq')?.addEventListener('click', () => {
    content.faqs = content.faqs || [];
    content.faqs.push({
      id: 'faq-' + (content.faqs.length + 1),
      question: 'Yeni AI Soru?',
      answer: 'Cevap detayları...',
      keywords: ['yeni', 'soru'],
      quickReplies: ['Fiyat Al', 'İletişim']
    });
    renderSection('faqs');
  });

  document.getElementById('btn-add-ref-brand')?.addEventListener('click', () => {
    content.referencesSection = content.referencesSection || { brands: [] };
    content.referencesSection.brands = content.referencesSection.brands || [];
    content.referencesSection.brands.push({ name: 'Yeni Bayi', badge: 'Akaryakıt', desc: '10+ İstasyon' });
    renderSection('referencesSection');
  });

  document.getElementById('btn-add-ref-test')?.addEventListener('click', () => {
    content.referencesSection = content.referencesSection || { testimonials: [] };
    content.referencesSection.testimonials = content.referencesSection.testimonials || [];
    content.referencesSection.testimonials.push({ name: 'İstasyon Yetkilisi', company: 'Petrol Bayii', comment: 'Harika makineler...', rating: 5 });
    renderSection('referencesSection');
  });

  // Deletes
  document.querySelectorAll('[data-delete-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      content.navigation.splice(parseInt(btn.dataset.deleteNav), 1);
      renderSection('brand');
    });
  });

  document.querySelectorAll('[data-delete-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      content.productCategories.splice(parseInt(btn.dataset.deleteCat), 1);
      renderSection('productCategories');
    });
  });

  document.querySelectorAll('[data-delete-prod]').forEach(btn => {
    btn.addEventListener('click', () => {
      content.products.splice(parseInt(btn.dataset.deleteProd), 1);
      renderSection('products');
    });
  });

  document.querySelectorAll('[data-delete-faq]').forEach(btn => {
    btn.addEventListener('click', () => {
      content.faqs.splice(parseInt(btn.dataset.deleteFaq), 1);
      renderSection('faqs');
    });
  });

  document.querySelectorAll('[data-delete-brand]').forEach(btn => {
    btn.addEventListener('click', () => {
      content.referencesSection.brands.splice(parseInt(btn.dataset.deleteBrand), 1);
      renderSection('referencesSection');
    });
  });

  document.querySelectorAll('[data-delete-test]').forEach(btn => {
    btn.addEventListener('click', () => {
      content.referencesSection.testimonials.splice(parseInt(btn.dataset.deleteTest), 1);
      renderSection('referencesSection');
    });
  });

  // Live AI Chatbot Simulator Test Handler
  if (section === 'faqs') {
    const simInput = document.getElementById('sim-input');
    const simSendBtn = document.getElementById('sim-send-btn');
    const simBody = document.getElementById('sim-body');

    function runSimQuery() {
      const query = simInput.value.trim();
      if (!query) return;

      const userBubble = document.createElement('div');
      userBubble.className = 'sim-bubble user';
      userBubble.textContent = query;
      simBody.appendChild(userBubble);
      simInput.value = '';

      const currentFaqs = collectSectionData('faqs');
      const tempContent = { ...content, faqs: currentFaqs };

      const aiEngine = new PrestijAIEngine(tempContent);
      const res = aiEngine.processQuery(query);

      setTimeout(() => {
        const botBubble = document.createElement('div');
        botBubble.className = 'sim-bubble bot';
        botBubble.innerHTML = res.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        simBody.appendChild(botBubble);
        simBody.scrollTop = simBody.scrollHeight;
      }, 300);
    }

    simSendBtn?.addEventListener('click', runSimQuery);
    simInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') runSimQuery(); });
  }

  // Firebase / Firestore Handlers
  if (section === 'firebase') {
    document.getElementById('btn-test-fb')?.addEventListener('click', async () => {
      const fbData = collectSectionData('firebase');
      const res = await initFirebase(fbData);
      if (res.success) {
        showToast('Firebase & Firestore Bağlantı Testi Başarılı! 🔥', 'success');
        updateFirebaseBadge(true);
      } else {
        showToast(`Firebase Hatası: ${res.message}`, 'error');
        updateFirebaseBadge(false);
      }
    });

    document.getElementById('btn-sync-to-fb')?.addEventListener('click', async () => {
      try {
        const fbData = collectSectionData('firebase');
        await initFirebase(fbData);
        await syncContentToFirebase(content);
        showToast('Tüm site verisi Firebase & Cloud Firestore bulutuna yüklendi! 🔥', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    document.getElementById('btn-fetch-from-fb')?.addEventListener('click', async () => {
      try {
        const fbData = collectSectionData('firebase');
        await initFirebase(fbData);
        const fbContent = await fetchContentFromFirebase();
        if (fbContent) {
          content = fbContent;
          await saveAll();
          showToast('Firestore / Firebase\'den en güncel veri çekildi ve kaydedildi! 🔥', 'success');
          renderSection('site');
        } else {
          showToast('Firebase\'de henüz kayıtlı veri bulunamadı.', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const data = collectSectionData(currentSection);
    if (currentSection === 'brand') {
      content.brand = data.brand;
      content.navigation = data.navigation;
    } else if (currentSection === 'hero') {
      content.sliderSettings = data.sliderSettings;
      content.slides = data.slides;
      content.hero = data.hero;
    } else if (data !== null) {
      content[currentSection] = data;
    }
    renderSection(btn.dataset.section);
  });
});

document.getElementById('btn-save-section').addEventListener('click', saveCurrentSection);
document.getElementById('btn-save-all').addEventListener('click', saveAll);

(async () => {
  if (await checkAuth()) {
    showAdmin();
    await loadContent();
    renderSection('site');
  } else {
    showLogin();
  }
})();
