import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, ClipboardCheck, Download, FileText, Filter, Flag, Info, Keyboard,
  MessageSquare, Minus, MoreHorizontal, PanelLeft, PanelRight, RefreshCcw, Search,
  ShieldAlert, Sparkles, X, XCircle, Zap,
} from 'lucide-react';
import { loadReviewData } from './data';
import { buildResolvedAnchors, flattenParagraphs } from './annotation';
import { clearReviewState, loadReviewState, saveReviewState } from './storage';
import type { Contract, Finding, FindingsPayload, ReviewState, ReviewStatus, ResolvedAnchor } from './types';
import './styles.css';

const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
const statusLabels: Record<ReviewStatus, string> = { unreviewed: 'Open', accepted: 'Accepted', dismissed: 'Dismissed' };

function severityLabel(value: string) { return value[0].toUpperCase() + value.slice(1); }

function App() {
  const [contract, setContract] = useState<Contract | null>(null);
  const [payload, setPayload] = useState<FindingsPayload | null>(null);
  const [review, setReview] = useState<ReviewState>(() => loadReviewState());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [severity, setSeverity] = useState('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'severity' | 'confidence' | 'status'>('severity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [documentOverrides, setDocumentOverrides] = useState<Record<string, string>>({});
  const [appliedEdits, setAppliedEdits] = useState<Record<string, boolean>>({});
  const documentRefs = useRef<Record<string, HTMLElement | null>>({});

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await loadReviewData();
      setContract(data.contract); setPayload(data.findings);
      setSelectedId((current) => current ?? data.findings.findings[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load the review.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { saveReviewState(review); }, [review]);

  const findings = payload?.findings ?? [];
  const selected = findings.find((f) => f.id === selectedId) ?? null;
  const resolvedAnchors = useMemo(() => contract ? buildResolvedAnchors(contract, findings) : new Map<string, ResolvedAnchor>(), [contract, findings]);
  const paragraphs = useMemo(() => contract ? flattenParagraphs(contract) : [], [contract]);
  const paragraphMap = useMemo(() => new Map(paragraphs.map((p) => [p.id, p])), [paragraphs]);
  const categories = useMemo(() => Array.from(new Set(findings.map((f) => f.category))).sort(), [findings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings
      .filter((f) => severity === 'all' || f.severity === severity)
      .filter((f) => category === 'all' || f.category === category)
      .filter((f) => status === 'all' || (review[f.id]?.status ?? 'unreviewed') === status)
      .filter((f) => !q || [f.id, f.title, f.category, f.explanation].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sort === 'confidence') return b.confidence - a.confidence;
        if (sort === 'status') return (review[a.id]?.status ?? 'unreviewed').localeCompare(review[b.id]?.status ?? 'unreviewed');
        return severityOrder[a.severity] - severityOrder[b.severity] || a.id.localeCompare(b.id);
      });
  }, [findings, severity, category, status, query, review, sort]);

  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0, accepted: 0, dismissed: 0, open: 0 };
    findings.forEach((f) => { c[f.severity] += 1; const s = review[f.id]?.status ?? 'unreviewed'; if (s === 'accepted') c.accepted += 1; else if (s === 'dismissed') c.dismissed += 1; else c.open += 1; });
    return c;
  }, [findings, review]);
  const completed = counts.accepted + counts.dismissed;
  const progress = findings.length ? Math.round((completed / findings.length) * 100) : 0;

  useEffect(() => {
    if (selected && !filtered.some((f) => f.id === selected.id) && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selected]);

  useEffect(() => {
    setCommentDraft(selected ? review[selected.id]?.comment ?? '' : '');
  }, [selectedId, review, selected]);

  const focusFinding = (id: string) => {
    setSelectedId(id);
    const anchor = resolvedAnchors.get(id);
    if (anchor?.paragraphId) {
      requestAnimationFrame(() => documentRefs.current[anchor.paragraphId]?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  };

  const setStatusForFinding = (id: string, next: ReviewStatus) => {
    setReview((current) => ({ ...current, [id]: { status: next, comment: current[id]?.comment ?? '' } }));
  };

  const saveComment = () => {
    if (!selected) return;
    setReview((current) => ({ ...current, [selected.id]: { status: current[selected.id]?.status ?? 'unreviewed', comment: commentDraft } }));
  };

  const jump = (direction: 1 | -1) => {
    if (!filtered.length) return;
    const index = Math.max(0, filtered.findIndex((f) => f.id === selectedId));
    const next = filtered[(index + direction + filtered.length) % filtered.length];
    focusFinding(next.id);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === 'TEXTAREA' || (event.target as HTMLElement)?.tagName === 'INPUT') return;
      if (event.key === 'j') { event.preventDefault(); jump(1); }
      if (event.key === 'k') { event.preventDefault(); jump(-1); }
      if (event.key === 'a' && selected) { event.preventDefault(); setStatusForFinding(selected.id, 'accepted'); }
      if (event.key === 'd' && selected) { event.preventDefault(); setStatusForFinding(selected.id, 'dismissed'); }
      if (event.key === '?') setShowShortcuts(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const applySuggestedEdit = (finding: Finding) => {
    if (!finding.suggestedEdit || !finding.anchor) return;
    const anchor = resolvedAnchors.get(finding.id);
    if (!anchor || anchor.source === 'document' || anchor.source === 'unresolved') return;
    const startParagraph = paragraphMap.get(anchor.paragraphId);
    if (!startParagraph) return;
    const startText = documentOverrides[startParagraph.id] ?? startParagraph.text;
    if (!anchor.endParagraphId || anchor.endParagraphId === anchor.paragraphId) {
      const nextText = startText.slice(0, anchor.start) + finding.suggestedEdit + startText.slice(anchor.end);
      setDocumentOverrides((current) => ({ ...current, [startParagraph.id]: nextText }));
    } else {
      const endParagraph = paragraphMap.get(anchor.endParagraphId);
      if (!endParagraph) return;
      const endText = documentOverrides[endParagraph.id] ?? endParagraph.text;
      const nextStart = startText.slice(0, anchor.start) + finding.suggestedEdit;
      const nextEnd = endText.slice(anchor.end);
      setDocumentOverrides((current) => ({ ...current, [startParagraph.id]: nextStart, [endParagraph.id]: nextEnd }));
    }
    setAppliedEdits((current) => ({ ...current, [finding.id]: true }));
  };

  const exportReview = () => {
    const output = findings.map((f) => ({ ...f, review: review[f.id] ?? { status: 'unreviewed', comment: '' }, suggestedEditApplied: Boolean(appliedEdits[f.id]) }));
    const blob = new Blob([JSON.stringify({ document: contract, generatedAt: payload?.generatedAt, findings: output }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'northwind-review-export.json'; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading-screen"><div className="loader-orbit"><Sparkles size={22} /></div><strong>Loading AI review workspace</strong><span>Preparing contract annotations…</span></div>;
  if (error || !contract || !payload) return <div className="loading-screen error-state"><AlertTriangle size={32} /><strong>Couldn’t load the review</strong><span>{error}</span><button className="button primary" onClick={() => void load()}><RefreshCcw size={16}/> Retry</button></div>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><ShieldAlert size={19}/></div><div><strong>Northwind</strong><span>AI Review Workspace</span></div></div>
        <div className="doc-head"><FileText size={17}/><div><strong>{contract.title}</strong><span>{contract.id} · Effective {contract.effectiveDate}</span></div></div>
        <div className="top-actions"><button className="icon-button" title="Toggle findings panel" onClick={() => setShowLeft((v) => !v)}><PanelLeft size={18}/></button><button className="icon-button" title="Toggle details panel" onClick={() => setShowRight((v) => !v)}><PanelRight size={18}/></button><button className="icon-button" title="Keyboard shortcuts" onClick={() => setShowShortcuts(true)}><Keyboard size={18}/></button><button className="button secondary" onClick={exportReview}><Download size={15}/> Export</button></div>
      </header>

      <section className="summary-strip">
        <div className="risk-summary"><div className="risk-ring"><span>{counts.high}</span><small>high</small></div><div><strong>Review risk profile</strong><span>{findings.length} AI findings across {contract.sections.length} sections</span></div></div>
        <div className="metric"><span>High</span><strong className="high-text">{counts.high}</strong></div><div className="metric"><span>Medium</span><strong className="medium-text">{counts.medium}</strong></div><div className="metric"><span>Low</span><strong className="low-text">{counts.low}</strong></div>
        <div className="progress-block"><div><span>Review progress</span><strong>{completed}/{findings.length}</strong></div><div className="progress-track"><div style={{width: `${progress}%`}}/></div></div>
        <button className="summary-button" onClick={() => setShowSummary(true)}><ClipboardCheck size={17}/> Summary</button>
      </section>

      <main className={`workspace ${!showLeft ? 'left-hidden' : ''} ${!showRight ? 'right-hidden' : ''}`}>
        {showLeft && <aside className="findings-panel panel">
          <div className="panel-header"><div><strong>Findings</strong><span>{filtered.length} shown · {counts.open} open</span></div><button className="icon-button small"><MoreHorizontal size={17}/></button></div>
          <div className="search-wrap"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search findings…"/><kbd>/</kbd></div>
          <div className="filters"><div className="filter-row"><select value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="all">All severity</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All status</option><option value="unreviewed">Open</option><option value="accepted">Accepted</option><option value="dismissed">Dismissed</option></select></div><div className="filter-row"><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select><select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="severity">Sort: severity</option><option value="confidence">Sort: confidence</option><option value="status">Sort: status</option></select></div></div>
          <div className="finding-list">{filtered.map((finding) => <FindingRow key={finding.id} finding={finding} active={finding.id === selectedId} review={review[finding.id]} onClick={() => focusFinding(finding.id)} />)}{filtered.length === 0 && <div className="empty-state"><Filter size={22}/><strong>No findings match</strong><span>Try clearing a filter or search.</span></div>}</div>
          <div className="panel-footer"><button className="text-button" onClick={() => { setSeverity('all'); setCategory('all'); setStatus('all'); setQuery(''); }}>Clear filters</button><span><Keyboard size={13}/> J/K navigate · A/D action</span></div>
        </aside>}

        <section className="document-panel panel">
          <div className="document-toolbar"><div className="toolbar-left"><button className="icon-button small"><ChevronDown size={16}/></button><strong>Document</strong><span className="muted">Original text</span></div><div className="toolbar-right"><span className="anchor-status"><span className="dot"/>Annotations live</span><button className="icon-button small" title="Help"><CircleHelp size={17}/></button></div></div>
          <div className="document-scroll">
            <div className="paper">
              <div className="paper-cover"><div className="eyebrow">MASTER SERVICES AGREEMENT</div><h1>{contract.title}</h1><p>Between <strong>Northwind Analytics, Inc.</strong> and <strong>Brightline Data Solutions LLC</strong></p><div className="cover-meta"><span>Effective date <strong>{contract.effectiveDate}</strong></span><span>AI review <strong>{findings.length} findings</strong></span></div></div>
              {contract.sections.map((section) => <section className="contract-section" key={section.id}><div className="section-heading"><span>{section.number ? String(section.number).padStart(2, '0') : '—'}</span><h2>{section.heading}</h2></div>{section.paragraphs.map((p) => <ParagraphView key={p.id} paragraph={{ ...p, text: documentOverrides[p.id] ?? p.text }} findings={findings} resolvedAnchors={resolvedAnchors} selectedId={selectedId} onFindingClick={focusFinding} register={(el) => { documentRefs.current[p.id] = el; }} />)}</section>)}
              <div className="paper-end">— End of agreement —</div>
            </div>
          </div>
        </section>

        {showRight && <aside className="details-panel panel">
          {!selected ? <div className="details-empty"><Sparkles size={26}/><strong>Select a finding</strong><span>Choose an issue from the left to inspect its context, rationale and suggested edit.</span></div> : <>
            <div className="details-head"><div><span className={`severity-pill ${selected.severity}`}>{selected.severity === 'high' ? <Flag size={13}/> : <Zap size={13}/>} {severityLabel(selected.severity)}</span><span className="finding-id">{selected.id}</span></div><button className="icon-button small" onClick={() => setSelectedId(null)}><X size={17}/></button></div>
            <div className="details-scroll">
              <h2>{selected.title}</h2><div className="category-line"><span>{selected.category}</span><span>•</span><span>AI confidence {Math.round(selected.confidence * 100)}%</span></div>
              <div className="confidence-bar"><div style={{width: `${selected.confidence * 100}%`}}/></div>
              <DetailSection title="Why this matters"><p>{selected.explanation}</p></DetailSection>
              <DetailSection title="Referenced text"><div className="quote-box">“{selected.anchor?.quote ?? 'This finding applies to the document as a whole.'}”</div>{resolvedAnchors.get(selected.id)?.warning && <div className="warning-note"><AlertTriangle size={14}/>{resolvedAnchors.get(selected.id)?.warning}</div>}</DetailSection>
              {selected.suggestedEdit && <DetailSection title="Suggested edit"><div className="diff-card"><div className="diff-label remove">Current</div><p>{selected.anchor?.quote ?? 'No anchored text'}</p><div className="diff-label add">Suggested</div><p>{selected.suggestedEdit}</p></div><div className="suggested-actions"><button className="button secondary" onClick={() => navigator.clipboard?.writeText(selected.suggestedEdit ?? '')}><ClipboardCheck size={15}/> Copy</button><button className="button primary" disabled={Boolean(appliedEdits[selected.id])} onClick={() => applySuggestedEdit(selected)}><Check size={15}/> {appliedEdits[selected.id] ? 'Applied' : 'Apply to document'}</button></div></DetailSection>}
              <DetailSection title="Reviewer decision"><div className="decision-grid"><button className={`decision accepted ${review[selected.id]?.status === 'accepted' ? 'active' : ''}`} onClick={() => setStatusForFinding(selected.id, 'accepted')}><CheckCircle2 size={17}/><span>Accept</span></button><button className={`decision dismissed ${review[selected.id]?.status === 'dismissed' ? 'active' : ''}`} onClick={() => setStatusForFinding(selected.id, 'dismissed')}><XCircle size={17}/><span>Dismiss</span></button></div></DetailSection>
              <DetailSection title="Reviewer note"><textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Add context for your decision…"/><button className="button primary full" onClick={saveComment}><MessageSquare size={15}/> Save note</button></DetailSection>
              <div className="details-nav"><button className="button secondary" onClick={() => jump(-1)}><ArrowUp size={15}/> Previous</button><button className="button secondary" onClick={() => jump(1)}>Next <ArrowDown size={15}/></button></div>
            </div>
          </>}
        </aside>}
      </main>

      {showSummary && <Modal title="Review summary" onClose={() => setShowSummary(false)}><div className="summary-modal"><div className="summary-big"><strong>{progress}%</strong><span>complete</span></div><div className="summary-grid"><SummaryCard label="High risk" value={counts.high}/><SummaryCard label="Medium risk" value={counts.medium}/><SummaryCard label="Low risk" value={counts.low}/><SummaryCard label="Accepted" value={counts.accepted}/><SummaryCard label="Dismissed" value={counts.dismissed}/><SummaryCard label="Still open" value={counts.open}/></div><div className="summary-actions"><button className="button secondary" onClick={exportReview}><Download size={15}/> Export JSON</button><button className="button danger" onClick={() => { clearReviewState(); setReview({}); }}>Reset review state</button></div></div></Modal>}
      {showShortcuts && <Modal title="Keyboard shortcuts" onClose={() => setShowShortcuts(false)}><div className="shortcut-list"><Shortcut keys="J / K" text="Next / previous finding"/><Shortcut keys="A" text="Accept selected finding"/><Shortcut keys="D" text="Dismiss selected finding"/><Shortcut keys="?" text="Open this shortcut panel"/><Shortcut keys="/" text="Focus search field (browser shortcut)"/></div></Modal>}
    </div>
  );
}

function FindingRow({ finding, active, review, onClick }: { finding: Finding; active: boolean; review?: { status: ReviewStatus; comment: string }; onClick: () => void }) {
  const state = review?.status ?? 'unreviewed';
  return <button className={`finding-row ${active ? 'active' : ''}`} onClick={onClick}><span className={`severity-dot ${finding.severity}`}/><div className="finding-row-main"><div className="finding-row-top"><span>{finding.id}</span><span className={`status-mini ${state}`}>{statusLabels[state]}</span></div><strong>{finding.title}</strong><div className="finding-row-meta"><span>{finding.category}</span><span>•</span><span>{Math.round(finding.confidence * 100)}%</span>{review?.comment && <MessageSquare size={12}/>}</div></div><ChevronRight size={16} className="row-chevron"/></button>;
}

function ParagraphView({ paragraph, findings, resolvedAnchors, selectedId, onFindingClick, register }: { paragraph: { id: string; number?: string | null; text: string }; findings: Finding[]; resolvedAnchors: Map<string, ResolvedAnchor>; selectedId: string | null; onFindingClick: (id: string) => void; register: (el: HTMLElement | null) => void }) {
  const ranges = findings.flatMap((finding) => {
    const anchor = resolvedAnchors.get(finding.id);
    if (!anchor || anchor.source === 'document') return [];
    if (anchor.paragraphId === paragraph.id) {
      const isCrossParagraph = anchor.endParagraphId && anchor.endParagraphId !== paragraph.id;
      const end = isCrossParagraph ? paragraph.text.length : anchor.end;
      return [{ start: Math.max(0, anchor.start), end: Math.min(paragraph.text.length, end), finding }];
    }
    if (anchor.endParagraphId === paragraph.id) {
      return [{ start: 0, end: Math.min(paragraph.text.length, anchor.end), finding }];
    }
    return [];
  }).filter((r) => r.end > r.start);

  const boundaries = Array.from(new Set([0, paragraph.text.length, ...ranges.flatMap((r) => [r.start, r.end])])).sort((a, b) => a - b);
  const segments = boundaries.slice(0, -1).map((start, i) => {
    const end = boundaries[i + 1];
    const owners = ranges.filter((r) => r.start < end && r.end > start).map((r) => r.finding);
    return { start, end, owners };
  });

  return <p className="contract-paragraph" ref={register}><span className="para-number">{paragraph.number}</span><span className="para-text">{segments.map((seg, index) => {
    const content = paragraph.text.slice(seg.start, seg.end);
    if (!seg.owners.length) return <React.Fragment key={`${paragraph.id}-${index}`}>{content}</React.Fragment>;
    const active = seg.owners.some((f) => f.id === selectedId);
    return <mark key={`${paragraph.id}-${index}`} className={`annotation ${active ? 'selected' : ''} overlap-${Math.min(seg.owners.length, 3)}`} onClick={() => onFindingClick(seg.owners.find((f) => f.id === selectedId)?.id ?? seg.owners[0].id)} title={seg.owners.map((f) => `${f.id}: ${f.title}`).join('\n')}>{content}<span className="annotation-pin">{seg.owners.length > 1 ? seg.owners.length : '•'}</span></mark>;
  })}</span></p>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="detail-section"><h3>{title}</h3>{children}</section>; }
function SummaryCard({ label, value }: { label: string; value: number }) { return <div className="summary-card"><span>{label}</span><strong>{value}</strong></div>; }
function Shortcut({ keys, text }: { keys: string; text: string }) { return <div className="shortcut"><kbd>{keys}</kbd><span>{text}</span></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{children}</div></div>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
