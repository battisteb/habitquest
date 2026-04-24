/**
 * Wraps all module-level StyleSheet.create calls in useMemo([themeKey])
 * so that theme switching updates all component colors.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
  // Tab screens (3 already done by agent, but SKIP will handle them)
  'app/(tabs)/today.tsx',
  'app/(tabs)/shop.tsx',
  'app/(tabs)/profile.tsx',
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

function getThemeContextImportPath(filePath) {
  const fileDir = path.dirname(filePath);
  const themeContextPath = path.join(ROOT, 'src/ui/theme/theme-context');
  let rel = path.relative(fileDir, themeContextPath).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

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

function findModuleLevelStyleSheet(code) {
  const pattern = /^const styles = StyleSheet\.create\(\{/m;
  const match = pattern.exec(code);
  if (!match) return null;

  const start = match.index;
  // The opening { is the last char of the match
  const braceStart = start + match[0].length - 1;
  const braceEnd = findMatchingBrace(code, braceStart);
  if (braceEnd === -1) return null;

  let end = braceEnd + 1;
  if (code[end] === ')') end++;
  if (code[end] === ';') end++;

  return { start, end, block: code.slice(start, end) };
}

/**
 * Finds position right after the opening { of the FIRST export function body.
 * Correctly handles destructured params like: export function Foo({ a, b }: Props) {
 */
function findFunctionBodyBrace(code) {
  const exportFnMatch = /export (?:default )?function \w+/.exec(code);
  if (!exportFnMatch) return -1;

  let i = exportFnMatch.index + exportFnMatch[0].length;
  let parenDepth = 0;
  let inParams = false;

  while (i < code.length) {
    const ch = code[i];
    if (ch === '(' && !inParams) {
      inParams = true;
      parenDepth = 1;
    } else if (inParams) {
      if (ch === '(') parenDepth++;
      else if (ch === ')') {
        parenDepth--;
        if (parenDepth === 0) inParams = false;
      }
      // braces inside params are intentionally NOT tracked as function body
    } else if (ch === '{') {
      // Not in params: this is the function body opening brace
      return i + 1;
    }
    i++;
  }
  return -1;
}

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

  // Skip if no module-level StyleSheet.create
  const stylesBlock = findModuleLevelStyleSheet(code);
  if (!stylesBlock) {
    console.log(`  SKIP (no module-level styles): ${relPath}`);
    return;
  }

  // Skip if already transformed
  if (/useMemo\(\s*\(\s*\)\s*=>\s*StyleSheet\.create/.test(code)) {
    console.log(`  SKIP (already transformed): ${relPath}`);
    return;
  }

  const themeContextPath = getThemeContextImportPath(filePath);

  // 1. Add useMemo to React imports if missing
  if (!has(code, /\buseMemo\b/)) {
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
      // Add at top
      code = `import { useMemo } from 'react';\n` + code;
    }
  }

  // 2. Add useTheme import if missing
  if (!has(code, /\buseTheme\b/)) {
    const lastImportMatch = [...code.matchAll(/^import .+from .+$/gm)].pop();
    if (lastImportMatch) {
      const insertAt = lastImportMatch.index + lastImportMatch[0].length;
      code = code.slice(0, insertAt) + `\nimport { useTheme } from '${themeContextPath}';` + code.slice(insertAt);
    }
  }

  // 3. Remove module-level StyleSheet.create (re-find after import changes)
  const stylesBlock2 = findModuleLevelStyleSheet(code);
  if (!stylesBlock2) {
    console.log(`  ERROR: Lost styles block: ${relPath}`);
    return;
  }

  // Build useMemo-wrapped expression (strip "const styles = " prefix and trailing ";")
  const innerExpr = stylesBlock2.block
    .replace(/^const styles = /, '')
    .replace(/;$/, '');
  const memoWrapped = `const styles = useMemo(() => ${innerExpr}, [themeKey]);`;

  // Remove the module-level block
  let beforeBlock = code.slice(0, stylesBlock2.start).replace(/\n\n\n+$/, '\n\n');
  let afterBlock = code.slice(stylesBlock2.end).replace(/^\n\n+/, '\n');
  code = beforeBlock + afterBlock;

  // 4. Find opening { of the first export function body
  const insertIdx = findFunctionBodyBrace(code);
  if (insertIdx === -1) {
    console.log(`  ERROR: Could not find function body: ${relPath}`);
    return;
  }

  // 5. Insert themeKey + memoized styles right inside the function body
  const indent = '  ';
  let toInsert = '';

  if (!has(code, /const \{[^}]*themeKey[^}]*\} = useTheme\(\)/)) {
    toInsert += `\n${indent}const { themeKey } = useTheme();`;
  }
  toInsert += `\n${indent}${memoWrapped}`;

  code = code.slice(0, insertIdx) + toInsert + code.slice(insertIdx);

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`  OK: ${relPath}`);
}

console.log('Transforming files for reactive theme styles...\n');
FILES.forEach(f => transformFile(f));
console.log('\nDone!');
