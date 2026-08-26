import { loadSiteContent, applySiteContent, getProductsDataset, getProductCategories, getCompanyInfo, getAiChatConfig, getQuoteFormConfig, getCatalogConfig, getSliderSettings } from './content-loader.js';
import { PrestijAIEngine } from './ai-engine.js';
import { setCurrentLang, getCurrentLang, t, categoryTranslations, productTranslations } from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  let content;
  try {
    content = await loadSiteContent();
    applySiteContent(content);
  } catch (err) {
    console.error('İçerik yüklenemedi:', err);
    content = {};
  }

  const PRODUCTS_DATASET = getProductsDataset();
  const PRODUCT_CATEGORIES = getProductCategories();
  const COMPANY_INFO = getCompanyInfo();
  const aiConfig = getAiChatConfig();
  const quoteConfig = getQuoteFormConfig();
  const catalogConfig = getCatalogConfig();

  const aiEngine = new PrestijAIEngine(content);

  const productsGrid = document.getElementById('products-grid');
  const categoryTabs = document.getElementById('category-tabs');
  const aiDrawer = document.getElementById('ai-chat-drawer');
  const aiTrigger = document.getElementById('btn-ai-trigger');
  const aiClose = document.getElementById('ai-chat-close');
  const aiClear = document.getElementById('ai-chat-clear');
  const chatBody = document.getElementById('ai-chat-body');
  const chatInput = document.getElementById('ai-chat-input');
  const sendBtn = document.getElementById('btn-send-msg');
  const quoteModal = document.getElementById('quote-modal');
  const modalClose = document.getElementById('modal-close');
  const quoteForm = document.getElementById('quote-form');

  // Language Switcher Logic
  const initLanguageSwitcher = () => {
    const currentLang = getCurrentLang();
    const buttons = document.querySelectorAll('#lang-switch button');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
      btn.addEventListener('click', (e) => {
        const selectedLang = e.target.dataset.lang;
        if (selectedLang && setCurrentLang(selectedLang)) {
          buttons.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          applySiteContent(content, selectedLang);
          renderCategoryTabs(selectedLang);
          renderProducts('all', selectedLang);
          initSliderLogic();
        }
      });
    });
  };

  // Mobile Hamburger Menu Logic
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      mainNav.classList.toggle('open');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
      });
    });
  }

  // Hero Slider Logic
  let sliderIntervalTimer = null;
  let currentSlideIndex = 0;

  const initSliderLogic = () => {
    if (sliderIntervalTimer) clearInterval(sliderIntervalTimer);

    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.slider-dots .dot');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');
    const settings = getSliderSettings();

    if (slides.length <= 1) return;

    const showSlide = (index) => {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
      currentSlideIndex = index;
    };

    const nextSlide = () => {
      const nextIdx = (currentSlideIndex + 1) % slides.length;
      showSlide(nextIdx);
    };

    const prevSlide = () => {
      const prevIdx = (currentSlideIndex - 1 + slides.length) % slides.length;
      showSlide(prevIdx);
    };

    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.dotIndex);
        if (!isNaN(idx)) showSlide(idx);
      });
    });

    if (settings.autoPlay !== false) {
      const intervalMs = (settings.interval || 5) * 1000;
      sliderIntervalTimer = setInterval(nextSlide, intervalMs);
    }
  };

  // E-Catalog Automatic Direct Download Logic
  const btnOpenCatalog = document.getElementById('btn-open-catalog');

  const downloadCatalog = (e) => {
    if (e) e.preventDefault();
    const pdfUrl = catalogConfig.pdfUrl || 'assets/catalog.pdf';

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'Prestij-Makina-e-Katalog-2026.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (btnOpenCatalog) btnOpenCatalog.addEventListener('click', downloadCatalog);

  const playAudioChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.log('Audio Context not allowed without interaction yet');
    }
  };

  const renderProducts = (categoryId = 'all', lang = getCurrentLang()) => {
    if (!productsGrid) return;

    let filtered = PRODUCTS_DATASET;
    if (categoryId !== 'all') {
      filtered = PRODUCTS_DATASET.filter(p => p.category === categoryId);
    }

    productsGrid.innerHTML = filtered.map(product => {
      const imageSrc = product.image || 'assets/images/foam_machine.png';
      const askBtnText = t('askAiBtn', lang);
      const motorLbl = t('specMotorLabel', lang);
      const usageLbl = t('specUsageLabel', lang);

      const prodTrans = productTranslations[product.id]?.[lang];
      const prodName = prodTrans?.name || product.name;
      const prodDesc = prodTrans?.desc || product.desc;
      const usageArea = prodTrans?.usageArea || product.usageArea || t('specDefaultUsage', lang);

      return `
        <div class="product-card" data-id="${product.id}">
          <div class="product-image-container">
            <img src="${imageSrc}" alt="${prodName}">
            <span class="product-tag">${product.pressure || 'Endüstriyel'}</span>
          </div>
          <div class="product-details">
            <h3 class="product-title">${prodName}</h3>
            <p class="product-desc">${prodDesc}</p>
            <div class="product-specs">
              <div><span>${motorLbl}</span> <strong>${product.motor || 'Trifaze / 380V'}</strong></div>
              <div><span>${usageLbl}</span> <strong>${usageArea.split(',')[0]}</strong></div>
            </div>
            <div class="product-footer">
              <button class="btn-card-action btn-ask-ai" data-product="${prodName}">
                ${askBtnText}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.btn-ask-ai').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productName = e.target.dataset.product;
        openAIChat();
        handleUserMessage(`Bana "${productName}" makinesi hakkında detaylı bilgi ve teknik özelliklerini verir misin?`);
      });
    });
  };

  const renderCategoryTabs = (lang = getCurrentLang()) => {
    if (!categoryTabs) return;

    let html = `<button class="tab-btn active" data-category="all">${t('tabAllProducts', lang)}</button>`;
    PRODUCT_CATEGORIES.forEach(cat => {
      const catName = categoryTranslations[cat.id]?.[lang] || cat.name;
      html += `<button class="tab-btn" data-category="${cat.id}">${catName}</button>`;
    });

    categoryTabs.innerHTML = html;

    categoryTabs.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        categoryTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderProducts(e.target.dataset.category, lang);
      });
    });
  };

  const openAIChat = () => {
    aiDrawer.classList.add('open');
    chatInput.focus();
  };

  const closeAIChat = () => {
    aiDrawer.classList.remove('open');
  };

  if (aiTrigger) aiTrigger.addEventListener('click', openAIChat);
  if (aiClose) aiClose.addEventListener('click', closeAIChat);

  document.querySelectorAll('.btn-ai-launch').forEach(btn => {
    btn.addEventListener('click', openAIChat);
  });

  if (aiClear) {
    aiClear.addEventListener('click', () => {
      chatBody.innerHTML = '';
      appendBotMessage(
        aiConfig.clearMessage || 'Sohbet geçmişi temizlendi.',
        aiConfig.clearQuickReplies || []
      );
    });
  }

  const appendUserMessage = (text) => {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
  };

  const appendBotMessage = (responseObj, quickReplies = []) => {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';

    let text = typeof responseObj === 'string' ? responseObj : responseObj.text;
    bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const replies = responseObj.quickReplies || quickReplies;
    if (replies && replies.length > 0) {
      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'quick-replies-container';
      replies.forEach(replyText => {
        const chip = document.createElement('button');
        chip.className = 'chip-btn';
        chip.textContent = replyText;
        chip.onclick = () => handleUserMessage(replyText);
        chipsWrap.appendChild(chip);
      });
      bubble.appendChild(chipsWrap);
    }

    if (responseObj.action) {
      const actBtn = document.createElement('button');
      actBtn.className = 'btn-primary';
      actBtn.style.marginTop = '12px';
      actBtn.style.fontSize = '0.85rem';
      actBtn.style.padding = '8px 14px';
      actBtn.textContent = responseObj.action.label;
      actBtn.onclick = () => {
        if (responseObj.action.type === 'QUOTE_MODAL') {
          quoteModal.classList.add('open');
        } else if (responseObj.action.type === 'CALL_MODAL') {
          window.location.href = `tel:${COMPANY_INFO.phone?.replace(/\s/g, '')}`;
        }
      };
      bubble.appendChild(actBtn);
    }

    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
    playAudioChime();
  };

  const handleUserMessage = (text) => {
    const query = text || chatInput.value.trim();
    if (!query) return;

    appendUserMessage(query);
    if (!text) chatInput.value = '';

    setTimeout(() => {
      const botResult = aiEngine.processQuery(query, getCurrentLang());
      appendBotMessage(botResult);
    }, 400);
  };

  if (sendBtn) {
    sendBtn.addEventListener('click', () => handleUserMessage());
  }

  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleUserMessage();
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      quoteModal.classList.remove('open');
    });
  }

  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert(quoteConfig.successMessage || 'Teklif talebiniz iletilmiştir.');
      quoteModal.classList.remove('open');
      quoteForm.reset();
    });
  }

  initLanguageSwitcher();
  renderCategoryTabs();
  renderProducts();
  initSliderLogic();

  setTimeout(() => {
    appendBotMessage(
      t('aiWelcomeMessage', getCurrentLang()),
      aiConfig.welcomeQuickReplies || []
    );
  }, 600);
});
