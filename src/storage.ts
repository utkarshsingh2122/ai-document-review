import type { ReviewState } from './types';

const STORAGE_KEY = 'northwind-review-state-v1';

export function loadReviewState(): ReviewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReviewState;
  } catch {
    return {};
  }
}

export function saveReviewState(state: ReviewState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearReviewState() {
  localStorage.removeItem(STORAGE_KEY);
}
