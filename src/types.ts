export type Severity = 'high' | 'medium' | 'low';
export type ReviewStatus = 'unreviewed' | 'accepted' | 'dismissed';

export interface Paragraph {
  id: string;
  number?: string | null;
  text: string;
}

export interface ContractSection {
  id: string;
  number?: number | null;
  heading: string;
  paragraphs: Paragraph[];
}

export interface Contract {
  id: string;
  title: string;
  effectiveDate: string;
  parties: Array<{ name: string; role?: string }>;
  sections: ContractSection[];
}

export interface Anchor {
  paragraphId: string;
  start: number;
  end: number;
  endParagraphId?: string;
  quote: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  explanation: string;
  anchor: Anchor | null;
  suggestedEdit: string | null;
  confidence: number;
}

export interface FindingsPayload {
  documentId: string;
  agent: { name?: string; version?: string; model?: string } | string;
  generatedAt: string;
  findings: Finding[];
}

export interface ReviewRecord {
  status: ReviewStatus;
  comment: string;
}

export type ReviewState = Record<string, ReviewRecord>;

export interface ResolvedAnchor {
  paragraphId: string;
  start: number;
  end: number;
  endParagraphId?: string;
  source: 'offset' | 'quote' | 'unresolved' | 'document';
  warning?: string;
}
