from __future__ import annotations

from collections import defaultdict
from statistics import mean

SCHOOL_LEVEL_ORDER = {"초등학교": 0, "중학교": 1, "고등학교": 2}


def build_canonical_key(row: dict) -> str:
    names = sorted(dish["dish_name"] for dish in row.get("main_dishes", []))
    return "|".join(names)


def dedupe_rows(rows: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        key = build_canonical_key(row)
        if not key:
            continue
        grouped[key].append(row)

    output = []
    for index, (key, group) in enumerate(sorted(grouped.items()), start=1):
        calories = [row.get("calories", 0) for row in group]
        school_levels = sorted({row.get("school_level", "") for row in group if row.get("school_level")}, key=lambda x: SCHOOL_LEVEL_ORDER.get(x, 999))
        representative = group[0]
        representative_names = sorted(dish["dish_name"] for dish in representative["main_dishes"])
        proteins = []
        for row in group:
            for protein in row.get("summary_tags", {}).get("main_proteins", []):
                if protein not in proteins:
                    proteins.append(protein)
        representative_menus = []
        seen_menus = set()
        for row in group:
            menu = row.get("original_menu", "")
            if menu and menu not in seen_menus:
                representative_menus.append(menu)
                seen_menus.add(menu)
            if len(representative_menus) == 3:
                break

        item = {
            "id": f"seed-{index:05d}",
            "canonical_key": key,
            "recommend_name": representative.get("recommend_name", ""),
            "representative_main_dishes": representative_names,
            "summary_tags": {
                "has_fried": any(row.get("summary_tags", {}).get("has_fried", False) for row in group),
                "has_spicy": any(row.get("summary_tags", {}).get("has_spicy", False) for row in group),
                "main_proteins": proteins,
                "prep_difficulty": representative.get("summary_tags", {}).get("prep_difficulty", "Mid"),
            },
            "calories_avg": round(mean(calories)) if calories else 0,
            "calories_min": min(calories) if calories else 0,
            "calories_max": max(calories) if calories else 0,
            "school_levels_seen": school_levels,
            "occurrence_count": len(group),
            "representative_menus": representative_menus,
        }
        output.append(item)

    return output
