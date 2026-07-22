// ============================================================================
// MLIMS — XSS Sanitization
//
// Sanitizes free-text fields that get rendered later in the frontend to
// prevent stored XSS attacks. Targets fields like:
//   brief_history, final_opinion, findings, review_notes, clinical_notes,
//   message, identifier_address, etc.
//
// Uses HTML entity encoding — replaces dangerous characters with their
// HTML entity equivalents so they render as text, not executable markup.
// ============================================================================

/**
 * HTML-entity-encode dangerous characters to prevent stored XSS.
 * @param {string} str
 * @returns {string} sanitized string
 */
function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Recursively sanitize all string values in an object.
 * Used to sanitize entire request bodies before processing.
 *
 * @param {object} obj — the object to sanitize (mutated in place)
 * @param {string[]} fields — specific field names to sanitize (if empty, sanitize all strings)
 * @returns {object} the same object, with string fields sanitized
 */
function sanitizeFields(obj, fields = []) {
  if (!obj || typeof obj !== 'object') return obj;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      if (fields.length === 0 || fields.includes(key)) {
        obj[key] = sanitizeHtml(value);
      }
    }
  }
  return obj;
}

// Fields that contain user-generated free text and will be rendered in the UI
const FREE_TEXT_FIELDS = [
  'brief_history',
  'final_opinion',
  'findings',
  'diagnosis',
  'review_notes',
  'clinical_notes',
  'message',
  'anatomical_notes',
  'identifier_address',
  'address',
  'immediate_cause',
  'antecedent_cause',
  'contributory',
  'purpose',
];

module.exports = { sanitizeHtml, sanitizeFields, FREE_TEXT_FIELDS };
