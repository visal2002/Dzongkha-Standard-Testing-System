import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dzUiTranslations from './dzUiTranslations';

const canonicalTranslations = {
  'System Administration': 'རིམ་ལུགས་བདག་སྐྱོང་།',
  'Welcome,': 'དགའ་བསུ་ཞུ།',
  'Live administration data is connected to the staging backend.': 'ཐད་ཀར་བདག་སྐྱོང་གནས་སྡུད་འདི་ ཚོད་བལྟའི་རྒྱབ་ལྗོངས་ལུ་མཐུད་ཡོད།',
  'API: Online': 'API: འབྲེལ་ཐོག',
  'DB: Connected': 'གནས་སྡུད་མཛོད: མཐུད་ཡོད།',
  'NDI: Awaiting credentials': 'NDI: ངོས་སྦྱོར་ལུ་བསྒུག་དོ།',
  'Total Users': 'ལག་ལེན་པ་ཡོངས་བསྡོམས།',
  'System Roles': 'རིམ་ལུགས་ཀྱི་ལས་འགན།',
  'Pending Windows': 'བསྒུག་ཐོག་གི་དུས་ཚོད།',
  'System Status': 'རིམ་ལུགས་གནས་སྟངས།',
  'Security Rating': 'ཉེན་སྲུང་ཚད་རིམ།',
  'Registration': 'ཐོ་བཀོད།',
  'Uptime': 'ལཱ་འབད་བའི་དུས་ཡུན།',
  'Hardened': 'ཉེན་སྲུང་སྒྲིང་སྒྲིང་།',
  'Users by Role': 'ལས་འགན་དབྱེ་བའི་ལག་ལེན་པ།',
  'Distribution across all system roles': 'རིམ་ལུགས་ཀྱི་ལས་འགན་ཆ་མཉམ་ནང་གི་བགོ་བཤའ།',
  'Infrastructure Health': 'གཞི་རྟེན་ཞབས་ཏོག་གནས་སྟངས།',
  'Core services status monitoring': 'གཞི་རྟེན་ཞབས་ཏོག་ཚུའི་གནས་སྟངས་ལྟ་རྟོག',
  'Dashboard': 'ལྟེ་གནས།',
  'Test Taker': 'ཡིག་རྒྱུགས་པ།',
  'Committee Member': 'ཚོགས་ཆུང་འཐུས་མི།',
  'Committee Head': 'ཚོགས་ཆུང་འགོ་འཛིན།',
  'Exam Head': 'ཡིག་རྒྱུགས་འགོ་འཛིན།',
  'DCDD Administrator': 'DCDD བདག་སྐྱོང་པ།',
};

const translations = Object.freeze({ ...dzUiTranslations, ...canonicalTranslations });
const prefixTranslations = Object.entries(translations)
  .filter(([source]) => /[:,—-]$/.test(source) || ['By', 'Welcome,', 'Hello,', 'Good morning,'].includes(source))
  .sort(([left], [right]) => right.length - left.length);
const translatedText = new WeakMap();
const originalText = new WeakMap();
const translatedAttributes = new WeakMap();
const originalAttributes = new WeakMap();
const attributes = ['alt', 'aria-label', 'placeholder', 'title'];

function translateValue(value) {
  const text = String(value ?? '');
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const content = text.slice(leading.length, text.length - trailing.length || undefined);
  if (!content) return text;
  const exact = translations[content];
  if (exact) return `${leading}${exact}${trailing}`;

  for (const [source, translated] of prefixTranslations) {
    if (content === source || content.startsWith(`${source} `)) {
      return `${leading}${translated}${content.slice(source.length)}${trailing}`;
    }
  }
  return text;
}

function localizeTextNode(node, useDzongkha) {
  if (!node.nodeValue?.trim()) return;
  if (!useDzongkha) {
    const original = originalText.get(node);
    if (original !== undefined && node.nodeValue !== original) node.nodeValue = original;
    translatedText.delete(node);
    return;
  }

  const lastTranslation = translatedText.get(node);
  if (node.nodeValue !== lastTranslation) {
    const translatedCurrent = translateValue(node.nodeValue);
    if (translatedCurrent === node.nodeValue) {
      // Explicit i18next content has already arrived in Dzongkha. It is not a
      // bridge-owned translation and must never be restored over the later
      // English render.
      originalText.delete(node);
      translatedText.delete(node);
      return;
    }
    originalText.set(node, node.nodeValue);
  }
  const original = originalText.get(node);
  if (original === undefined) return;
  const translated = translateValue(original);
  translatedText.set(node, translated);
  if (translated !== node.nodeValue) node.nodeValue = translated;
}

function localizeAttributes(element, useDzongkha) {
  let originals = originalAttributes.get(element);
  let lastTranslations = translatedAttributes.get(element);
  if (!originals) {
    originals = {};
    originalAttributes.set(element, originals);
  }
  if (!lastTranslations) {
    lastTranslations = {};
    translatedAttributes.set(element, lastTranslations);
  }

  for (const attribute of attributes) {
    if (!element.hasAttribute?.(attribute)) continue;
    const current = element.getAttribute(attribute);
    if (!useDzongkha) {
      if (originals[attribute] !== undefined && current !== originals[attribute]) {
        element.setAttribute(attribute, originals[attribute]);
      }
      delete lastTranslations[attribute];
      continue;
    }
    if (current !== lastTranslations[attribute]) {
      const translatedCurrent = translateValue(current);
      if (translatedCurrent === current) {
        delete originals[attribute];
        delete lastTranslations[attribute];
        continue;
      }
      originals[attribute] = current;
    }
    if (originals[attribute] === undefined) continue;
    const translated = translateValue(originals[attribute]);
    lastTranslations[attribute] = translated;
    if (translated !== current) element.setAttribute(attribute, translated);
  }
}

function localizeTree(root, useDzongkha) {
  if (root.nodeType === Node.TEXT_NODE) {
    localizeTextNode(root, useDzongkha);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) localizeAttributes(root, useDzongkha);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (parent?.closest?.('[data-no-auto-translate], script, style, code, pre, textarea')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node, useDzongkha);
    else localizeAttributes(node, useDzongkha);
    node = walker.nextNode();
  }
}

/**
 * Localizes legacy page content while feature screens are progressively moved
 * to explicit i18next keys. The dictionary is bundled at build time, so no UI
 * text or user data is sent to a translation provider at runtime.
 */
export default function UiTranslationBridge() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';

  useLayoutEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    const useDzongkha = language.startsWith('dz');
    localizeTree(root, useDzongkha);

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') localizeTextNode(mutation.target, useDzongkha);
        else if (mutation.type === 'attributes') localizeAttributes(mutation.target, useDzongkha);
        else mutation.addedNodes.forEach(node => localizeTree(node, useDzongkha));
      }
    });
    observer.observe(root, {
      attributeFilter: attributes,
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
