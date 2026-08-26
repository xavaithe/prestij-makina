/**
 * Prestij Makina - Multilingual AI Intelligent Knowledge Engine
 * Supports TR (Türkçe), EN (English), SQ (Shqip - Arnavutça)
 */

import { getCurrentLang, productTranslations, categoryTranslations } from './i18n.js';

export class PrestijAIEngine {
  constructor(data = {}) {
    this.dataset = data.products || [];
    this.company = data.companyInfo || {};
    this.faqs = data.faqs || [];
    this.categories = data.productCategories || [];
  }

  processQuery(userInput, lang = getCurrentLang()) {
    if (!userInput || typeof userInput !== 'string') {
      return this.getFallbackResponse(lang);
    }

    const query = userInput.toLowerCase().trim();

    // 1. Greetings
    if (this.isGreeting(query)) {
      return this.getGreetingResponse(lang);
    }

    // 2. Dynamic FAQs (if matched)
    for (const faq of this.faqs) {
      if (faq.keywords && faq.keywords.some(kw => kw && query.includes(kw.toLowerCase().trim()))) {
        return {
          text: `❓ **${faq.question}**\n\n${faq.answer}`,
          quickReplies: faq.quickReplies && faq.quickReplies.length > 0 ? faq.quickReplies : this.getDefaultQuickReplies(lang),
          action: faq.action || null
        };
      }
    }

    // 3. Contact & Location
    if (this.matchesAny(query, ["iletişim", "telefon", "adres", "konum", "nerede", "eposta", "e-posta", "mail", "whatsapp", "çalışma saatleri", "contact", "phone", "address", "location", "email", "kontakt", "telefoni", "adresa"])) {
      return this.getContactResponse(lang);
    }

    // 4. Price & Quote
    if (this.matchesAny(query, ["fiyat", "ücret", "kaça", "maliyet", "teklif", "satın al", "iskonto", "kaç tl", "price", "cost", "quote", "buy", "cmimi", "oferta", "blerje"])) {
      return this.getQuoteResponse(lang);
    }

    // 5. Warranty & Service
    if (this.matchesAny(query, ["garanti", "servis", "arıza", "bozulur", "yedek parça", "tamir", "bakım", "warranty", "service", "spare part", "repair", "garancia", "sherbimi", "pjese"])) {
      return this.getWarrantyResponse(lang);
    }

    // 6. Central Wash & Robotic Vault Systems
    if (this.matchesAny(query, ["merkezi", "tonoz", "peron", "istasyon", "benzinlik", "robot", "temassız", "fırçasız", "central", "vault", "bay", "station", "brushless", "qendrore", "pista", "robotik"])) {
      return this.getCentralWashResponse(lang);
    }

    // 7. Product Specific Search
    const matchedProducts = this.searchProducts(query);
    if (matchedProducts.length > 0) {
      return this.getProductDetailResponse(matchedProducts[0], lang);
    }

    // 8. General Fallback
    return this.getFallbackResponse(lang);
  }

  getGreetingResponse(lang) {
    if (lang === 'en') {
      return {
        text: `Hello! I am the **Prestij Machinery Smart AI Assistant**. 🤖\n\nI am happy to assist you with our car wash vending machines, coin vacuums, central washing systems, technical specifications, and price quotes.\n\nHow can I help you today?`,
        quickReplies: ["Washing Machines", "Central Wash System", "Get Price Quote", "Contact Information"]
      };
    } else if (lang === 'sq') {
      return {
        text: `Përshëndetje! Unë jam **Asistenti IA Prestij Makina**. 🤖\n\nJam i lumtur t'ju ndihmoj me makineritë tona të larjes, fshesat me zhetona, sistemet qendrore, specifikimet teknike dhe ofertat e çmimeve.\n\nSi mund t'ju ndihmoj sot?`,
        quickReplies: ["Makinat e Larjes", "Sistemi Qendror", "Merr Ofertë Çmimi", "Informacion Kontakti"]
      };
    }

    return {
      text: `Merhaba! Ben **Prestij Makina Akıllı Yapay Zeka Asistanı**. 🤖\n\nOto yıkama makinelerimiz, jetonlu süpürgeler, merkezi yıkama sistemleri, teknik özellikler ve fiyat teklifleri hakkında size yardımcı olmaktan memnuniyet duyarım.\n\nSizlere nasıl yardımcı olabilirim?`,
      quickReplies: ["Yıkama Makineleri", "Merkezi Yıkama Sistemi", "Fiyat Teklifi Al", "İletişim Bilgileri"]
    };
  }

  getContactResponse(lang) {
    const phone = this.company.phone || '+90 332 237 80 00';
    const email = this.company.email || 'info@prestijmakina.com.tr';
    const whatsapp = this.company.whatsapp || '+90 532 000 80 00';

    if (lang === 'en') {
      return {
        text: `📍 **Prestij Machinery Contact & Factory Info:**\n\n` +
              `• **Factory Address:** Konya Industrial Zone, Selcuklu / KONYA, Turkey\n` +
              `• **Customer Service:** ${phone}\n` +
              `• **WhatsApp Support:** ${whatsapp}\n` +
              `• **Email:** ${email}\n` +
              `• **Working Hours:** Weekdays: 08:00 - 18:00 | Saturday: 08:00 - 15:00\n\n` +
              `You can click the button below to call our representative immediately.`,
        action: { type: "CALL_MODAL", label: "📞 Call Customer Service" }
      };
    } else if (lang === 'sq') {
      return {
        text: `📍 **Informacion Kontakti & Fabrika Prestij Makina:**\n\n` +
              `• **Adresa e Fabrikës:** Zona Industriale Konya, Turqi\n` +
              `• **Shërbimi ndaj Klientit:** ${phone}\n` +
              `• **Mbështetje WhatsApp:** ${whatsapp}\n` +
              `• **Email:** ${email}\n` +
              `• **Orari i Punës:** Ditët e javës: 08:00 - 18:00 | E shtunë: 08:00 - 15:00\n\n` +
              `Mund të klikoni butonin më poshtë për të telefonuar përfaqësuesin tonë.`,
        action: { type: "CALL_MODAL", label: "📞 Telefono Shërbimin e Klientit" }
      };
    }

    return {
      text: `📍 **Prestij Makina İletişim & Fabrika Bilgileri:**\n\n` +
            `• **Fabrika Adresi:** Fevzi Çakmak Mah. Konya OSB, Selçuklu / KONYA\n` +
            `• **Müşteri Hizmetleri:** ${phone}\n` +
            `• **WhatsApp Destek:** ${whatsapp}\n` +
            `• **E-Posta:** ${email}\n` +
            `• **Çalışma Saatleri:** Hafta İçi: 08:00 - 18:00 | Cumartesi: 08:00 - 15:00\n\n` +
            `Dilerseniz hemen temsilcilerimizle görüşmek için aşağıdaki butona tıklayabilirsiniz.`,
      action: { type: "CALL_MODAL", label: "📞 Müşteri Temsilcisini Ara" }
    };
  }

  getQuoteResponse(lang) {
    if (lang === 'en') {
      return {
        text: `💰 **Pricing & Quote Information:**\n\n` +
              `Prices of our Prestij Machinery products are determined with custom discounts based on parameters such as **pump pressure (200-250 Bar)**, **coin/card options**, **stainless steel grade**, and **delivery address**.\n\n` +
              `📌 **To Receive a Quick Price Offer:**\n` +
              `Fill out the form below to receive a personalized proposal within minutes!`,
        action: { type: "QUOTE_MODAL", label: "📋 Open Quick Quote Form" }
      };
    } else if (lang === 'sq') {
      return {
        text: `💰 **Informacion për Çmimet dhe Ofertat:**\n\n` +
              `Çmimet e produkteve tona Prestij Makina përcaktohen me zbritje të veçanta bazuar në **presionin e pompës (200-250 Bar)**, **opsionet e monedhave/kartave**, **kualitetin e çelikut inoks** dhe **adresën e dorëzimit**.\n\n` +
              `📌 **Për të marrë një Ofertë të Shpejtë:**\n` +
              `Plotësoni formularin për të marrë një ofertë brenda pak minutave!`,
        action: { type: "QUOTE_MODAL", label: "📋 Hap Formularin e Ofertës" }
      };
    }

    return {
      text: `💰 **Fiyat ve Teklif Bilgilendirmesi:**\n\n` +
            `Prestij Makina ürünlerimizin fiyatları; seçeceğiniz **pompa gücü (200 Bar - 250 Bar)**, **jeton/kart mekanizması opsiyonları**, **şasi paslanmaz çelik çeşidi** ve **teslimat adresi** gibi parametrelere göre özel iskonto ile belirlenir.\n\n` +
            `📌 **Hızlı Fiyat Teklifi Almak İçin:**\n` +
            `Formu doldurarak dakikalar içinde kişiselleştirilmiş teklif alabilirsiniz!`,
      action: { type: "QUOTE_MODAL", label: "📋 Hızlı Fiyat Teklifi Formu Aç" }
    };
  }

  getWarrantyResponse(lang) {
    if (lang === 'en') {
      return {
        text: `🛡️ **Warranty & Technical Service Guarantee:**\n\n` +
              `• **2 Years Full Manufacturer Warranty:** All our machines are guaranteed for 2 years against factory defects.\n` +
              `• **10 Years Spare Parts Guarantee:** Original spare parts and sealing equipment are stocked for 10 years.\n` +
              `• **Mobile Service:** On-site installation and maintenance support nationwide and internationally.`,
        quickReplies: ["Our Products", "Contact Us", "Get Price Quote"]
      };
    } else if (lang === 'sq') {
      return {
        text: `🛡️ **Garancia & Shërbimi Teknik:**\n\n` +
              `• **2 Vjet Garanci e Plotë Prodhuesi:** Të gjitha makineritë tona janë të garantuara për 2 vjet kundër defekteve të fabrikës.\n` +
              `• **10 Vjet Garanci Pjesë Këmbimi:** Pjesët origjinale të këmbimit ruhen në stok për 10 vjet.\n` +
              `• **Shërbim Mobile:** Mbështetje për instalim dhe mirëmbajtje në vend.`,
        quickReplies: ["Produktet tona", "Na Kontaktoni", "Merr Ofertë Çmimi"]
      };
    }

    return {
      text: `🛡️ **Garanti & Teknik Servis Güvencesi:**\n\n` +
            `• **2 Yıl Tam Üretici Garantisi:** Tüm makinelerimiz fabrika hatalarına karşı 2 yıl garantilidir.\n` +
            `• **10 Yıl Yedek Parça Garantisi:** Orijinal yedek parça ve sızdırmazlık ekipmanı 10 yıl boyunca stoklarımızda hazırdır.\n` +
            `• **Gezici Mobil Servis:** Türkiye genelinde ve uluslararası ağımızda yerinde kurulum ve bakım hizmeti verilir.`,
      quickReplies: ["Ürün Gruplarımız", "İletişime Geç", "Fiyat Teklifi Al"]
    };
  }

  getCentralWashResponse(lang) {
    if (lang === 'en') {
      return {
        text: `🏗️ **Central Washing & Automatic Robotic Systems:**\n\n` +
              `Prestij Machinery offers turnkey projects from 2 to 12 bays for fuel stations and self-service wash parks.\n\n` +
              `🔹 **All pump and foam units are centralized in one soundproof technical room** to eliminate bay noise and maximize station layout.\n` +
              `🔹 **Touchless Robotic Wash Vault:** Cleans vehicles in 3 minutes without brushes using high-pressure water jets and active foam.`,
        action: { type: "QUOTE_MODAL", label: "🏗️ Get Central System Proposal" }
      };
    } else if (lang === 'sq') {
      return {
        text: `🏗️ **Zgjidhjet tona për Larje Qendrore & Sisteme Robotike:**\n\n` +
              `Prestij Makina ofron projekte "çelës në dorë" nga 2 deri në 12 pista për pika karburanti dhe parqe larjeje vetë-shërbim.\n\n` +
              `🔹 **Të gjitha njësitë e pompave dhe shkumës mblidhen në një dhomë teknike** për të eliminuar zhurmën dhe për të hapur hapësirë.\n` +
              `🔹 **Roboti i Larjes pa Furça:** Pastron automjetet në 3 minuta pa përdorur furça përmes currilave të ujit me presion.`,
        action: { type: "QUOTE_MODAL", label: "🏗️ Merr Ofertë për Sistem Qendror" }
      };
    }

    return {
      text: `🏗️ **Merkezi Yıkama & Otomatik Robotik Sistem Çözümlerimiz:**\n\n` +
            `Prestij Makina akaryakıt istasyonları ve self-servis oto yıkama parkları için 2 perondan 12 perona kadar özel anahtar teslim projeler sunar.\n\n` +
            `🔹 **Tüm pompa ve köpük üniteleri tek teknik odada toplanır**, peron gürültüsü engellenir.\n` +
            `🔹 **Temassız Robotik Tonoz:** Fırça kullanmadan 3 dakikada yüksek basınç ve aktif köpükle araç yıkar.`,
      action: { type: "QUOTE_MODAL", label: "🏗️ Merkezi Sistem Proje Teklifi Al" }
    };
  }

  getProductDetailResponse(product, lang) {
    const prodTrans = productTranslations[product.id]?.[lang];
    const name = prodTrans?.name || product.name;
    const desc = prodTrans?.desc || product.desc;
    const usageArea = prodTrans?.usageArea || product.usageArea || 'Akaryakıt İstasyonları';

    let labelDetails = "🔍 **Details About " + name + ":**\n\n";
    let labelDesc = "• **Description:** ";
    let labelPower = "• **Pressure / Power:** ";
    let labelUsage = "• **Usage Area:** ";
    let labelHighlights = "\n📌 **Key Features:**\n";
    let labelFooter = "\n*Contact us for full technical datasheet and current price quotes.*";
    let quickReplies = ["Get Price Quote", "Other Products", "Contact"];

    if (lang === 'sq') {
      labelDetails = "🔍 **Detajet rreth " + name + ":**\n\n";
      labelDesc = "• **Përshkrimi:** ";
      labelPower = "• **Presioni / Fuqia:** ";
      labelUsage = "• **Zona e Përdorimit:** ";
      labelHighlights = "\n📌 **Veçoritë Kryesore:**\n";
      labelFooter = "\n*Na kontaktoni për fletën teknike dhe ofertat aktuale të çmimeve.*";
      quickReplies = ["Merr Ofertë Çmimi", "Produkte të Tjera", "Kontakt"];
    } else if (lang === 'tr') {
      labelDetails = `🔍 **${name} Hakkında Detaylar:**\n\n`;
      labelDesc = "• **Açıklama:** ";
      labelPower = "• **Basınç / Güç:** ";
      labelUsage = "• **Kullanım Alanı:** ";
      labelHighlights = "\n📌 **Öne Çıkan Özellikler:**\n";
      labelFooter = "\n*Detaylı teknik föy ve güncel fiyat teklifi için iletişime geçebilirsiniz.*";
      quickReplies = ["Fiyat Teklifi Al", "Diğer Ürünler", "İletişim"];
    }

    let responseText = labelDetails +
                       labelDesc + desc + "\n" +
                       labelPower + (product.pressure || product.motor || 'Endüstriyel Standart') + "\n" +
                       labelUsage + usageArea + "\n" +
                       labelHighlights;

    if (product.features) {
      product.features.forEach(f => {
        responseText += `  - ${f}\n`;
      });
    }

    responseText += labelFooter;

    return {
      text: responseText,
      productCard: product,
      quickReplies: quickReplies
    };
  }

  getFallbackResponse(lang) {
    if (lang === 'en') {
      return {
        text: `I evaluated your query! 💡\n\nI can provide complete details on **Coin Vending Washers**, **Car Vacuums**, **Foam Tanks**, **360° Z-Boom Ceiling Swivels**, and **Central Wash Automation** manufactured by Prestij Machinery in our Konya plant.\n\nPlease select one of the topics below or contact customer support:`,
        quickReplies: ["Washing Machines", "Car Vacuums", "360 Boom Swivel", "Contact Support"]
      };
    } else if (lang === 'sq') {
      return {
        text: `E ekzaminova pyetjen tuaj! 💡\n\nUnë mund t'ju ofroj detaje të plota mbi **Makinat me Zhetona**, **Fshesat e Automjeteve**, **Krahët Rrotullues 360° Z-Boom** dhe **Automatizimet e Larjes Qendrore** të prodhuara nga Prestij Makina.\n\nJu lutemi zgjidhni një nga opsionet më poshtë ose kontaktoni shërbimin tonë:`,
        quickReplies: ["Makinat e Larjes", "Fshesat Auto", "Krahë 360 Boom", "Mbështetja"]
      };
    }

    return {
      text: `Sorunuzu detaylı olarak inceledim! 💡\n\nPrestij Makina olarak Konya fabrikamızda imal ettiğimiz **Paralı/Jetonlu Yıkama Makineleri**, **Oto Süpürgeler**, **Köpük Tankları**, **360° Z-Boom Pervaneler** ve **Merkezi Yıkama Otomasyonları** hakkında tam bilgi sahibiyim.\n\nAradığınız konuyu daha net yanıtlayabilmem için lütfen aşağıdaki kategorilerden birini seçebilir veya doğrudan müşteri temsilcimize bağlanabilirsiniz:`,
      quickReplies: ["Sıcak-Soğuk Yıkama", "Jetonlu Süpürgeler", "360 Boom Pervane", "İletişime Geç"]
    };
  }

  getDefaultQuickReplies(lang) {
    if (lang === 'en') return ["Get Price Quote", "Products", "Contact"];
    if (lang === 'sq') return ["Merr Ofertë Çmimi", "Produktet", "Kontakt"];
    return ["Fiyat Teklifi Al", "Ürünler", "İletişim"];
  }

  searchProducts(query) {
    return this.dataset.filter(product => {
      const fullText = (product.name + ' ' + product.desc + ' ' + product.category + ' ' + (product.usageArea || '') + ' ' + (product.features || []).join(' ')).toLowerCase();
      const terms = query.split(/\s+/).filter(t => t.length > 2);
      return terms.some(term => fullText.includes(term));
    });
  }

  isGreeting(query) {
    const greetings = ["merhaba", "selam", "günaydın", "iyi günler", "iyi akşamlar", "saol", "teşekkür", "nasılsın", "kimsin", "hey", "hello", "hi", "hey", "përshëndetje", "pershendetje", "mirdita"];
    return greetings.some(g => query.includes(g));
  }

  matchesAny(query, keywords) {
    return keywords.some(kw => query.includes(kw));
  }
}
