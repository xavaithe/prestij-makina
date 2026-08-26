/**
 * Prestij Makina - AI Assistant Comprehensive Dataset & Knowledge Base
 * İçerik artık /api/content üzerinden yüklenir.
 * Bu dosya geriye dönük uyumluluk için fallback export sağlar.
 */

export const COMPANY_INFO = {};
export const PRODUCT_CATEGORIES = [];
export const PRODUCTS_DATASET = [];
export const FAQS = [];

export function syncFromContent(content) {
  Object.assign(COMPANY_INFO, content.companyInfo || {});
  PRODUCT_CATEGORIES.length = 0;
  PRODUCT_CATEGORIES.push(...(content.productCategories || []));
  PRODUCTS_DATASET.length = 0;
  PRODUCTS_DATASET.push(...(content.products || []));
  FAQS.length = 0;
  FAQS.push(...(content.faqs || []));
}
