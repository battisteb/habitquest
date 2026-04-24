/**
 * Transforms all React Native components to use useMemo-wrapped StyleSheet.create
 * so that theme switching updates all colors.
 *
 * Pattern applied to each file:
 * 1. Add useMemo to React imports
 * 2. Add useTheme import from theme-context
 * 3. Add `const { themeKey } = useTheme()` inside the component function
 * 4. Move module-level StyleSheet.create inside component, wrapped in useMemo([themeKey])
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
  // Shared components only (app screens already done)
  'app/(tabs)/social.tsx',
  'app/(tabs)/stats.tsx',
  'app/(tabs)/training.tsx',
  // App screens
  'app/xp-journey.tsx',
  'app/notifications.tsx',
  'app/achievements.tsx',
  'app/weekly-recap.tsx',
  'app/paywall.tsx',
  'app/onboarding.tsx',
  'app/habit/create.tsx',
  'app/habit/[id].tsx',
  'app/habit/archive.tsx',
  'app/habit/edit/[id].tsx',
  'app/habit/history.tsx',
  'app/profile/edit.tsx',
  'app/profile/[userId].tsx',
  'app/duels/index.tsx',
  'app/duels/challenge.tsx',
  'app/duels/battle.tsx',
  'app/settings/contextual-mode.tsx',
  'app/challenge/create.tsx',
  'app/training/[id].tsx',
  'app/training/deck/[id].tsx',
  // Shared components
  'src/features/habits/components/habit-card.tsx',
  'src/features/habits/components/monthly-heatmap.tsx',
  'src/features/habits/components/weekly-chart.tsx',
  'src/features/habits/components/habit-checklist.tsx',
  'src/features/habits/components/habit-timer.tsx',
  'src/features/habits/components/content-picker.tsx',
  'src/features/habits/components/habit-list.tsx',
  'src/features/shop/components/shop-item-card.tsx',
  'src/features/shop/components/rarity-badge.tsx',
  'src/features/gamification/components/achievement-card.tsx',
  'src/features/gamification/components/xp-bar.tsx',
  'src/features/daily-quests/components/daily-quest-card.tsx',
  'src/features/daily-quests/components/daily-quests-section.tsx',
  'src/features/monetization/components/ad-banner.tsx',
  'src/features/monetization/components/premium-gate.tsx',
  'src/features/auth/components/auth-form.tsx',
];

/**
 * Computes the relative path from file to src/ui/theme/theme-context
 */
function getThemeContextImportPath(filePath) {
  const fileDir = path.dirname(filePath);
  const themeContextPath = path.join(ROOT, 'src/ui/theme/theme-context');
  let rel = path.relative(fileDir, themeContextPath).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

/**
 * Find the index of the matching closing brace for an opening brace at `startIdx`
 */
function findMatchingBrace(code, startIdx) {
  let depth = 0;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Find the StyleSheet.create block at module level (not inside a function)
 * Returns { start, end } indices of `const styles = StyleSheet.create({...});`
 * or null if not found.
 */
function findModuleLevelStyleSheet(code) {
  // Find `const styles = StyleSheet.create({`
  const pattern = /^const styles = StyleSheet\.create\(\{/m;
  const match = pattern.exec(code);
  if (!match) return null;

  const start = match.index;
  const braceStart = code.indexOf('{', start + match[0].length - 1);
  if (braceStart === -1) return null;

  const braceEnd = findMatchingBrace(code, braceStart);
  if (braceEnd === -1) return null;

  // End is after `});` or `})`
  let end = braceEnd + 1;
  // skip `)` and `;`
  if (code[end] === ')') end++;
  if (code[end] === ';') end++;

  return { start, end, block: code.slice(start, end) };
}

/**
 * Find the position right after the opening `{` of the main export default function.
 * Returns the index where we should insert `const { themeKey } = useTheme();`
 */
function findInsertionPoint(code) {
  // Look for export default function ... { OR export function ... {
  const exportFnMatch = /export (?:default )?function \w+[^{]*\{/.exec(code);
  if (exportFnMatch) {
    return exportFnMatch.index + exportFnMatch[0].length;
  }
  return -1;
}

/**
 * Check if a string contains a specific pattern
 */
function has(code, pattern) {
  return pattern.test(code);
}

function transformFile(relPath) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP (not found): ${relPath}`);
    return;
  }

  let code = fs.readFileSync(filePath, 'utf8');

  // Check if there's a module-level StyleSheet.create
  const stylesBlock = findModuleLevelStyleSheet(code);
  if (!stylesBlock) {
    console.log(`  SKIP (no module-level styles): ${relPath}`);
    return;
  }

  // Check if already transformed (useMemo wrapping StyleSheet.create inside component)
  if (/useMemo\(\s*\(\s*\)\s*=>\s*StyleSheet\.create/.test(code)) {
    console.log(`  SKIP (already transformed): ${relPath}`);
    return;
  }

  const themeContextPath = getThemeContextImportPath(filePath);

  // 1. Add useMemo to React import if missing
  if (!has(code, /\buseMemo\b/)) {
    // Try to add to existing React import
    if (has(code, /import React,\s*\{([^}]+)\}\s*from\s*['"]react['"]/)) {
      code = code.replace(
        /import React,\s*\{([^}]+)\}\s*from\s*['"]react['"]/,
        (m, imports) => `import React, { ${imports.trim()}, useMemo } from 'react'`
      );
    } else if (has(code, /import \{([^}]+)\}\s*from\s*['"]react['"]/)) {
      code = code.replace(
        /import \{([^}]+)\}\s*from\s*['"]react['"]/,
        (m, imports) => `import { ${imports.trim()}, useMemo } from 'react'`
      );
    } else if (has(code, /import React\s+from\s*['"]react['"]/)) {
      code = code.replace(
        /import React\s+from\s*['"]react['"]/,
        `import React, { useMemo } from 'react'`
      );
    } else {
      // Add new import at the top
      code = `import { useMemo } from 'react';\n` + code;
    }
  }

  // 2. Add useTheme import if missing
  if (!has(code, /useTheme/)) {
    // Add after last import
    const lastImportMatch = [...code.matchAll(/^import .+$/gm)].pop();
    if (lastImportMatch) {
      const insertAt = lastImportMatch.index + lastImportMatch[0].length;
      code = code.slice(0, insertAt) + `\nimport { useTheme } from '${themeContextPath}';` + code.slice(insertAt);
    }
  }

  // 3. Remove module-level StyleSheet.create (re-find after import modifications)
  const stylesBlock2 = findModuleLevelStyleSheet(code);
  if (!stylesBlock2) {
    console.log(`  ERROR: Lost styles block after imports mod: ${relPath}`);
    return;
  }

  // Extract the styles block content (without trailing newlines to re-add cleanly)
  const stylesContent = stylesBlock2.block;
  // Wrap it in useMemo
  const innerExpr = stylesContent.replace(/^const styles = /, '').replace(/;$/, '');
  const memoWrapped = `const styles = useMemo(() => ${innerExpr}, [themeKey]);`;

  // Remove the module-level block (including surrounding whitespace/newlines)
  let beforeBlock = code.slice(0, stylesBlock2.start);
  let afterBlock = code.slice(stylesBlock2.end);
  // Clean up extra blank lines
  beforeBlock = beforeBlock.replace(/\n\n\n+$/, '\n\n');
  afterBlock = afterBlock.replace(/^\n\n+/, '\n');

  code = beforeBlock + afterBlock;

  // 4. Find insertion point inside component function and add themeKey + styles
  const insertIdx = findInsertionPoint(code);
  if (insertIdx === -1) {
    console.log(`  ERROR: Could not find component function: ${relPath}`);
    return;
  }

  // Determine indentation (2 spaces is standard)
  const indent = '  ';

  // Build what to insert
  let toInsert = '';

  // Add useTheme call if not already there
  if (!has(code, /const \{[^}]*themeKey[^}]*\} = useTheme\(\)/)) {
    toInsert += `\n${indent}const { themeKey } = useTheme();`;
  }

  // Add useMemo-wrapped styles
  toInsert += `\n${indent}${memoWrapped}`;

  // Insert after the opening brace of the component function
  // Find the next newline after insertIdx to place nicely
  code = code.slice(0, insertIdx) + toInsert + code.slice(insertIdx);

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`  OK: ${relPath}`);
}

console.log('Transforming files...\n');
FILES.forEach(f => transformFile(f));
console.log('\nDone!');
