import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoots = [
  'src/components',
  'src/features',
  'src/layouts',
  'src/pages',
  'src/routes',
].map(directory => path.join(root, directory));
const outputPath = path.join(root, 'src/i18n/dzUiTranslations.js');
const separator = '\n|||||\n';

const translatedAttributes = new Set([
  'alt', 'aria-label', 'caption', 'description', 'emptyMessage', 'helperText',
  'hint', 'label', 'placeholder', 'subtitle', 'text', 'title', 'tooltip',
]);
const translatedObjectKeys = new Set([
  'caption', 'description', 'emptyMessage', 'header', 'hint', 'label',
  'message', 'name', 'subtitle', 'text', 'title', 'tooltip',
]);

const files = [];
const phrases = new Set();

async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (/\.(?:js|jsx)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) files.push(absolute);
  }
}

function likelyUiText(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length < 2 || text.length > 500 || !/[A-Za-z]{2}/.test(text)) return false;
  if (/^(?:https?:|mailto:|\/|\.\/|\.\.\/|[A-Za-z]:\\)/.test(text)) return false;
  if (/^(?:bg|text|border|rounded|flex|grid|items|justify|gap|p[trblxy]?|m[trblxy]?|w|h|min|max|shadow|ring|focus|hover|sm|md|lg|xl|opacity|transition|absolute|relative|fixed|sticky|inset|top|right|bottom|left|z|overflow|object|cursor|leading|tracking|font|space|divide|shrink|grow|basis|col|row)-/.test(text)) return false;
  if (/^[\w./:@-]+\.(?:com|bt|org|net|png|jpe?g|svg|pdf|csv|json|tsx?|jsx?|css|html)$/i.test(text)) return false;
  if (/^[\w./:@-]+$/.test(text) && /[-_/@.]/.test(text) && !text.includes(' ')) return false;
  if (/^(?:GET|POST|PUT|PATCH|DELETE|CRUD|AES-256|%PDF)/.test(text)) return false;
  return true;
}

function add(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (likelyUiText(text)) phrases.add(text);
}

function propertyName(node) {
  return node?.name ?? node?.value ?? null;
}

function visit(node, ancestors = []) {
  if (!node || typeof node !== 'object') return;
  const parent = ancestors.at(-1);
  const jsxExpression = ancestors.some(ancestor => ancestor.type === 'JSXExpressionContainer');

  if (node.type === 'JSXText') add(node.value);
  if (node.type === 'TemplateElement' && jsxExpression) add(node.value?.cooked);
  if (node.type === 'StringLiteral') {
    if (parent?.type === 'JSXAttribute' && translatedAttributes.has(propertyName(parent.name))) add(node.value);
    else if (parent?.type === 'ObjectProperty' && translatedObjectKeys.has(propertyName(parent.key))) add(node.value);
    else if (jsxExpression && !(parent?.type === 'JSXAttribute' && propertyName(parent.name) === 'className')) add(node.value);
  }

  const nextAncestors = [...ancestors, node];
  for (const [key, value] of Object.entries(node)) {
    if (['end', 'extra', 'loc', 'start'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, nextAncestors));
    else if (value && typeof value === 'object') visit(value, nextAncestors);
  }
}

function chunksFor(values, maxCharacters = 3000) {
  const chunks = [];
  let chunk = [];
  let length = 0;
  for (const value of values) {
    const extra = value.length + (chunk.length ? separator.length : 0);
    if (chunk.length && length + extra > maxCharacters) {
      chunks.push(chunk);
      chunk = [];
      length = 0;
    }
    chunk.push(value);
    length += extra;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

async function translateChunk(chunk, attempt = 1) {
  const query = new URLSearchParams({ client: 'gtx', sl: 'en', tl: 'dz', dt: 't', q: chunk.join(separator) });
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`, {
    headers: { 'User-Agent': 'Dzongjuk-i18n-builder/1.0' },
  });
  if (!response.ok) {
    if (attempt < 4) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      return translateChunk(chunk, attempt + 1);
    }
    throw new Error(`Translation request failed with HTTP ${response.status}`);
  }
  const payload = await response.json();
  const translated = payload[0].map(segment => segment[0]).join('');
  const values = translated.split(/\s*\|\|\|\|\|\s*/).map(value => value.trim());
  if (values.length !== chunk.length) {
    throw new Error(`Translation response contained ${values.length} items for a ${chunk.length}-item chunk`);
  }
  return values;
}

await Promise.all(sourceRoots.map(walk));
for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  visit(parse(source, { sourceType: 'module', plugins: ['jsx'] }));
}

const english = [...phrases].sort((left, right) => left.localeCompare(right));
const chunks = chunksFor(english);
const translatedChunks = [];
for (let index = 0; index < chunks.length; index += 4) {
  const batch = chunks.slice(index, index + 4);
  translatedChunks.push(...await Promise.all(batch.map(chunk => translateChunk(chunk))));
  process.stdout.write(`Translated ${Math.min(index + batch.length, chunks.length)}/${chunks.length} chunks\n`);
}

const dzongkha = translatedChunks.flat();
const entries = english.map((source, index) => `  ${JSON.stringify(source)}: ${JSON.stringify(dzongkha[index])},`);
const generated = `/* This file is generated by scripts/generate-ui-translation-map.mjs. */\n`+
  `const dzUiTranslations = Object.freeze({\n${entries.join('\n')}\n});\n\nexport default dzUiTranslations;\n`;
await fs.writeFile(outputPath, generated, 'utf8');
process.stdout.write(`Wrote ${english.length} bundled UI translations to ${path.relative(root, outputPath)}\n`);
