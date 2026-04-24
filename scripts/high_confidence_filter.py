from __future__ import annotations

from typing import Iterable

AMBIGUOUS_KEYWORDS = {
    "버거",
    "샌드위치",
    "주먹밥",
    "순대",
    "새우짜조롤",
    "크림새우",
    "온두부",
    "무쌈",
    "꼬치",
    "오리엔탈",
    "떡볶이",
    "고명",
}

SUSPICIOUS_SIDEISH_WORDS = {
    "베이컨감자채볶음",
    "감자채베이컨볶음",
    "찹쌀콩멸치볶음",
    "멸치콩강정볶음",
    "콩부각멸치볶음",
    "소시지멸치볶음",
    "마늘쫑어묵볶음",
}


def _has_ambiguous_keyword(name: str) -> bool:
    return any(keyword in name for keyword in AMBIGUOUS_KEYWORDS)


def _is_suspicious_sideish(name: str) -> bool:
    return name in SUSPICIOUS_SIDEISH_WORDS


def is_high_confidence_row(row: dict) -> bool:
    main_dishes = row.get("main_dishes") or []
    if not main_dishes:
        return False
    if any(dish.get("cooking_method") == "기타" for dish in main_dishes):
        return False
    if any(_has_ambiguous_keyword(dish.get("dish_name", "")) for dish in main_dishes):
        return False
    if any(_is_suspicious_sideish(dish.get("dish_name", "")) for dish in main_dishes):
        return False
    recommend_name = row.get("recommend_name", "")
    if not recommend_name or recommend_name == "오늘의 추천 저녁 식단":
        return False
    return True


def filter_high_confidence_rows(rows: Iterable[dict]) -> list[dict]:
    return [row for row in rows if is_high_confidence_row(row)]
