/**
 * Scroll container về đầu với smooth behavior
 * @param {string} selector - CSS selector của container cần scroll
 * @param {number} delay - Delay trước khi scroll (ms)
 */
export const scrollToTop = (selector = '.flex-1.overflow-y-auto', delay = 150) => {
  setTimeout(() => {
    const scrollContainer = document.querySelector(selector);
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, delay);
};

/**
 * Scroll đến element với ID cụ thể
 * @param {string} elementId - ID của element cần scroll đến
 * @param {object} options - Options cho scrollIntoView
 * @param {number} delay - Delay trước khi scroll (ms)
 */
export const scrollToElement = (elementId, options = { behavior: 'smooth', block: 'center' }, delay = 100) => {
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView(options);
    }
  }, delay);
};

