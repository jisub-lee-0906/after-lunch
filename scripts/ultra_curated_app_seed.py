from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

if __package__ in {None, ''}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.curated_app_seed import is_curatable_row

REQUIRED_SCHOOL_LEVELS = frozenset({'초등학교', '중학교', '고등학교'})
DEFAULT_MIN_OCCURRENCE = 30


def has_full_school_level_coverage(row: dict) -> bool:
    return REQUIRED_SCHOOL_LEVELS.issubset(set(row.get('school_levels_seen', [])))


def is_ultra_curatable_row(row: dict, *, min_occurrence: int = DEFAULT_MIN_OCCURRENCE) -> bool:
    if not is_curatable_row(row, min_occurrence=min_occurrence):
        return False
    if not has_full_school_level_coverage(row):
        return False
    return True


def ultra_curate_rows(rows: list[dict], *, min_occurrence: int = DEFAULT_MIN_OCCURRENCE) -> list[dict]:
    curated = [row for row in rows if is_ultra_curatable_row(row, min_occurrence=min_occurrence)]
    curated.sort(key=lambda r: (-r.get('occurrence_count', 0), r.get('canonical_key_2', '')))
    return curated


def build_report(rows: list[dict], ultra_rows: list[dict], *, min_occurrence: int) -> dict:
    protein_counter: Counter[str] = Counter()
    difficulty_counter: Counter[str] = Counter()
    for row in ultra_rows:
        for protein in row.get('summary_tags', {}).get('main_proteins', []):
            protein_counter[protein] += 1
        difficulty_counter[row.get('summary_tags', {}).get('prep_difficulty', 'UNKNOWN')] += 1
    source_count = len(rows)
    ultra_count = len(ultra_rows)
    keep_rate = round(ultra_count / source_count, 4) if source_count else 0.0
    return {
        'source_rows': source_count,
        'ultra_curated_rows': ultra_count,
        'reduction_rows': source_count - ultra_count,
        'keep_rate': keep_rate,
        'min_occurrence': min_occurrence,
        'required_school_levels': sorted(REQUIRED_SCHOOL_LEVELS),
        'prep_difficulty_counts': dict(sorted(difficulty_counter.items())),
        'protein_counts': dict(sorted(protein_counter.items())),
        'samples': ultra_rows[:10],
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    dataset_dir = root / 'datasets' / '2025'
    input_path = dataset_dir / 'app_seed_curated_2025.json'
    output_path = dataset_dir / 'app_seed_ultra_curated_2025.json'
    report_path = dataset_dir / 'app_seed_ultra_curated_2025_report.json'

    rows = json.loads(input_path.read_text(encoding='utf-8'))
    ultra_rows = ultra_curate_rows(rows, min_occurrence=DEFAULT_MIN_OCCURRENCE)
    report = build_report(rows, ultra_rows, min_occurrence=DEFAULT_MIN_OCCURRENCE)

    output_path.write_text(json.dumps(ultra_rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
