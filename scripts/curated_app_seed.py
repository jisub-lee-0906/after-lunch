from __future__ import annotations

import re

NOISY_PATTERN = re.compile(r'^[^가-힣A-Za-z0-9]+')
NOISY_WORDS = ('잔반없는날', '국없는날', '대구표준', '표준')


def is_curatable_row(row: dict, *, min_occurrence: int = 4) -> bool:
    if row.get('occurrence_count', 0) < min_occurrence:
        return False
    names = row.get('representative_main_dishes', [])
    if not names:
        return False
    if any(NOISY_PATTERN.search(name) for name in names):
        return False
    if any(any(word in name for word in NOISY_WORDS) for name in names):
        return False
    if not row.get('summary_tags', {}).get('main_proteins'):
        return False
    return True


def curate_rows(rows: list[dict], *, min_occurrence: int = 4) -> list[dict]:
    curated = [row for row in rows if is_curatable_row(row, min_occurrence=min_occurrence)]
    curated.sort(key=lambda r: (-r.get('occurrence_count', 0), r.get('canonical_key_2', '')))
    return curated
