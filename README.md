# Northwind AI Document Review

A polished React + TypeScript take-home implementation for the AI Document Review assignment.

## Included

- Contract rendered as readable document pages rather than a data table.
- 24 supplied AI findings loaded from the provided JSON fixtures.
- Severity/category/status/search filters and sorting.
- Two-way finding ↔ document navigation.
- Character-offset annotations with quote fallback when offsets are stale.
- Cross-paragraph anchors (the supplied data includes one).
- Overlapping annotation rendering.
- Document-level findings (`anchor: null`).
- Accept / dismiss / reviewer comments.
- Persistent review state with `localStorage`.
- Progress tracking and review summary.
- Suggested-edit current-vs-suggested diff presentation.
- Apply suggested edits to the in-memory document (including cross-paragraph anchors).
- Copy suggested edit to clipboard.
- JSON review export.
- Keyboard navigation: `J` / `K`, `A`, `D`, `?`.
- Loading/error/empty states.
- Responsive panel toggles.
- Unit tests for annotation resolution.

## Requirements

- Node.js 20+ recommended (Node 22 tested).
- npm 10+.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally:

`http://localhost:5173`

## Production build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

## Data

The original assignment fixtures are preserved without modification in:

- `public/sample-contract.json`
- `public/findings.json`

The app loads them at runtime. No backend is required.

## Key implementation decisions

### 1. Three-panel review workspace

The left panel optimizes finding triage, the center preserves document context, and the right panel handles the selected finding and reviewer action. This minimizes context switching and makes the two-way relationship visible.

### 2. Anchor resolution is defensive

The assignment says the data is realistic and not perfectly clean. The app first validates the supplied offsets against the supplied quote. If they do not match, it searches for the quote in the paragraph and falls back to the original clamped offsets if needed. A warning is shown instead of silently hiding the finding.

### 3. Cross-paragraph and overlap support

An anchor can start in one paragraph and end in another. The first paragraph is highlighted through its end; the ending paragraph can be highlighted from its beginning through the specified end. Overlapping ranges are split into renderable segments so multiple findings can share the same text without one annotation disappearing.

### 4. Local-first review state

No backend is required by the assignment. Decisions/comments are kept in React state and persisted to localStorage so a refresh does not lose review progress.

### 5. Focused optional features

The optional features selected were inline suggested-edit presentation, keyboard review, summary/export, and defensive performance-friendly rendering. A real LLM and backend were intentionally not added because the assignment explicitly says the AI findings are already supplied and no backend is required.

## Trade-offs / what I would add with more time

- Virtualized rendering for contracts with thousands of paragraphs.
- A richer diff editor with apply/revert history.
- URL-addressable finding state for collaboration.
- Backend persistence with audit history and reviewer identity.
- Automated browser tests for the full review workflow.
- Better fuzzy matching for severely corrupted anchors.
- Accessibility audit with screen-reader announcements for selected annotations.

## Deployment

This is a static Vite application and can be deployed to Vercel, Netlify, Cloudflare Pages, GitHub Pages (with the appropriate base path), or any static host.

For Vercel/Netlify, use:

- Build command: `npm run build`
- Output directory: `dist`

## Manual acceptance checklist

1. Load the app and confirm 24 findings appear.
2. Click a finding; the document scrolls to its anchor and the right panel opens.
3. Click a highlighted annotation; the corresponding finding becomes selected.
4. Filter by High severity and verify the list changes.
5. Filter by Accepted after accepting a finding.
6. Add a reviewer note, refresh the browser, and confirm it persists.
7. Test Accept and Dismiss from the right panel.
8. Test J/K and A/D keyboard shortcuts outside text inputs.
9. Open Review Summary and confirm counts/progress update.
10. Export JSON and inspect the downloaded review state.
11. Open finding `f-02` and verify the cross-paragraph reference is represented and a clean warning/fallback state is available.
12. Open finding `f-09` and verify a document-level finding can be reviewed without an anchor.
13. Open a finding with a suggested edit, use **Apply to document**, and confirm the document text changes.
14. Inspect `p-6.2` findings `f-04` and `f-05` to verify overlapping annotations remain visible.

