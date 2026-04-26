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

function requireApiKey() {
  const apiKey = process.env.NEIS_API_KEY;
  if (!apiKey) {
    throw new Error('NEIS_API_KEY is not configured');
  }
  return apiKey;
}

async function fetchNeisJson(endpoint: string, params: Record<string, string>) {
  const apiKey = requireApiKey();
  const searchParams = new URLSearchParams(NEIS_TYPE_QUERY);
  searchParams.set('KEY', apiKey);

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }

  const response = await fetch(`${NEIS_BASE_URL}/${endpoint}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`NEIS request failed: ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function extractRows(payload: Record<string, unknown>, key: string) {
  const blocks = payload[key];
  if (!Array.isArray(blocks)) return [] as Record<string, string>[];

  const rows: Record<string, string>[] = [];
  for (const block of blocks) {
    if (block && typeof block === 'object' && Array.isArray((block as { row?: unknown[] }).row)) {
      rows.push(...((block as { row: Record<string, string>[] }).row ?? []));
    }
  }
  return rows;
}

export function cleanDishName(rawDish: string) {
  return rawDish
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(?:\.\d+)*\b/g, ' ')
    .replace(/[!*^@#$%]+/g, ' ')
    .replace(/\s*-\s*[A-Za-z](?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCalories(rawCalories: string | undefined) {
  if (!rawCalories) return null;
  const matched = rawCalories.match(/\d+/);
  return matched ? Number(matched[0]) : null;
}

export function isValidNeisDate(value: string) {
  return /^\d{8}$/.test(value);
}

export async function searchSchools(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [] as NeisSchool[];

  const payload = await fetchNeisJson('schoolInfo', {
    pIndex: '1',
    pSize: '25',
    SCHUL_NM: trimmed,
  });

  const rows = extractRows(payload, 'schoolInfo');
  return rows.map((row) => ({
    officeCode: row.ATPT_OFCDC_SC_CODE,
    officeName: row.ATPT_OFCDC_SC_NM,
    schoolCode: row.SD_SCHUL_CODE,
    schoolName: row.SCHUL_NM,
    schoolLevel: row.SCHUL_KND_SC_NM,
    address: row.ORG_RDNMA,
  }));
}

export async function fetchSchoolLunch({
  officeCode,
  schoolCode,
  date,
}: {
  officeCode: string;
  schoolCode: string;
  date: string;
}) {
  const payload = await fetchNeisJson('mealServiceDietInfo', {
    pIndex: '1',
    pSize: '10',
    ATPT_OFCDC_SC_CODE: officeCode,
    SD_SCHUL_CODE: schoolCode,
    MMEAL_SC_CODE: '2',
    MLSV_YMD: date,
  });

  const row = extractRows(payload, 'mealServiceDietInfo')[0];
  if (!row) {
    return null;
  }

  const menuItems = row.DDISH_NM.split(/<br\s*\/?>/i)
    .map((item) => cleanDishName(item))
    .filter(Boolean);

  return {
    date,
    calories: parseCalories(row.CAL_INFO),
    menuItems,
    rawMenu: row.DDISH_NM,
  } satisfies NeisLunch;
}
