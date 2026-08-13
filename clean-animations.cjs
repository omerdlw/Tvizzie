const fs = require('fs');

const files = [
  '/Users/omerdlw/Documents/Tvizzie/app/(auth)/sign-in/client.js',
  '/Users/omerdlw/Documents/Tvizzie/app/(auth)/sign-up/client.js',
  '/Users/omerdlw/Documents/Tvizzie/app/(legal)/privacy/client.js',
  '/Users/omerdlw/Documents/Tvizzie/app/(legal)/terms/client.js',
  '/Users/omerdlw/Documents/Tvizzie/domains/auth/ui/components/oauth-provider-list.js',
  '/Users/omerdlw/Documents/Tvizzie/domains/auth/ui/nav-surfaces/verification-surface.js',
  '/Users/omerdlw/Documents/Tvizzie/domains/legal/ui/components/legal-quick-links.js',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Remove framer-motion imports
  content = content.replace(/import\s*\{\s*[^}]*\s*\}\s*from\s*['"]framer-motion['"];?\n?/g, '');
  content = content.replace(/import\s*motion\s*from\s*['"]framer-motion['"];?\n?/g, '');

  // Remove variants imports from @/app/.../motion
  content = content.replace(
    /import\s*\{[^}]*\}\s*from\s*['"]@\/app\/\(auth\)\/motion['"];?\n?/g,
    '',
  );
  content = content.replace(
    /import\s*\{[^}]*\}\s*from\s*['"]@\/app\/\(legal\)\/motion['"];?\n?/g,
    '',
  );

  // Convert <motion.div to <div, </motion.div to </div
  content = content.replace(
    /<\/?motion\.([a-zA-Z0-9]+)/g,
    (match, tag) => `<${match.startsWith('</') ? '/' : ''}${tag}`,
  );

  // Remove AnimatePresence wrapper
  content = content.replace(/<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/g, '$1');
  // Just in case
  content = content.replace(/<AnimatePresence[^>]*>\n?/g, '');
  content = content.replace(/<\/AnimatePresence>\n?/g, '');

  // Remove animation props
  const propRegex =
    /\s+(?:initial|animate|exit|variants|custom|whileHover|whileTap|whileInView|whileFocus|whileDrag|layout|layoutId|transition|containerVariants|itemDelay|itemVariants)(?:=(?:{(?:[^{}]*|{[^{}]*})*}|"[^"]*"|'[^']*'|[^>\s]+))?/g;
  content = content.replace(propRegex, '');

  // Specific keys used only for AnimatePresence
  content = content.replace(/\s+key="reset-mode-form"/g, '');
  content = content.replace(/\s+key="sign-in-form"/g, '');
  content = content.replace(/\s+key=\{currentStep\}/g, '');

  // Clean up tailwind classes
  const tailwindClasses = [
    'transition-all',
    'transition-colors',
    'transition-opacity',
    'transition-transform',
    'transition-shadow',
    'transition',
    /duration-\d+/,
    /ease-[a-z-]+/,
    /animate-[a-z-]+/,
    /delay-\d+/,
  ];

  for (const twClass of tailwindClasses) {
    if (typeof twClass === 'string') {
      const twRegex = new RegExp(`\\b${twClass}\\b\\s*`, 'g');
      content = content.replace(twRegex, '');
    } else {
      const twRegex = new RegExp(`\\b${twClass.source}\\b\\s*`, 'g');
      content = content.replace(twRegex, '');
    }
  }

  // Remove SIGN_IN_TIMELINE. etc if passed as props that were not caught
  // Actually, wait, `custom={SIGN_IN_TIMELINE.RESET_TITLE_DELAY}` is handled by `custom=...` propRegex.
  // What if it is passed in the array but the import is removed?
  // We removed the import, so any usage of SIGN_IN_TIMELINE should be removed, but it's inside `custom={...}` which is removed.

  // Clean empty className strings and trailing spaces in className
  content = content.replace(/className=(['"`])\s*\1/g, '');
  content = content.replace(/className=(['"`])\s+/g, 'className=$1');

  fs.writeFileSync(file, content);
}
console.log('Done!');
