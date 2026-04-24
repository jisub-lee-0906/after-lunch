import html
import re
from typing import Dict, List

MAIN_WITH_TRAILING_SAUCE_KEYWORDS = ["구이", "스테이크", "돈까스", "돈카츠", "카츠", "까스", "탕수육", "치킨", "함박", "갈비", "떡갈비", "커틀렛", "카레라이스", "하이라이스"]
TRAILING_SAUCE_WORDS = ["소스", "드레싱", "케첩", "머스타드", "쌈장", "양념장"]
BOUNDARY_MAIN_WHITELIST = {"순대야채볶음", "갈치무조림", "코다리무조림", "닭살떡조림", "돼지고기김치볶음", "해물볶음우동", "매콤볶음우동"}
BOUNDARY_SIDEISH_BLACKLIST = {"밥새우파래볶음", "멸치찹쌀콩볶음", "햄감자채볶음", "건새우마늘쫑볶음", "토마토달걀볶음", "마늘쫑새우볶음"}

SPECIAL_RICE_KEYWORDS = [
    "볶음밥",
    "비빔밥",
    "덮밥",
    "카레라이스",
    "카레덮밥",
    "하이라이스",
    "짜장덮밥",
    "오므라이스",
    "리조또",
    "필라프",
    "주먹밥",
    "김밥",
]

SUBSTANTIAL_SINGLE_DISH_KEYWORDS = [
    "볶음밥",
    "비빔밥",
    "덮밥",
    "카레",
    "카레덮밥",
    "짜장",
    "짜장덮밥",
    "파스타",
    "스파게티",
    "국수",
    "우동",
    "라면",
    "떡볶이",
    "샌드위치",
    "버거",
    "군대리아",
    "오꼬노미야끼",
]

FRUIT_KEYWORDS = ["사과", "배", "귤", "오렌지", "바나나", "포도", "딸기", "수박", "참외", "멜론", "파인애플", "키위", "망고"]
DESSERT_KEYWORDS = [
    "우유",
    "요구르트",
    "요거트",
    "푸딩",
    "젤리",
    "쿠키",
    "비스킷",
    "케이크",
    "머핀",
    "초코",
    "과자",
    "아이스크림",
    "빙수",
    "주스",
    "식혜",
    "빵",
    "설기",
    "스낵",
    "마카롱",
    "음료",
]
KIMCHI_EXACT = {"배추김치", "깍두기", "총각김치", "열무김치", "백김치", "포기김치", "나박김치", "오이김치"}
SPICY_KEYWORDS = ["김치", "고추", "마라", "매운", "떡볶이", "짬뽕", "불닭", "제육", "닭갈비", "비빔", "쫄면", "육개장", "매콤", "불향", "갈비찜"]
PROTEIN_MAP = {
    "돼지고기": ["돈육", "돼지", "목살", "삼겹", "제육", "돈까스", "돈카츠", "카츠", "햄", "베이컨", "소시지", "비엔나", "족발", "보쌈", "편육"],
    "소고기": ["소고기", "쇠고기", "우불", "불고기", "사골", "갈비", "우사태", "한우", "설렁탕"],
    "가금류": ["닭", "치킨", "계란", "달걀", "오리", "훈제오리"],
    "해산물": ["해물", "오징어", "낙지", "주꾸미", "쭈꾸미", "새우", "게", "굴", "조개", "홍합", "어묵", "생선", "고등어", "갈치", "참치", "연어", "명태", "코다리", "아귀"],
    "콩/두부": ["두부", "콩", "유부", "비지", "청국장", "된장", "마파두부"],
    "채소/버섯": ["버섯", "가지", "호박", "감자", "고구마", "시금치", "브로콜리", "배추", "샐러드", "토마토", "연근", "우엉"],
    "곡류/면류": ["국수", "우동", "라면", "면", "파스타", "스파게티", "쫄면", "칼국수", "수제비", "떡", "밥", "죽", "리조또", "카레라이스", "볶음밥", "비빔밥", "군대리아", "버거"],
}
STRONG_MAIN_KEYWORDS = [
    "찌개",
    "국",
    "탕",
    "전골",
    "구이",
    "찜",
    "불고기",
    "갈비",
    "돈까스",
    "까스",
    "커틀렛",
    "스테이크",
    "치킨",
    "강정",
    "탕수육",
    "볶음밥",
    "비빔밥",
    "덮밥",
    "카레",
    "카레덮밥",
    "짜장",
    "짜장덮밥",
    "파스타",
    "스파게티",
    "국수",
    "우동",
    "라면",
    "떡볶이",
    "만두",
    "마파두부",
    "순대",
    "보쌈",
    "족발",
    "군대리아",
]
EXCLUDED_SUFFIXES = ["소스", "드레싱", "케첩", "머스타드", "쌈장", "양념장", "크루통"]
SIDEISH_WORDS = ["나물", "겉절이", "장아찌", "피클", "무침", "샐러드"]
SIDEISH_BOKKEUM_JORIM_WORDS = ["감자채볶음", "건파래볶음", "멸치볶음", "진미채볶음", "미역줄기볶음", "시래기된장조림", "연근조림", "우엉조림", "콘슬로우"]


def strip_parens(text: str) -> str:
    previous = None
    while previous != text:
        previous = text
        text = re.sub(r"\([^)]*\)", "", text)
        text = re.sub(r"\[[^\]]*\]", "", text)
    return text


def normalize_item(text: str) -> str:
    text = html.unescape(text or "")
    text = strip_parens(text)
    text = text.replace('..', ' ')
    text = re.sub(r"[0-9]+(?:\.[0-9]+)*", "", text)
    text = re.sub(r"[*\/&#|~'^$!]+", " ", text)
    text = re.sub(r"^[=!.,\-\s]+", "", text)
    text = re.sub(r"[!.,\-\s]+$", "", text)
    text = re.sub(r"\s+", " ", text).strip(" ,;:+-")
    text = re.sub(r"(?i)^self", "", text).strip()
    text = re.sub(r"(?i)(?<=[가-힣A-Za-z])st(?=[가-힣])", "", text)
    text = re.sub(r"\s+", " ", text).strip(" ,;:+-")
    if any(keyword in text for keyword in MAIN_WITH_TRAILING_SAUCE_KEYWORDS):
        text = re.sub(r"\s+(?:바베큐|브라운|케찹|케첩|참깨|크림|칠리|데리야끼|로제|잠발라야|치폴레)?(?:소스|드레싱|케첩|케찹)$", "", text).strip()
    text = re.sub(r"\s+고명$", "", text)
    text = re.sub(r"\s+밥$", "", text) if any(keyword in text for keyword in ["볶음밥 밥", "비빔밥 밥", "하이라이스 밥", "짜장덮밥 밥", "카레라이스 밥"]) else text
    if any(keyword in text for keyword in ["오리훈제", "편육", "보쌈"]) and text.endswith("무쌈"):
        text = re.sub(r"\s+무쌈$", "", text)
    return text.strip(" ,;:+-")


def merge_split_menu_items(items: List[str]) -> List[str]:
    merged: List[str] = []
    skip = set()
    for idx, item in enumerate(items):
        if idx in skip:
            continue
        next_item = items[idx + 1] if idx + 1 < len(items) else None
        if next_item and item in {"볶음밥", "비빔밥", "하이라이스", "짜장덮밥", "카레덮밥", "카레라이스"}:
            if next_item.endswith(item) or item in next_item:
                merged.append(next_item)
                skip.add(idx + 1)
                continue
        if next_item and next_item in {"볶음밥", "비빔밥", "하이라이스", "짜장덮밥", "카레덮밥", "카레라이스"}:
            if item.endswith(next_item) or next_item in item:
                merged.append(item)
                skip.add(idx + 1)
                continue
        if next_item and item.endswith("밥") and next_item.endswith("고명"):
            if any(keyword in next_item for keyword in ["볶음밥", "비빔밥", "하이라이스", "짜장덮밥"]):
                merged.append(next_item.replace(" 고명", ""))
                skip.add(idx + 1)
                continue
        if next_item and item.endswith("밥") and "소스" in next_item:
            if any(keyword in next_item for keyword in ["하이라이스", "카레", "짜장"]):
                merged.append(next_item.replace(" 소스", ""))
                skip.add(idx + 1)
                continue
        if next_item and next_item.endswith("밥") and "소스" in item:
            if any(keyword in item for keyword in ["하이라이스", "카레", "짜장"]):
                merged.append(item.replace(" 소스", ""))
                skip.add(idx + 1)
                continue
        merged.append(item)
    deduped: List[str] = []
    seen = set()
    for item in merged:
        if item and item not in seen:
            deduped.append(item)
            seen.add(item)
    return deduped


def split_menu(menu: str) -> List[str]:
    parts = re.split(r"<br\s*/?>|\n|\r|\.\.(?=[^\s])", html.unescape(menu or ""))
    items: List[str] = []
    seen = set()
    for part in parts:
        item = normalize_item(part)
        if item and item not in seen:
            items.append(item)
            seen.add(item)
    return merge_split_menu_items(items)


def has_batchim(word: str) -> bool:
    if not word:
        return False
    last = word[-1]
    if not ("가" <= last <= "힣"):
        return False
    return (ord(last) - ord("가")) % 28 != 0


def join_two(a: str, b: str) -> str:
    return f"{a}{'과' if has_batchim(a) else '와'} {b}"


def is_simple_rice(item: str) -> bool:
    if any(keyword in item for keyword in SPECIAL_RICE_KEYWORDS):
        return False
    simple_rice_names = {
        "흰쌀밥",
        "쌀밥",
        "잡곡밥",
        "현미밥",
        "보리밥",
        "기장밥",
        "차조밥",
        "수수밥",
        "검정쌀밥",
        "귀리밥",
        "율무밥",
        "흑미밥",
        "차수수밥",
        "찰보리밥",
        "혼합곡밥",
        "발아현미밥",
        "칼슘흑미밥",
        "칼슘강화찹쌀밥",
        "발아흑미밥",
        "쌀보리밥",
        "칼슘홍국밥",
    }
    return item in simple_rice_names or item.endswith("밥")


def ingredient(item: str) -> str:
    if "치킨마요" in item:
        return "가금류"
    if "닭갈비" in item:
        return "가금류"
    if "떡갈비" in item or "너비아니" in item:
        return "소고기"
    for label, keywords in PROTEIN_MAP.items():
        if any(keyword in item for keyword in keywords):
            return label
    return "기타"


def method(item: str) -> str:
    if "치킨마요" in item:
        return "기타"
    if "닭갈비" in item:
        return "볶음"
    if "떡갈비" in item or "너비아니" in item:
        return "구이"
    if "비빔밥" in item:
        return "무침/샐러드"
    if any(keyword in item for keyword in ["볶음밥", "덮밥", "카레라이스", "카레덮밥", "하이라이스", "짜장덮밥", "짜장면", "짜장"]):
        return "볶음"
    if any(keyword in item for keyword in ["볶음우동"]):
        return "볶음"
    if any(keyword in item for keyword in ["파스타", "스파게티"]):
        return "볶음"
    if any(keyword in item for keyword in ["우동", "국수", "칼국수", "쌀국수", "라면", "잔치국수"]):
        return "국/탕"
    if any(keyword in item for keyword in ["죽", "리조또", "조림"]):
        return "찜/삶기"
    if any(keyword in item for keyword in ["오꼬노미야끼", "오코노미야끼", "계란말이", "달걀말이", "달걀후라이", "계란후라이", "전병", "핫도그", "크로켓", "회오리감자"]):
        return "튀김/전"
    if any(keyword in item for keyword in ["치킨마요", "튀김", "돈까스", "돈카츠", "카츠", "까스", "커틀렛", "부침개", "전", "탕수육", "강정", "치킨", "군만두"]):
        return "튀김/전"
    if any(keyword in item for keyword in ["볶음", "잡채", "제육", "불고기"]):
        return "볶음"
    if any(keyword in item for keyword in ["찜", "수육", "보쌈", "삶", "편육"]):
        return "찜/삶기"
    if any(keyword in item for keyword in ["찌개", "국", "탕", "전골", "수제비", "스프", "샤브샤브"]):
        return "국/탕"
    if any(keyword in item for keyword in ["구이", "스테이크", "직화", "함박"]):
        return "구이"
    if any(keyword in item for keyword in ["무침", "샐러드"]):
        return "무침/샐러드"
    return "기타"


def is_dessert_or_drink(item: str) -> bool:
    return any(item == keyword or item.startswith(keyword) or item.endswith(keyword) for keyword in FRUIT_KEYWORDS + DESSERT_KEYWORDS)


def is_sideish_like(item: str) -> bool:
    if item in BOUNDARY_MAIN_WHITELIST:
        return False
    if item in BOUNDARY_SIDEISH_BLACKLIST:
        return True
    if item in SIDEISH_BOKKEUM_JORIM_WORDS:
        return True
    if any(item.endswith(suffix) for suffix in EXCLUDED_SUFFIXES):
        return True
    if any(word in item for word in SIDEISH_WORDS):
        return True
    if item in {"무쌈", "오이지무침", "단무지", "데리야끼김구이", "무말랭이무침"}:
        return True
    return False


def is_excluded_item(item: str) -> bool:
    if not item:
        return True
    if is_simple_rice(item):
        return True
    if item in {"김", "도시락김"}:
        return True
    if item in KIMCHI_EXACT or item.endswith("김치"):
        return True
    if is_dessert_or_drink(item):
        return True
    if is_sideish_like(item):
        return True
    return False


def is_real_main(item: str) -> bool:
    if any(keyword in item for keyword in STRONG_MAIN_KEYWORDS):
        return True
    if any(keyword in item for keyword in SUBSTANTIAL_SINGLE_DISH_KEYWORDS):
        return True
    main_ingredient = ingredient(item)
    return main_ingredient in {"돼지고기", "소고기", "가금류", "해산물", "콩/두부"} and not is_sideish_like(item)


def score_item(item: str) -> int:
    if is_excluded_item(item):
        return -100
    score = 0
    if any(keyword in item for keyword in STRONG_MAIN_KEYWORDS):
        score += 6
    if any(keyword in item for keyword in SUBSTANTIAL_SINGLE_DISH_KEYWORDS):
        score += 4
    main_ingredient = ingredient(item)
    cooking_method = method(item)
    if main_ingredient in {"돼지고기", "소고기", "가금류", "해산물", "콩/두부"}:
        score += 4
    elif main_ingredient == "곡류/면류":
        score += 2
    if cooking_method in {"튀김/전", "볶음", "찜/삶기", "국/탕", "구이"}:
        score += 2
    if any(keyword in item for keyword in ["스테이크", "구이", "돈까스", "탕수육", "치킨", "닭다리살구이"]):
        score += 3
    if any(keyword in item for keyword in ["우동", "파스타", "스파게티", "덮밥", "볶음우동", "군대리아"]):
        score += 2
    if item.endswith("국") or item.endswith("탕") or item.endswith("찌개"):
        score += 1
    if cooking_method == "국/탕":
        score -= 1
    if item in BOUNDARY_MAIN_WHITELIST:
        score += 3
    if is_sideish_like(item):
        score -= 8
    return score


def select_main_dishes(items: List[str]) -> List[str]:
    candidates = [item for item in items if not is_excluded_item(item)]
    ranked = sorted(candidates, key=lambda item: (score_item(item), len(item)), reverse=True)
    non_soup_ranked = [item for item in ranked if method(item) != "국/탕"]
    soup_ranked = [item for item in ranked if method(item) == "국/탕"]

    selected: List[str] = []
    for pool in (non_soup_ranked, soup_ranked):
        for item in pool:
            if score_item(item) < 4:
                continue
            if item not in selected and is_real_main(item):
                selected.append(item)
            if len(selected) == 2:
                return selected

    if selected:
        return selected

    fallback = sorted(candidates, key=lambda item: (score_item(item), len(item)), reverse=True)
    return fallback[:1]


def parse_calories(text: str) -> int:
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", text or "")
    return int(round(float(match.group(1)))) if match else 0


def build_recommend_name(main_dishes: List[Dict[str, str]]) -> str:
    names = [dish["dish_name"] for dish in main_dishes[:2]]
    if not names:
        return "오늘의 추천 저녁 식단"
    if len(names) == 1:
        return f"{names[0]} 정식"
    return f"{join_two(names[0], names[1])} 정식"


def prep_difficulty(main_dishes: List[Dict[str, str]]) -> str:
    names = [dish["dish_name"] for dish in main_dishes]
    methods = [dish["cooking_method"] for dish in main_dishes]
    if len(main_dishes) >= 2 and any(method_name == "튀김/전" for method_name in methods):
        return "High"
    if any(any(keyword in name for keyword in ["수제", "전골", "갈비", "찜", "돈까스", "탕수육", "스테이크", "구이", "보쌈", "족발"]) for name in names):
        return "High"
    if len(main_dishes) == 1 and any(any(keyword in name for keyword in SUBSTANTIAL_SINGLE_DISH_KEYWORDS) for name in names):
        return "Low"
    return "Mid"


def refine_row(row: Dict[str, str]) -> Dict[str, object]:
    items = split_menu(row.get("DDISH_NM", ""))
    selected_names = select_main_dishes(items)
    main_dishes = []
    proteins = []
    for name in selected_names:
        dish = {
            "dish_name": name,
            "main_ingredient": ingredient(name),
            "cooking_method": method(name),
        }
        main_dishes.append(dish)
        protein = dish["main_ingredient"]
        if protein in {"돼지고기", "소고기", "가금류", "해산물", "콩/두부"} and protein not in proteins:
            proteins.append(protein)

    return {
        "recommend_name": build_recommend_name(main_dishes),
        "original_menu": ", ".join(items),
        "calories": parse_calories(row.get("CAL_INFO", "")),
        "main_dishes": main_dishes,
        "summary_tags": {
            "has_fried": any(dish["cooking_method"] == "튀김/전" for dish in main_dishes),
            "has_spicy": any(any(keyword in dish["dish_name"] for keyword in SPICY_KEYWORDS) for dish in main_dishes),
            "main_proteins": proteins,
            "prep_difficulty": prep_difficulty(main_dishes),
        },
    }
