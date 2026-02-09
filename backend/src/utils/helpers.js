/**
 * Utility helper functions
 */

/**
 * Sanitize user input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Format currency
 */
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Paginate results
 */
const paginate = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {};

  if (endIndex < data.length) {
    results.next = { page: page + 1, limit };
  }

  if (startIndex > 0) {
    results.previous = { page: page - 1, limit };
  }

  results.results = data.slice(startIndex, endIndex);
  results.total = data.length;
  results.pages = Math.ceil(data.length / limit);

  return results;
};

/**
 * Generate a unique ID (fallback for UUID)
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Calculate percentage
 */
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Format date
 */
const formatDate = (date, format = 'short') => {
  const options = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    time: { hour: '2-digit', minute: '2-digit' },
  };

  return new Date(date).toLocaleDateString('en-US', options[format] || options.short);
};

/**
 * Parse filters from query string
 */
const parseFilters = (query, allowedFilters = {}) => {
  const filters = {};

  for (const [key, type] of Object.entries(allowedFilters)) {
    if (query[key] !== undefined) {
      switch (type) {
        case 'number':
          filters[key] = parseFloat(query[key]);
          break;
        case 'boolean':
          filters[key] = query[key] === 'true' || query[key] === true;
          break;
        case 'array':
          filters[key] = Array.isArray(query[key]) ? query[key] : query[key].split(',');
          break;
        case 'date':
          filters[key] = new Date(query[key]);
          break;
        default:
          filters[key] = query[key];
      }
    }
  }

  return filters;
};

/**
 * Mask sensitive data (e.g., email, phone)
 */
const maskSensitiveData = (data, fieldsToMask = []) => {
  const masked = { ...data };

  const mask = (str, showFirst = 2, showLast = 2) => {
    if (!str || str.length <= showFirst + showLast) return '***';
    const first = str.substring(0, showFirst);
    const last = str.substring(str.length - showLast);
    const hidden = '*'.repeat(Math.max(str.length - showFirst - showLast, 3));
    return first + hidden + last;
  };

  fieldsToMask.forEach((field) => {
    if (masked[field]) {
      masked[field] = mask(masked[field].toString());
    }
  });

  return masked;
};

/**
 * Validate password strength
 */
const isStrongPassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
};

/**
 * Slugify text (for URLs)
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * Sleep/delay function
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 */
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
};

module.exports = {
  sanitizeInput,
  isValidEmail,
  formatCurrency,
  paginate,
  generateId,
  calculatePercentage,
  formatDate,
  parseFilters,
  maskSensitiveData,
  isStrongPassword,
  slugify,
  sleep,
  retry,
};
