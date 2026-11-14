import { request } from './client';
import type { MoonCatalog } from '../types/moon';

// A versioned URL also avoids reusing the previous one-day placeholder roster cache.
export const fetchMoonCatalog = () => request<MoonCatalog>('/moon?version=2');
