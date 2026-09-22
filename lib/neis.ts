import { URLSearchParams } from 'node:url';

export type NeisSchool = {
  officeCode: string;
  officeName: string;
  schoolCode: string;
  schoolName: string;
  schoolLevel: string;
  address?: string;
};

export type NeisLunch = {
  date: string;
  calories: number | null;
  menuItems: string[];
  rawMenu: string;
};

const NEIS_BASE_URL = 'https://open.neis.go.kr/hub';
const NEIS_TYPE_QUERY = 'Type=json';
const NEIS_TIMEOUT_MS = 5_000;
const MAX_CONCURRENT_NEIS_REQUESTS = 6;
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 200;
const cache = new Map<string, { expiresAt: number; value: Record<string, unknown> }>();
const inFlight = new Map<string, Promise<Record<string, unknown>>>();
let activeRequests = 0;
const waiters: Array<() => void> = [];

export class NeisRequestError extends Error {}

function requireApiKey() {
  const apiKey = process.env.NEIS_API_KEY;
  if (!apiKey) throw new NeisRequestError('NEIS is unavailable');
  return apiKey;
}

async function acquireNeisSlot() {
  if (activeRequests >= MAX_CONCURRENT_NEIS_REQUESTS) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  activeRequests += 1;
}

function releaseNeisSlot() {
  activeRequests -= 1;
  waiters.shift()?.();
}

async function fetchNeisJson(endpoint: string, params: Record<string, string>) {
  const apiKey = requireApiKey();
  const searchParams = new URLSearchParams(NEIS_TYPE_QUERY);
  searchParams.set('KEY', apiKey);
  for (const [key, value] of Object.entries(params)) searchParams.set(key, value);
  const cacheKey = `${endpoint}?${searchParams.toString()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    await acquireNeisSlot();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NEIS_TIMEOUT_MS);
    try {
      const response = await fetch(`${NEIS_BASE_URL}/${cacheKey}`, { signal: controller.signal });
      if (!response.ok) throw new NeisRequestError('NEIS is unavailable');
      const payload = await response.json() as Record<string, unknown>;
      if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
      cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: payload });
      return payload;
    } catch (error) {
      if (error instanceof NeisRequestError) throw error;
      throw new NeisRequestError('NEIS is unavailable');
    } finally {
      clearTimeout(timeout);
      releaseNeisSlot();
    }
  })();
  inFlight.set(cacheKey, request);
  try { return await request; } finally { inFlight.delete(cacheKey); }
}

function extractRows(payload: Record<string, unknown>, key: string) {
  const blocks = payload[key];
  if (!Array.isArray(blocks)) return [] as Record<string, string>[];
  const rows: Record<string, string>[] = [];
  for (const block of blocks) {
    if (block && typeof block === 'object' && Array.isArray((block as { row?: unknown[] }).row)) rows.push(...((block as { row: Record<string, string>[] }).row ?? []));
  }
  return rows;
}

export function cleanDishName(rawDish: string) { return rawDish.replace(/\([^)]*\)/g, ' ').replace(/\b\d+(?:\.\d+)*\b/g, ' ').replace(/[!*^@#$%]+/g, ' ').replace(/\s*-\s*[A-Za-z](?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim(); }
function parseCalories(rawCalories: string | undefined) { const matched = rawCalories?.match(/\d+/); return matched ? Number(matched[0]) : null; }
export function isValidNeisDate(value: string) { return /^\d{8}$/.test(value); }
export async function searchSchools(query: string) {
  const trimmed = query.trim(); if (!trimmed) return [] as NeisSchool[];
  const rows = extractRows(await fetchNeisJson('schoolInfo', { pIndex: '1', pSize: '25', SCHUL_NM: trimmed }), 'schoolInfo');
  return rows.map((row) => ({ officeCode: row.ATPT_OFCDC_SC_CODE, officeName: row.ATPT_OFCDC_SC_NM, schoolCode: row.SD_SCHUL_CODE, schoolName: row.SCHUL_NM, schoolLevel: row.SCHUL_KND_SC_NM, address: row.ORG_RDNMA }));
}
export async function fetchSchoolLunch({ officeCode, schoolCode, date }: { officeCode: string; schoolCode: string; date: string }) {
  const row = extractRows(await fetchNeisJson('mealServiceDietInfo', { pIndex: '1', pSize: '10', ATPT_OFCDC_SC_CODE: officeCode, SD_SCHUL_CODE: schoolCode, MMEAL_SC_CODE: '2', MLSV_YMD: date }), 'mealServiceDietInfo')[0];
  if (!row) return null;
  const menuItems = row.DDISH_NM.split(/<br\s*\/?>/i).map((item) => cleanDishName(item)).filter(Boolean);
  return { date, calories: parseCalories(row.CAL_INFO), menuItems, rawMenu: row.DDISH_NM } satisfies NeisLunch;
}
export function __resetNeisCacheForTests() { cache.clear(); inFlight.clear(); activeRequests = 0; waiters.splice(0); }