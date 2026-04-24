/**
 * Fixes multi-component files where multiple functions share one `styles` object.
 * Strategy:
 *  1. Convert module-level `const styles = StyleSheet.create({...})`
 *     to `function createStyles() { return StyleSheet.create({...}); }`
 *  2. Add `const { themeKey } = useTheme()` + `const styles = useMemo(createStyles, [themeKey])`
 *     to the MAIN (first export default) component
 *  3. Add `const styles = createStyles()` to every OTHER function that references `styles`
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Files with multiple components sharing one styles object
// Format: [filePath, [list of helper function names that use styles]]
const FILES = [
  ['app/(tabs)/stats.tsx', ['StatCard']],
  ['app/(tabs)/training.tsx', ['SessionCard', 'DeckCard', 'EmptyState']],
  ['app/notifications.tsx', ['NotificationItem', 'EmptyState']],
  ['app/onboarding.tsx', ['SwatchRow']],
  ['app/training/[id].tsx', ['ExerciseStep']],
  ['src/features/monetization/components/premium-gate.tsx', ['PremiumBadge']],
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
  const braceStart = start + match[0].length - 1;
  const braceEnd = findMatchingBrace(code, braceStart);
  if (braceEnd === -1) return null;

  let end = braceEnd + 1;
  if (code[end] === ')') end++;
  if (code[end] === ';') end++;

  return { start, end, block: code.slice(start, end) };
}

function has(code, pattern) {
  return pattern.test(code);
}

/**
 * Find position right after the opening { of the function body for a NAMED function.
 * Handles destructured params: function Foo({ a, b }: Props) {
 */
function findFunctionBodyBrace(code, startFromIdx) {
  let i = startFromIdx;
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
    } else if (ch === '{') {
      return i + 1;
    }
    i++;
  }
  return -1;
}

function transformFile(relPath, helperNames) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP (not found): ${relPath}`);
    return;
  }

  let code = fs.readFileSync(filePath, 'utf8');

  // Skip if already fully transformed
  if (/function createStyles\(\)/.test(code)) {
    console.log(`  SKIP (already transformed): ${relPath}`);
    return;
  }

  const stylesBlock = findModuleLevelStyleSheet(code);
  if (!stylesBlock) {
    console.log(`  SKIP (no module-level styles): ${relPath}`);
    return;
  }

  const themeContextPath = getThemeContextImportPath(filePath);

  // 1. Add useMemo if missing
  if (!has(code, /\buseMemo\b/)) {
    if (has(code, /import \{([^}]+)\}\s*from\s*['"]react['"]/)) {
      code = code.replace(
        /import \{([^}]+)\}\s*from\s*['"]react['"]/,
        (m, imports) => `import { ${imports.trim()}, useMemo } from 'react'`
      );
    } else if (has(code, /import React,\s*\{([^}]+)\}\s*from\s*['"]react['"]/)) {
      code = code.replace(
        /import React,\s*\{([^}]+)\}\s*from\s*['"]react['"]/,
        (m, imports) => `import React, { ${imports.trim()}, useMemo } from 'react'`
      );
    } else {
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

  // 3. Replace module-level StyleSheet.create with a createStyles function
  const stylesBlock2 = findModuleLevelStyleSheet(code);
  if (!stylesBlock2) {
    console.log(`  ERROR: Lost styles block: ${relPath}`);
    return;
  }

  // Extract just the StyleSheet.create({...}) part (without "const styles = " and ";" at end)
  const innerExpr = stylesBlock2.block
    .replace(/^const styles = /, '')
    .replace(/;$/, '');

  // Build the createStyles function
  const createStylesFn = `function createStyles() {\n  return ${innerExpr};\n}`;

  // Replace module-level block with createStyles function
  let beforeBlock = code.slice(0, stylesBlock2.start).replace(/\n\n\n+$/, '\n\n');
  let afterBlock = code.slice(stylesBlock2.end).replace(/^\n\n+/, '\n');
  code = beforeBlock + createStylesFn + afterBlock;

  // 4. In the MAIN (first export default) component, add themeKey + useMemo
  const mainMatch = /export default function \w+/.exec(code);
  if (!mainMatch) {
    console.log(`  ERROR: No export default function found: ${relPath}`);
    return;
  }

  const mainBodyBrace = findFunctionBodyBrace(code, mainMatch.index + mainMatch[0].length);
  if (mainBodyBrace === -1) {
    console.log(`  ERROR: Could not find main function body: ${relPath}`);
    return;
  }

  const indent = '  ';
  const mainInsert = `\n${indent}const { themeKey } = useTheme();\n${indent}const styles = useMemo(createStyles, [themeKey]);`;
  code = code.slice(0, mainBodyBrace) + mainInsert + code.slice(mainBodyBrace);

  // 5. In each HELPER component, add const styles = createStyles()
  for (const helperName of helperNames) {
    // Find the helper function definition
    const helperPattern = new RegExp(`(?:export )?function ${helperName}\\b`);
    const helperMatch = helperPattern.exec(code);
    if (!helperMatch) {
      console.log(`  WARN: Helper function ${helperName} not found in ${relPath}`);
      continue;
    }

    const helperBodyBrace = findFunctionBodyBrace(code, helperMatch.index + helperMatch[0].length);
    if (helperBodyBrace === -1) {
      console.log(`  WARN: Could not find body for ${helperName} in ${relPath}`);
      continue;
    }

    const helperInsert = `\n${indent}const styles = createStyles();`;
    code = code.slice(0, helperBodyBrace) + helperInsert + code.slice(helperBodyBrace);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`  OK: ${relPath}`);
}

console.log('Fixing multi-component files...\n');
FILES.forEach(([f, helpers]) => transformFile(f, helpers));
console.log('\nDone!');
