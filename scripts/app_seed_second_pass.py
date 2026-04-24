from __future__ import annotations

from collections import defaultdict
import re
from statistics import mean

SCHOOL_LEVEL_ORDER = {'초등학교': 0, '중학교': 1, '고등학교': 2}


def normalize_dish_name(name: str) -> str:
    text = name.strip()
    text = re.sub(r'^[=%!,\.\)\(:\s]+', '', text)
    text = re.sub(r'^[ㄱ-ㅎ]:', '', text)
    text = re.sub(r'^(?:중|반달|초|고)\)', '', text)
    text = re.sub(r'^반달\)', '', text)
    text = re.sub(r'^<[^>]+>', '', text)
    text = re.sub(r'(?i)^self', '', text).strip()
    text = re.sub(r'^"?국\s*없는\s*날"?', '', text)
    text = re.sub(r'^"?만족도조사요청\s*"?', '', text)
    text = re.sub(r'^"?채식의날"?', '', text)
    text = re.sub(r'^잔반없는날', '', text)
    text = re.sub(r'^대구표준\.?초', '', text)
    text = text.replace('김칫국', '김치국')
    text = re.sub(r'\s+', '', text)
    text = re.sub(r'^["“”]+|["“”]+$', '', text)
    text = re.sub(r'^[\-–—]+', '', text)
    return text


def build_second_pass_key(row: dict) -> str:
    names = sorted(normalize_dish_name(name) for name in row.get('representative_main_dishes', []))
    return '|'.join(name for name in names if name)


def compress_app_seed(rows: list[dict]) -> list[dict]:
    grouped = defaultdict(list)
    for row in rows:
        key = build_second_pass_key(row)
        if key:
            grouped[key].append(row)

    output = []
    for idx, (key, group) in enumerate(sorted(grouped.items()), start=1):
        calories_avg_values = [row.get('calories_avg', 0) for row in group]
        calories_min_values = [row.get('calories_min', 0) for row in group]
        calories_max_values = [row.get('calories_max', 0) for row in group]
        occurrence_total = sum(row.get('occurrence_count', 0) for row in group)
        levels = sorted({lvl for row in group for lvl in row.get('school_levels_seen', [])}, key=lambda x: SCHOOL_LEVEL_ORDER.get(x, 999))
        proteins = []
        for row in group:
            for protein in row.get('summary_tags', {}).get('main_proteins', []):
                if protein not in proteins:
                    proteins.append(protein)
        rep_menus = []
        seen = set()
        for row in group:
            for menu in row.get('representative_menus', []):
                if menu not in seen:
                    seen.add(menu)
                    rep_menus.append(menu)
                if len(rep_menus) == 3:
                    break
            if len(rep_menus) == 3:
                break
        representative_names = key.split('|') if key else []
        best = sorted(group, key=lambda r: (-r.get('occurrence_count', 0), r.get('canonical_key', '')))[0]
        output.append({
            'id': f'app2-{idx:05d}',
            'canonical_key_2': key,
            'recommend_name': best.get('recommend_name', ''),
            'representative_main_dishes': representative_names,
            'summary_tags': {
                'has_fried': any(row.get('summary_tags', {}).get('has_fried', False) for row in group),
                'has_spicy': any(row.get('summary_tags', {}).get('has_spicy', False) for row in group),
                'main_proteins': proteins,
                'prep_difficulty': best.get('summary_tags', {}).get('prep_difficulty', 'Mid'),
            },
            'calories_avg': round(mean(calories_avg_values)) if calories_avg_values else 0,
            'calories_min': min(calories_min_values) if calories_min_values else 0,
            'calories_max': max(calories_max_values) if calories_max_values else 0,
            'school_levels_seen': levels,
            'occurrence_count': occurrence_total,
            'representative_menus': rep_menus,
            'source_group_size': len(group),
        })
    return output
