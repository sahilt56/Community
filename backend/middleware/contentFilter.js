/**
 * 🛡️ Content Filter Middleware
 * Scans post titles, content, comments, and community names for:
 *  1. Abusive / vulgar words (Hindi + English)
 *  2. Evasion tricks (f*ck, sh!t, etc.)
 *  3. Spam patterns (ALL CAPS, repeated chars, excessive links)
 * 
 * Usage: Add as middleware before any content-creation route.
 * Example: router.post('/create', verifyToken, contentFilter, ...)
 */

const { badWordsList, evasionPatterns } = require('../utils/badWords');

/**
 * Check if text contains any bad words.
 * Returns { found: boolean, word: string|null }
 */
function checkBadWords(text) {
  if (!text) return { found: false, word: null };
  
  const lowerText = text.toLowerCase();
  
  // 1. Check exact word matches (with word boundary awareness)
  for (const word of badWordsList) {
    // Use word boundary regex for accurate matching
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      return { found: true, word };
    }
  }
  
  // 2. Check evasion patterns
  for (const pattern of evasionPatterns) {
    if (pattern.test(text)) {
      // Reset regex lastIndex since we use 'g' flag
      pattern.lastIndex = 0;
      return { found: true, word: '[evasion pattern detected]' };
    }
  }
  
  return { found: false, word: null };
}

/**
 * Detect spam patterns in text.
 * Returns { isSpam: boolean, reason: string|null }
 */
function checkSpam(text) {
  if (!text || text.length < 10) return { isSpam: false, reason: null };
  
  // 1. Excessive ALL CAPS (more than 60% of alphabetic characters are uppercase)
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 10) {
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    const capsRatio = upperCount / letters.length;
    if (capsRatio > 0.6) {
      return { isSpam: true, reason: 'Too much CAPS detected. Please write normally.' };
    }
  }
  
  // 2. Repeated characters (e.g., "aaaaaaa" or "!!!!!!")
  if (/(.)\1{5,}/g.test(text)) {
    return { isSpam: true, reason: 'Repeated characters detected. Please avoid spamming.' };
  }
  
  // 3. Excessive links (more than 3 URLs in one piece of content)
  const urlCount = (text.match(/https?:\/\/[^\s]+/gi) || []).length;
  if (urlCount > 3) {
    return { isSpam: true, reason: 'Too many links detected. Max 3 links per post/comment.' };
  }
  
  return { isSpam: false, reason: null };
}

/**
 * Express Middleware: contentFilter
 * Scans all text fields in the request body.
 */
const contentFilter = (req, res, next) => {
  // Fields to scan
  const fieldsToCheck = ['title', 'content', 'text', 'name', 'description'];
  
  for (const field of fieldsToCheck) {
    const value = req.body[field];
    if (!value || typeof value !== 'string') continue;
    
    // Check for bad words
    const badWordResult = checkBadWords(value);
    if (badWordResult.found) {
      return res.status(400).json({ 
        message: `Your content contains inappropriate language and has been blocked. 🚫`,
        field,
        blocked: true
      });
    }
    
    // Check for spam
    const spamResult = checkSpam(value);
    if (spamResult.isSpam) {
      return res.status(400).json({ 
        message: spamResult.reason,
        field,
        blocked: true
      });
    }
  }
  
  // All clean — proceed!
  next();
};

module.exports = contentFilter;
