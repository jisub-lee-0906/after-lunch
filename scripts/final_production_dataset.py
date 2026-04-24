from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

if __package__ in {None, ''}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def build_menu_id(canonical_key: str) -> str:
    digest = hashlib.sha1(canonical_key.encode('utf-8')).hexdigest()[:12]
    return f'yn-{digest}'


def classify_calorie_profile(row: dict) -> str:
    avg = row.get('calories_avg', 0)
    minimum = row.get('calories_min', 0)
    maximum = row.get('calories_max', 0)
    if minimum <= 0 or maximum > 2500 or not 250 <= avg <= 1200:
        return 'implausible'
    if maximum - minimum > 900:
        return 'variable'
    return 'stable'


def is_production_ready_row(row: dict) -> bool:
    return classify_calorie_profile(row) != 'implausible'


def is_stable_operational_row(row: dict) -> bool:
    return classify_calorie_profile(row) == 'stable'


def select_final_dataset_rows(rows: list[dict]) -> list[dict]:
    selected = [row for row in rows if is_production_ready_row(row)]
    selected.sort(key=lambda r: (-r.get('occurrence_count', 0), r.get('canonical_key_2', '')))
    return selected


def select_stable_operational_rows(rows: list[dict]) -> list[dict]:
    selected = [row for row in rows if is_stable_operational_row(row)]
    selected.sort(key=lambda r: (-r.get('occurrence_count', 0), r.get('canonical_key_2', '')))
    return selected


def build_final_record(row: dict) -> dict:
    proteins = list(row.get('summary_tags', {}).get('main_proteins', []))
    calorie_profile = classify_calorie_profile(row)
    return {
        'menu_id': build_menu_id(row.get('canonical_key_2', '')),
        'display_name': row.get('recommend_name', ''),
        'canonical_name': row.get('canonical_key_2', ''),
        'main_dishes': list(row.get('representative_main_dishes', [])),
        'protein_tags': proteins,
        'attributes': {
            'spicy': bool(row.get('summary_tags', {}).get('has_spicy', False)),
            'fried': bool(row.get('summary_tags', {}).get('has_fried', False)),
            'prep_difficulty': row.get('summary_tags', {}).get('prep_difficulty', 'Unknown'),
        },
        'nutrition': {
            'calories': {
                'avg': row.get('calories_avg', 0),
                'min': row.get('calories_min', 0),
                'max': row.get('calories_max', 0),
            }
        },
        'popularity': {
            'occurrence_count': row.get('occurrence_count', 0),
            'source_group_size': row.get('source_group_size', 0),
        },
        'quality': {
            'school_level_coverage': len(row.get('school_levels_seen', [])),
            'calorie_profile': calorie_profile,
            'production_ready': calorie_profile != 'implausible',
        },
        'school_levels_seen': list(row.get('school_levels_seen', [])),
        'representative_menus': list(row.get('representative_menus', [])),
    }


def build_report(source_rows: list[dict], final_rows: list[dict], *, dataset_tier: str) -> dict:
    protein_counts: Counter[str] = Counter()
    calorie_profile_counts: Counter[str] = Counter()
    for row in final_rows:
        for protein in row.get('protein_tags', []):
            protein_counts[protein] += 1
        calorie_profile_counts[row.get('quality', {}).get('calorie_profile', 'unknown')] += 1
    return {
        'dataset_tier': dataset_tier,
        'source_rows': len(source_rows),
        'final_rows': len(final_rows),
        'reduction_rows': len(source_rows) - len(final_rows),
        'keep_rate': round(len(final_rows) / len(source_rows), 4) if source_rows else 0.0,
        'protein_counts': dict(sorted(protein_counts.items())),
        'calorie_profile_counts': dict(sorted(calorie_profile_counts.items())),
        'samples': final_rows[:10],
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    dataset_dir = root / 'datasets' / '2025'
    input_path = dataset_dir / 'app_seed_ultra_curated_2025.json'
    output_path = dataset_dir / 'production_final_dataset_2025.json'
    report_path = dataset_dir / 'production_final_dataset_2025_report.json'
    candidate_output_path = dataset_dir / 'production_candidate_dataset_2025.json'
    candidate_report_path = dataset_dir / 'production_candidate_dataset_2025_report.json'

    rows = json.loads(input_path.read_text(encoding='utf-8'))

    candidate_selected = select_final_dataset_rows(rows)
    candidate_rows = [build_final_record(row) for row in candidate_selected]
    candidate_report = build_report(rows, candidate_rows, dataset_tier='candidate')

    operational_selected = select_stable_operational_rows(rows)
    final_rows = [build_final_record(row) for row in operational_selected]
    report = build_report(rows, final_rows, dataset_tier='operational-stable')

    output_path.write_text(json.dumps(final_rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    candidate_output_path.write_text(json.dumps(candidate_rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    candidate_report_path.write_text(json.dumps(candidate_report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
