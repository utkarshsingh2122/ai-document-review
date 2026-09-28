import { describe, expect, it } from 'vitest';
import { resolveAnchor } from './annotation';
import type { Finding, Paragraph } from './types';

const paragraph: Paragraph = { id: 'p-1', number: '1.1', text: 'Alpha beta gamma delta.' };

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'f-test', severity: 'medium', category: 'Test', title: 'Test', explanation: '',
    anchor: { paragraphId: 'p-1', start: 6, end: 10, quote: 'beta' },
    suggestedEdit: null, confidence: 0.9, ...overrides,
  };
}

describe('resolveAnchor', () => {
  it('uses valid offsets when the quote matches', () => {
    const result = resolveAnchor(finding({}), new Map([['p-1', paragraph]]));
    expect(result.source).toBe('offset');
    expect(result.start).toBe(6);
    expect(result.end).toBe(10);
  });

  it('falls back to the quote when offsets are stale', () => {
    const result = resolveAnchor(finding({ anchor: { paragraphId: 'p-1', start: 0, end: 4, quote: 'beta' } }), new Map([['p-1', paragraph]]));
    expect(result.source).toBe('quote');
    expect(result.start).toBe(6);
  });

  it('marks document-level findings', () => {
    const result = resolveAnchor(finding({ anchor: null }), new Map([['p-1', paragraph]]));
    expect(result.source).toBe('document');
  });

  it('marks missing paragraphs as unresolved', () => {
    const result = resolveAnchor(finding({}), new Map());
    expect(result.source).toBe('unresolved');
  });
});
