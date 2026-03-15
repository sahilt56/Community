/**
 * 🛡️ Bad Words Dictionary — Hindi + English
 * Used by contentFilter middleware to auto-block abusive/vulgar content.
 * 
 * Categories:
 *  1. Hindi abusive words (common gaaliyan)
 *  2. English profanity & slurs
 *  3. Regex patterns for evasion tricks (e.g., f*ck, sh!t)
 */

// Hindi abusive / vulgar words
const hindiBadWords = [
  'madarchod', 'behenchod', 'bhenchod', 'bhosdike', 'bhosdiwale',
  'chutiya', 'chutiye', 'gandu', 'gaandu', 'haramkhor',
  'harami', 'haramzada', 'haramzaadi', 'kutta', 'kutti', 'kuttiya',
  'lodu', 'laude', 'lund', 'laudu', 'lavde',
  'randi', 'raand', 'randwa', 'saala', 'saale', 'saali',
  'tatti', 'ullu', 'gadha', 'bakchod', 'bakchodi',
  'jhant', 'jhantu', 'bsdk', 'mc', 'bc', 'loda',
  'dalla', 'dalal', 'hijra', 'chakka',
  'bhosda', 'bhen ke lode', 'maa ki', 'teri maa',
  'chod', 'chodna', 'chodu', 'betichod',
  // Hinglish shorthand
  'mkc', 'bkl', 'gnd', 'tmkc', 'tmkb',
];

// English profanity & slurs
const englishBadWords = [
  'fuck', 'fucker', 'fucking', 'motherfucker', 'motherfucking',
  'shit', 'shitty', 'bullshit', 'horseshit', 'shithead',
  'ass', 'asshole', 'arsehole', 'dumbass', 'jackass', 'badass',
  'bitch', 'bitchy', 'son of a bitch',
  'bastard', 'damn', 'goddamn',
  'dick', 'dickhead', 'cock', 'cocksucker',
  'cunt', 'twat', 'whore', 'slut', 'hoe',
  'retard', 'retarded',
  'nigger', 'nigga', 'negro', 'spic', 'chink', 'gook',
  'fag', 'faggot', 'dyke',
  'piss', 'pissed', 'crap', 'wanker', 'tosser',
  'stfu', 'gtfo', 'kys',
];

// Combined list (all lowercase)
const badWordsList = [...hindiBadWords, ...englishBadWords];

/**
 * Regex patterns to catch evasion tricks like:
 * f*ck, f**k, fu*k, sh!t, a$$, b!tch, etc.
 */
const evasionPatterns = [
  /f[\*\.\-_!@#]?[u\*\.\-_!@#]?[c\*\.\-_!@#]?k/gi,
  /s[\*\.\-_!@#]?h[\*\.\-_!@#]?[i1!\*][\*\.\-_!@#]?t/gi,
  /b[\*\.\-_!@#]?[i1!\*][\*\.\-_!@#]?t[\*\.\-_!@#]?c[\*\.\-_!@#]?h/gi,
  /(?<![a-z])a[\*\.\-_!@#\$]{2,}(hole)?(?![a-z])/gi,
  /d[\*\.\-_!@#]?[i1!\*][\*\.\-_!@#]?c[\*\.\-_!@#]?k/gi,
  /c[\*\.\-_!@#]?[u\*][\*\.\-_!@#]?n[\*\.\-_!@#]?t/gi,
  /n[\*\.\-_!@#]?[i1!\*][\*\.\-_!@#]?g[\*\.\-_!@#]?g/gi,
];

module.exports = { badWordsList, evasionPatterns };
