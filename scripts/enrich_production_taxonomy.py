from __future__ import annotations

import json
import sys
from pathlib import Path

if __package__ in {None, ''}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.final_production_dataset import (
    build_parent_pitch,
    classify_comfort_level,
    classify_dinner_fit,
    classify_meal_style,
    load_manual_taxonomy_overrides,
)


def adapt_final_row_to_source_shape(row: dict) -> dict:
    return {
        'recommend_name': row.get('display_name', ''),
        'representative_main_dishes': row.get('main_dishes', []),
        'summary_tags': {
            'has_fried': row.get('attributes', {}).get('fried', False),
            'has_spicy': row.get('attributes', {}).get('spicy', False),
            'prep_difficulty': row.get('attributes', {}).get('prep_difficulty', 'Unknown'),
            'main_proteins': row.get('protein_tags', []),
        },
        'calories_avg': row.get('nutrition', {}).get('calories', {}).get('avg', 0),
        'occurrence_count': row.get('popularity', {}).get('occurrence_count', 0),
    }


def enrich_row(row: dict, overrides: dict[str, dict]) -> dict:
    source_row = adapt_final_row_to_source_shape(row)
    taxonomy = {
        'meal_style': classify_meal_style(source_row),
        'comfort_level': classify_comfort_level(source_row),
        'dinner_fit': classify_dinner_fit(source_row),
    }
    override = overrides.get(row['menu_id'], {})
    taxonomy.update({
        'meal_style': override.get('meal_style', taxonomy['meal_style']),
        'comfort_level': override.get('comfort_level', taxonomy['comfort_level']),
        'dinner_fit': override.get('dinner_fit', taxonomy['dinner_fit']),
    })
    taxonomy['parent_pitch'] = override.get('parent_pitch') or build_parent_pitch(source_row, taxonomy)
    enriched = dict(row)
    enriched['taxonomy'] = taxonomy
    return enriched


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    dataset_dir = root / 'datasets' / '2025'
    dataset_path = dataset_dir / 'production_final_dataset_2025.json'
    report_path = dataset_dir / 'production_final_dataset_2025_report.json'

    rows = json.loads(dataset_path.read_text(encoding='utf-8'))
    overrides = load_manual_taxonomy_overrides()
    enriched_rows = [enrich_row(row, overrides) for row in rows]

    meal_style_counts: dict[str, int] = {}
    comfort_counts: dict[str, int] = {}
    dinner_fit_counts: dict[str, int] = {}
    for row in enriched_rows:
        taxonomy = row['taxonomy']
        meal_style_counts[taxonomy['meal_style']] = meal_style_counts.get(taxonomy['meal_style'], 0) + 1
        comfort_counts[taxonomy['comfort_level']] = comfort_counts.get(taxonomy['comfort_level'], 0) + 1
        dinner_fit_counts[taxonomy['dinner_fit']] = dinner_fit_counts.get(taxonomy['dinner_fit'], 0) + 1

    report = json.loads(report_path.read_text(encoding='utf-8'))
    report['taxonomy_counts'] = dict(sorted(meal_style_counts.items()))
    report['comfort_level_counts'] = dict(sorted(comfort_counts.items()))
    report['dinner_fit_counts'] = dict(sorted(dinner_fit_counts.items()))
    report['manual_override_count'] = len(overrides)
    report['taxonomy_samples'] = enriched_rows[:10]

    dataset_path.write_text(json.dumps(enriched_rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
