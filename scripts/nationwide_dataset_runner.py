from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
import json
import sys
import urllib.parse
import urllib.request

if __package__ in {None, ''}:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.nationwide_dataset_pipeline import build_year_date_bounds
from scripts.neis_menu_refiner import refine_row
from scripts.high_confidence_filter import filter_high_confidence_rows
from scripts.app_seed_dedupe import dedupe_rows


@dataclass(frozen=True)
class NationwideRunConfig:
    root_dir: Path = Path('/home/jisub-lee/workspace/after-lunch')
    year: int = 2025
    sample_rows: int = 1000


def compute_level_targets(sample_rows: int) -> dict[str, int]:
    elementary = int(round(sample_rows * 0.34))
    remaining = sample_rows - elementary
    middle = remaining // 2
    high = remaining - middle
    return {"초등학교": elementary, "중학교": middle, "고등학교": high}


def should_stop_collecting(collected: dict[str, int], targets: dict[str, int]) -> bool:
    return all(collected.get(level, 0) >= targets.get(level, 0) for level in targets)


def build_sample_stage_paths(config: NationwideRunConfig) -> dict[str, Path]:
    base = config.root_dir / 'datasets' / str(config.year) / f'sample_{config.sample_rows}'
    return {
        'raw': base / f'raw_meals_{config.year}_sample_{config.sample_rows}.jsonl',
        'refined': base / f'refined_meals_{config.year}_sample_{config.sample_rows}.jsonl',
        'high_confidence': base / f'high_confidence_seed_{config.year}_sample_{config.sample_rows}.json',
        'app_seed': base / f'app_seed_deduped_{config.year}_sample_{config.sample_rows}.json',
        'report': base / f'run_report_{config.year}_sample_{config.sample_rows}.json',
    }


def _load_api_key(env_path: Path) -> str:
    for line in env_path.read_text(encoding='utf-8').splitlines():
        if line.startswith('NEIS_API_KEY='):
            return line.split('=', 1)[1].strip()
    raise RuntimeError('NEIS_API_KEY not found')


def _fetch_json(api_key: str, endpoint: str, **params) -> dict:
    query = urllib.parse.urlencode({'KEY': api_key, 'Type': 'json', **params})
    url = f'https://open.neis.go.kr/hub/{endpoint}?{query}'
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.loads(response.read().decode('utf-8'))


def _extract_rows(payload: dict, key: str) -> list[dict]:
    rows: list[dict] = []
    for block in payload.get(key, []):
        if isinstance(block, dict) and isinstance(block.get('row'), list):
            rows.extend(block['row'])
    return rows


def _write_jsonl(path: Path, rows: Iterable[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open('w', encoding='utf-8') as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + '\n')
            count += 1
    return count


def run_sample_pipeline(config: NationwideRunConfig) -> dict:
    api_key = _load_api_key(config.root_dir / '.env')
    targets = compute_level_targets(config.sample_rows)
    date_from, date_to = build_year_date_bounds(config.year)

    school_rows: list[dict] = []
    for page in range(1, 16):
        school_rows.extend(_extract_rows(_fetch_json(api_key, 'schoolInfo', pIndex=page, pSize=200), 'schoolInfo'))
        if len(school_rows) >= 2500:
            break

    school_caps = {'초등학교': 50, '중학교': 45, '고등학교': 45}
    chosen_schools = []
    seen = set()
    school_count_by_level = {k: 0 for k in school_caps}
    for school in school_rows:
        level = school.get('SCHUL_KND_SC_NM')
        code = school.get('SD_SCHUL_CODE')
        if level not in school_caps or code in seen:
            continue
        if school_count_by_level[level] >= school_caps[level]:
            continue
        chosen_schools.append(school)
        seen.add(code)
        school_count_by_level[level] += 1
        if all(school_count_by_level[level] >= school_caps[level] for level in school_caps):
            break

    collected_by_level = {k: 0 for k in targets}
    raw_rows: list[dict] = []
    for school in chosen_schools:
        level = school['SCHUL_KND_SC_NM']
        if collected_by_level[level] >= targets[level]:
            continue
        payload = _fetch_json(
            api_key,
            'mealServiceDietInfo',
            pIndex=1,
            pSize=60,
            ATPT_OFCDC_SC_CODE=school['ATPT_OFCDC_SC_CODE'],
            SD_SCHUL_CODE=school['SD_SCHUL_CODE'],
            MMEAL_SC_CODE='2',
            MLSV_FROM_YMD=date_from,
            MLSV_TO_YMD=date_to,
        )
        rows = _extract_rows(payload, 'mealServiceDietInfo')
        for row in rows:
            if collected_by_level[level] >= targets[level]:
                break
            row['_school_level'] = level
            row['_school_name'] = school['SCHUL_NM']
            row['_office_name'] = school['ATPT_OFCDC_SC_NM']
            raw_rows.append(row)
            collected_by_level[level] += 1
        if should_stop_collecting(collected_by_level, targets):
            break

    if len(raw_rows) < config.sample_rows:
        raise RuntimeError(f'Expected at least {config.sample_rows} rows, got {len(raw_rows)}')

    raw_rows = raw_rows[: config.sample_rows]
    refined_rows = []
    for row in raw_rows:
        refined = refine_row(row)
        refined['school_level'] = row['_school_level']
        refined['school_name'] = row['_school_name']
        refined['office_name'] = row['_office_name']
        refined_rows.append(refined)

    high_confidence_rows = filter_high_confidence_rows(refined_rows)
    deduped_rows = dedupe_rows(high_confidence_rows)

    paths = build_sample_stage_paths(config)
    raw_written = _write_jsonl(paths['raw'], raw_rows)
    refined_written = _write_jsonl(paths['refined'], refined_rows)
    paths['high_confidence'].write_text(json.dumps(high_confidence_rows, ensure_ascii=False, indent=2), encoding='utf-8')
    paths['app_seed'].write_text(json.dumps(deduped_rows, ensure_ascii=False, indent=2), encoding='utf-8')

    report = {
        'year': config.year,
        'sample_rows_requested': config.sample_rows,
        'raw_rows': raw_written,
        'refined_rows': refined_written,
        'high_confidence_rows': len(high_confidence_rows),
        'deduped_rows': len(deduped_rows),
        'level_targets': targets,
        'level_collected': collected_by_level,
        'outputs': {name: str(path) for name, path in paths.items()},
    }
    paths['report'].write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return report


if __name__ == '__main__':
    sample_rows = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
    report = run_sample_pipeline(NationwideRunConfig(sample_rows=sample_rows))
    print(json.dumps(report, ensure_ascii=False, indent=2))
