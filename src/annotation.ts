import type { Contract, Finding, Paragraph, ResolvedAnchor } from './types';

export function flattenParagraphs(contract: Contract): Paragraph[] {
  return contract.sections.flatMap((section) => section.paragraphs);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function findQuoteInParagraph(paragraph: Paragraph, quote: string): number | null {
  if (!quote) return null;
  const direct = paragraph.text.indexOf(quote);
  if (direct >= 0) return direct;

  // Lightweight fallback for realistic whitespace/punctuation drift.
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  const target = normalize(quote);
  const source = normalize(paragraph.text);
  const index = source.indexOf(target);
  if (index < 0) return null;

  // Map normalized index back to original text approximately.
  let normalizedCount = 0;
  let originalStart = 0;
  for (let i = 0; i < paragraph.text.length; i += 1) {
    const ch = paragraph.text[i];
    const normalizedChar = /\s/.test(ch) ? ' ' : ch.toLowerCase();
    if (normalizedCount === index) {
      originalStart = i;
      break;
    }
    normalizedCount += normalizedChar.length;
  }
  return originalStart;
}

export function resolveAnchor(finding: Finding, paragraphsById: Map<string, Paragraph>): ResolvedAnchor {
  if (!finding.anchor) {
    return { paragraphId: '', start: 0, end: 0, source: 'document' };
  }

  const anchor = finding.anchor;
  const paragraph = paragraphsById.get(anchor.paragraphId);
  if (!paragraph) {
    return {
      paragraphId: anchor.paragraphId,
      start: 0,
      end: 0,
      endParagraphId: anchor.endParagraphId,
      source: 'unresolved',
      warning: `Paragraph ${anchor.paragraphId} was not found.`,
    };
  }

  const safeStart = clamp(anchor.start, 0, paragraph.text.length);
  const safeEnd = clamp(anchor.end, safeStart, paragraph.text.length);
  const offsetSlice = paragraph.text.slice(safeStart, safeEnd);

  if (anchor.quote && offsetSlice === anchor.quote) {
    return {
      paragraphId: anchor.paragraphId,
      start: safeStart,
      end: safeEnd,
      endParagraphId: anchor.endParagraphId,
      source: 'offset',
    };
  }

  const quoteStart = findQuoteInParagraph(paragraph, anchor.quote);
  if (quoteStart !== null) {
    return {
      paragraphId: anchor.paragraphId,
      start: quoteStart,
      end: Math.min(quoteStart + anchor.quote.length, paragraph.text.length),
      endParagraphId: anchor.endParagraphId,
      source: 'quote',
      warning: 'The supplied character offsets did not match the quote, so the quote was used as a fallback anchor.',
    };
  }

  // Preserve a valid-looking offset rather than hiding a finding completely.
  return {
    paragraphId: anchor.paragraphId,
    start: safeStart,
    end: safeEnd,
    endParagraphId: anchor.endParagraphId,
    source: 'unresolved',
    warning: 'The anchor could not be matched cleanly; the original offsets are shown as a best-effort highlight.',
  };
}

export function buildResolvedAnchors(contract: Contract, findings: Finding[]) {
  const paragraphs = flattenParagraphs(contract);
  const map = new Map(paragraphs.map((paragraph) => [paragraph.id, paragraph]));
  return new Map(findings.map((finding) => [finding.id, resolveAnchor(finding, map)]));
}
