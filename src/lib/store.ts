import { create } from 'zustand' is not available, so we use React context instead.
// We'll use a simple React context + state approach.
// This file exports types and helpers.

export interface FilterState {
  city: string;
  venueType: string;
  eventType: string;
  search: string;
}

export const defaultFilters: FilterState = {
  city: '',
  venueType: '',
  eventType: '',
  search: '',
};
