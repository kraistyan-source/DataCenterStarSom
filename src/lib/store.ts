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
