from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

OVERRIDE_PATH = Path(__file__).resolve().parents[1] / 'datasets' / '2025' / 'manual_taxonomy_overrides_2025.json'

if __package__ in {None, ''}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def build_menu_id(canonical_key: str) -> str:
    digest = hashlib.sha1(canonical_key.encode('utf-8')).hexdigest()[:12]
    return f'yn-{digest}'


def load_manual_taxonomy_overrides() -> dict[str, dict]:
    if not OVERRIDE_PATH.exists():
        return {}
    rows = json.loads(OVERRIDE_PATH.read_text(encoding='utf-8'))
    return {row['menu_id']: row for row in rows if row.get('menu_id')}


def classify_meal_style(row: dict) -> str:
    dishes = list(row.get('representative_main_dishes', []))
    text = ' '.join([row.get('recommend_name', ''), *dishes])
    strong_main_keywords = ['불고기', '제육', '닭갈비', '돈까스', '치킨까스', '스테이크', '구이', '강정', '수육', '보쌈', '떡갈비', '볶음', '장조림']
    egg_side_keywords = ['달걀찜', '계란찜', '달걀말이', '계란말이', '연두부달걀찜']
    stew_keywords = ['찌개', '순두부', '마라탕']
    noodle_soup_keywords = ['쌀국수', '수제비', '칼국수']

    if any(keyword in text for keyword in ['덮밥', '볶음밥', '비빔밥', '카레', '오므라이스']):
        return 'one_plate'
    if any(keyword in text for keyword in stew_keywords):
        return 'stew_set'
    if any(keyword in text for keyword in ['짬뽕']) and not any(keyword in text for keyword in stew_keywords):
        return 'noodle_soup_set'
    if any(keyword in text for keyword in noodle_soup_keywords):
        return 'noodle_soup_set'
    if any(keyword in text for keyword in egg_side_keywords):
        return 'main_side_set'
    if any(keyword in text for keyword in ['조림', '찜', '갈비찜', '안동찜닭']) and not any(keyword in text for keyword in egg_side_keywords):
        return 'braised_set'
    if len(dishes) >= 2 and any(keyword in text for keyword in strong_main_keywords):
        return 'main_side_set'
    if any(keyword in text for keyword in ['탕', '국']):
        return 'soup_set'
    return 'main_side_set'


def classify_comfort_level(row: dict) -> str:
    calories = row.get('calories_avg', 0)
    text = ' '.join([row.get('recommend_name', ''), *row.get('representative_main_dishes', [])])
    hearty_keywords = ['갈비탕', '갈비찜', '부대찌개', '삼계탕', '곰탕', '설렁탕', '닭갈비', '치킨텐더', '떡갈비', '강정']
    light_keywords = ['된장국', '맑은국', '계란국', '어묵국', '미역국', '두부', '연두부', '아욱국']
    if row.get('summary_tags', {}).get('has_fried'):
        return 'hearty'
    if any(keyword in text for keyword in hearty_keywords):
        return 'hearty'
    if row.get('summary_tags', {}).get('has_spicy') and calories >= 780:
        return 'hearty'
    if any(keyword in text for keyword in light_keywords) and calories <= 700:
        return 'light'
    if calories <= 650:
        return 'light'
    if calories >= 820:
        return 'hearty'
    return 'balanced'


def classify_dinner_fit(row: dict) -> str:
    occurrence = row.get('occurrence_count', 0)
    difficulty = row.get('summary_tags', {}).get('prep_difficulty', 'Mid')
    text = ' '.join([row.get('recommend_name', ''), *row.get('representative_main_dishes', [])])
    has_fried = bool(row.get('summary_tags', {}).get('has_fried'))
    has_spicy = bool(row.get('summary_tags', {}).get('has_spicy'))
    special_keywords = ['갈비탕', '갈비찜', '안동찜닭', '연어스테이크', '삼계탕', '설렁탕', '곰탕', '전골', '마라탕']
    everyday_keywords = ['덮밥', '볶음밥', '불고기', '제육', '된장국', '된장찌개', '미역국', '어묵국', '계란국', '수육', '장조림', '두부조림', '달걀찜', '계란찜']
    one_plate_keywords = ['덮밥', '볶음밥', '비빔밥', '카레', '오므라이스']
    if difficulty == 'High' or any(keyword in text for keyword in special_keywords):
        return 'special'
    if any(keyword in text for keyword in one_plate_keywords) and (has_fried or has_spicy):
        return 'flexible'
    if occurrence >= 180:
        return 'everyday'
    if occurrence >= 100 and any(keyword in text for keyword in everyday_keywords):
        return 'everyday'
    if any(keyword in text for keyword in everyday_keywords) and difficulty == 'Low':
        return 'everyday'
    return 'flexible'


def build_parent_pitch(row: dict, taxonomy: dict) -> str:
    meal_style = taxonomy['meal_style']
    comfort_level = taxonomy['comfort_level']
    if meal_style == 'one_plate':
        return '한 그릇으로 보기 좋은 메뉴'
    if meal_style in {'soup_set', 'noodle_soup_set'}:
        return '국물 중심으로 보기 좋은 한 끼'
    if meal_style == 'stew_set':
        return '찌개 중심으로 보기 좋은 한 끼'
    if meal_style == 'braised_set':
        return '메인요리 중심으로 보기 좋은 한 끼'
    if comfort_level == 'light':
        return '부담 없이 고르기 좋은 한 끼'
    if comfort_level == 'hearty':
        return '든든하게 이어가기 좋은 한 끼'
    return '집밥처럼 이어가기 좋은 한 끼'


def build_bridge_tags(row: dict, taxonomy: dict) -> list[str]:
    tags: list[str] = []
    meal_style = taxonomy['meal_style']
    comfort_level = taxonomy['comfort_level']
    dinner_fit = taxonomy['dinner_fit']
    has_spicy = bool(row.get('summary_tags', {}).get('has_spicy', False))
    has_fried = bool(row.get('summary_tags', {}).get('has_fried', False))

    comfort_push = comfort_level == 'hearty' and (dinner_fit == 'special' or meal_style == 'one_plate' or has_fried)

    if meal_style in {'main_side_set', 'braised_set'} and '덮밥' not in row.get('recommend_name', '') and '볶음밥' not in row.get('recommend_name', ''):
        tags.append('rice_anchor')
    if not has_spicy and not comfort_push:
        tags.append('spice_reset')
    if not has_fried and (comfort_level == 'light' or meal_style in {'soup_set', 'stew_set'}):
        tags.append('grease_reset')
    if dinner_fit == 'everyday' or comfort_level == 'light':
        tags.append('daily_reset')
    if comfort_push:
        tags.append('comfort_push')

    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        if tag not in seen:
            seen.add(tag)
            ordered.append(tag)
    return ordered


def classify_lunch_aftertaste(lunch_signals: dict) -> list[str]:
    meal_items = list(lunch_signals.get('meal_items', []))
    text = ' '.join(meal_items)
    has_fried = bool(lunch_signals.get('has_fried', False))
    has_spicy = bool(lunch_signals.get('has_spicy', False))
    is_heavy = bool(lunch_signals.get('is_heavy', False))
    tags: list[str] = []

    comfort_saturated = has_spicy and is_heavy and (
        has_fried or any(keyword in text for keyword in ['치킨', '강정', '텐더', '돈까스', '탕수육', '카레', '볶음밥'])
    )

    if has_spicy and is_heavy:
        tags.append('spicy_heavy')
    elif has_fried and is_heavy:
        tags.append('greasy_heavy')

    if any(keyword in text for keyword in ['면', '국수', '라면', '짜장면', '짬뽕', '우동', '쫄면', '파스타']):
        tags.append('noodle_fatigue')
    elif any(keyword in text for keyword in ['덮밥', '볶음밥', '비빔밥', '카레', '오므라이스']) and not comfort_saturated:
        tags.append('rice_missing')

    if comfort_saturated:
        tags.append('comfort_saturated')

    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        if tag not in seen:
            seen.add(tag)
            ordered.append(tag)
    return ordered


def classify_dinner_response(row: dict, taxonomy: dict, bridge_tags: list[str]) -> list[str]:
    responses: list[str] = []
    meal_style = taxonomy['meal_style']
    comfort_level = taxonomy['comfort_level']
    dinner_fit = taxonomy['dinner_fit']

    if 'spice_reset' in bridge_tags:
        responses.append('bland_reset')
    if 'grease_reset' in bridge_tags or meal_style in {'soup_set', 'stew_set', 'noodle_soup_set'}:
        responses.append('broth_reset')
    if 'rice_anchor' in bridge_tags:
        responses.append('rice_anchor')
    if dinner_fit == 'everyday' and comfort_level != 'hearty':
        responses.append('daily_stabilizer')
    if 'comfort_push' in bridge_tags:
        responses.append('treat_continuation')

    seen: set[str] = set()
    ordered: list[str] = []
    for tag in responses:
        if tag not in seen:
            seen.add(tag)
            ordered.append(tag)
    return ordered


def build_transition_match_plan(lunch_aftertaste: list[str], dinner_response: list[str]) -> dict:
    needs: list[str] = []
    if 'spicy_heavy' in lunch_aftertaste:
        needs.extend(['bland_reset', 'daily_stabilizer'])
    if 'greasy_heavy' in lunch_aftertaste:
        needs.append('broth_reset')
    if 'noodle_fatigue' in lunch_aftertaste or 'rice_missing' in lunch_aftertaste:
        needs.append('rice_anchor')
    if 'comfort_saturated' in lunch_aftertaste:
        needs.append('daily_stabilizer')

    primary_needs: list[str] = []
    for need in needs:
        if need not in primary_needs:
            primary_needs.append(need)

    matched_responses = [need for need in primary_needs if need in dinner_response]
    if matched_responses:
        fit_label = 'strong' if len(matched_responses) >= min(2, len(primary_needs)) else 'partial'
    elif dinner_response:
        fit_label = 'partial'
        matched_responses = dinner_response[:1]
    else:
        fit_label = 'weak'

    return {
        'primary_needs': primary_needs,
        'matched_responses': matched_responses,
        'fit_label': fit_label,
    }


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


def build_final_record(row: dict, *, taxonomy_overrides: dict[str, dict] | None = None) -> dict:
    proteins = list(row.get('summary_tags', {}).get('main_proteins', []))
    calorie_profile = classify_calorie_profile(row)
    menu_id = build_menu_id(row.get('canonical_key_2', ''))
    taxonomy = {
        'meal_style': classify_meal_style(row),
        'comfort_level': classify_comfort_level(row),
        'dinner_fit': classify_dinner_fit(row),
    }
    if taxonomy_overrides and menu_id in taxonomy_overrides:
        override = taxonomy_overrides[menu_id]
        taxonomy.update({
            'meal_style': override.get('meal_style', taxonomy['meal_style']),
            'comfort_level': override.get('comfort_level', taxonomy['comfort_level']),
            'dinner_fit': override.get('dinner_fit', taxonomy['dinner_fit']),
        })
        parent_pitch = override.get('parent_pitch') or build_parent_pitch(row, taxonomy)
    else:
        parent_pitch = build_parent_pitch(row, taxonomy)
    return {
        'menu_id': menu_id,
        'display_name': row.get('recommend_name', ''),
        'canonical_name': row.get('canonical_key_2', ''),
        'main_dishes': list(row.get('representative_main_dishes', [])),
        'protein_tags': proteins,
        'taxonomy': {
            **taxonomy,
            'parent_pitch': parent_pitch,
        },
        'bridge_tags': build_bridge_tags(row, taxonomy),
        'dinner_response': classify_dinner_response(row, taxonomy, build_bridge_tags(row, taxonomy)),
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
    taxonomy_counts: Counter[str] = Counter()
    comfort_counts: Counter[str] = Counter()
    dinner_fit_counts: Counter[str] = Counter()
    for row in final_rows:
        for protein in row.get('protein_tags', []):
            protein_counts[protein] += 1
        calorie_profile_counts[row.get('quality', {}).get('calorie_profile', 'unknown')] += 1
        taxonomy = row.get('taxonomy', {})
        taxonomy_counts[taxonomy.get('meal_style', 'unknown')] += 1
        comfort_counts[taxonomy.get('comfort_level', 'unknown')] += 1
        dinner_fit_counts[taxonomy.get('dinner_fit', 'unknown')] += 1
    return {
        'dataset_tier': dataset_tier,
        'source_rows': len(source_rows),
        'final_rows': len(final_rows),
        'reduction_rows': len(source_rows) - len(final_rows),
        'keep_rate': round(len(final_rows) / len(source_rows), 4) if source_rows else 0.0,
        'protein_counts': dict(sorted(protein_counts.items())),
        'calorie_profile_counts': dict(sorted(calorie_profile_counts.items())),
        'taxonomy_counts': dict(sorted(taxonomy_counts.items())),
        'comfort_level_counts': dict(sorted(comfort_counts.items())),
        'dinner_fit_counts': dict(sorted(dinner_fit_counts.items())),
        'manual_override_count': len(load_manual_taxonomy_overrides()),
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
    taxonomy_overrides = load_manual_taxonomy_overrides()

    candidate_selected = select_final_dataset_rows(rows)
    candidate_rows = [build_final_record(row, taxonomy_overrides=taxonomy_overrides) for row in candidate_selected]
    candidate_report = build_report(rows, candidate_rows, dataset_tier='candidate')

    operational_selected = select_stable_operational_rows(rows)
    final_rows = [build_final_record(row, taxonomy_overrides=taxonomy_overrides) for row in operational_selected]
    report = build_report(rows, final_rows, dataset_tier='operational-stable')

    output_path.write_text(json.dumps(final_rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    candidate_output_path.write_text(json.dumps(candidate_rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    candidate_report_path.write_text(json.dumps(candidate_report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
