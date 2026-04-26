# 영양채움 메뉴 분류축 v1

목적: 622개 운영 메뉴를 부모 관점에서 더 일관되게 해석하고, 추천/설명/UI에 재사용 가능한 taxonomy를 만든다.

분류축
- meal_style
  - soup_set: 국/탕 중심 한 끼
  - stew_set: 찌개 중심 한 끼
  - noodle_soup_set: 수제비/쌀국수/칼국수류
  - one_plate: 볶음밥/덮밥/카레/오므라이스 등 한 그릇형
  - braised_set: 찜/조림 중심 메인요리형
  - main_side_set: 메인 반찬 중심 일반 식사형
- comfort_level
  - light: 상대적으로 가볍게 보기 좋은 한 끼
  - balanced: 무난하게 이어가기 좋은 한 끼
  - hearty: 든든하게 느껴질 가능성이 큰 한 끼
- dinner_fit
  - everyday: 평일 저녁으로 무난한 메뉴
  - flexible: 취향/상황 따라 고르기 좋은 메뉴
  - special: 손이 조금 가거나 별미 느낌이 있는 메뉴
- parent_pitch
  - 부모가 한눈에 이해할 수 있는 한 줄 설명

운영 원칙
- 분류는 급식을 평가하거나 폄하하지 않는다.
- 영양학적 단정 대신 부모 관점의 식사 인상/저녁 연결성을 표현한다.
- 자동 분류를 기본으로 하되, 모호한 메뉴는 수작업 override로 보정한다.
- 자동 분류는 문자열 1개가 아니라 메뉴 조합, 메인 강도, 칼로리, 출현 빈도를 함께 본다.

현재 상태
- `datasets/2025/manual_taxonomy_overrides_2025.json`
- 622개 운영 메뉴 전수 수작업 보정 완료
- 자동 분류 기준도 3차까지 강화되어 override와의 차이를 줄이는 방향으로 정리됨

실제 자동 분류 기준

1. meal_style
기본 의도
- 부모가 보기엔 “국물 중심인지”, “찌개 중심인지”, “한 그릇인지”, “메인 반찬 중심인지”가 더 중요하다.

우선순위
1) 한 그릇형
- `덮밥`, `볶음밥`, `비빔밥`, `카레`, `오므라이스` 포함 시 `one_plate`

2) 찌개형 우선
- `찌개`, `순두부`, `마라탕` 포함 시 `stew_set`
- `짬뽕순두부찌개`처럼 `짬뽕`이 있어도 실제 찌개면 `stew_set`

3) 국수 국물형
- `짬뽕`은 찌개류가 아닐 때만 `noodle_soup_set`
- `쌀국수`, `수제비`, `칼국수`는 `noodle_soup_set`

4) 달걀/계란 반찬형 예외
- `달걀찜`, `계란찜`, `달걀말이`, `계란말이`, `연두부달걀찜`은 `main_side_set`
- 이유: 부모 관점에서 찜/조림 메인요리보다는 반찬형 메인에 가깝다.

5) 찜/조림 메인형
- `조림`, `찜`, `갈비찜`, `안동찜닭`은 기본적으로 `braised_set`
- 단, 위 달걀/계란 반찬형 예외는 제외

6) 메인+국 조합 보정
- 대표 메뉴가 2개 이상이고 아래 강한 메인 키워드가 있으면 `main_side_set`
- 강한 메인 키워드:
  - `불고기`, `제육`, `닭갈비`, `돈까스`, `치킨까스`, `스테이크`, `구이`, `강정`, `수육`, `보쌈`, `떡갈비`, `볶음`, `장조림`
- 예:
  - `제육볶음과 건새우아욱된장국 정식` -> `main_side_set`
  - `오삼불고기와 쇠고기무국 정식` -> `main_side_set`

7) 그 외 국/탕형
- `탕`, `국` 포함 시 `soup_set`
- 마지막 fallback은 `main_side_set`

2. comfort_level
기본 의도
- 부모가 체감하는 “가벼움/무난함/든든함”을 표현한다.
- 단순 칼로리만 보지 않고 메뉴 성격도 함께 본다.

hearty로 보내는 경우
- `has_fried`가 true
- 아래 키워드 포함:
  - `갈비탕`, `갈비찜`, `부대찌개`, `삼계탕`, `곰탕`, `설렁탕`, `닭갈비`, `치킨텐더`, `떡갈비`, `강정`
- `has_spicy`이고 `calories_avg >= 780`
- `calories_avg >= 820`

light로 보내는 경우
- 아래 키워드 포함 + `calories_avg <= 700`
  - `된장국`, `맑은국`, `계란국`, `어묵국`, `미역국`, `두부`, `연두부`, `아욱국`
- 또는 `calories_avg <= 650`

그 외는 `balanced`

예시
- `한우갈비탕 정식` -> `hearty`
- `팽이된장국 정식` -> `light`
- `참치마요덮밥 정식` -> `balanced`

3. dinner_fit
기본 의도
- 부모가 보기엔 “매일 저녁에 무난한지”, “상황 따라 고를지”, “조금 특별한지”가 중요하다.
- 난이도, 메뉴 성격, 출현 빈도를 함께 본다.

special로 보내는 경우
- `prep_difficulty == High`
- 또는 아래 키워드 포함:
  - `갈비탕`, `갈비찜`, `안동찜닭`, `연어스테이크`, `삼계탕`, `설렁탕`, `곰탕`, `전골`, `마라탕`

one_plate 예외
- `덮밥`, `볶음밥`, `비빔밥`, `카레`, `오므라이스` 계열이면서
- `has_fried` 또는 `has_spicy`면 `flexible`
- 이유: 익숙한 한 그릇이어도 자극감/만족감이 강하면 everyday로 과도하게 보내지 않기 위함

example everyday 규칙
- `occurrence_count >= 180` -> `everyday`
- `occurrence_count >= 100` 이고 아래 everyday 키워드 포함 -> `everyday`
  - `덮밥`, `볶음밥`, `불고기`, `제육`, `된장국`, `된장찌개`, `미역국`, `어묵국`, `계란국`, `수육`, `장조림`, `두부조림`, `달걀찜`, `계란찜`
- above everyday 키워드 포함 + `prep_difficulty == Low` -> `everyday`

나머지는 `flexible`

예시
- `참치마요덮밥 정식` -> `everyday`
- `김치볶음밥과 계란후라이 정식` -> `flexible`
- `달걀찜 정식` -> `everyday`
- `한우갈비탕 정식` -> `special`

4. bridge_tags
기본 의도
- 이 축은 “점심을 먹고 난 뒤 저녁에 어떤 방향이 당길지”를 설명하기 위한 보조 기준이다.
- 즉 정적 taxonomy와 별도로, 저녁 메뉴가 어떤 전환 역할을 하는지 표현한다.
- 아직 추천 엔진에 직접 연결하지는 않았고, 기준 정의와 데이터 표현을 먼저 정리하는 단계다.

현재 태그
- `rice_anchor`
  - 국수/한 그릇 점심 다음에 밥 중심 저녁으로 전환하기 좋은 메뉴
  - 기본적으로 `main_side_set`, `braised_set` 쪽에서 잡힘
- `spice_reset`
  - 맵고 짠 점심 다음에 자극을 낮추기 좋은 메뉴
  - 비매운 메뉴에서 주로 부여
- `grease_reset`
  - 기름진 점심 다음에 담백하게 전환하기 좋은 메뉴
  - 비튀김 + `light` 또는 `soup_set/stew_set` 계열에서 주로 부여
- `daily_reset`
  - 평일 저녁으로 무난하게 수습하기 좋은 메뉴
  - `everyday` 또는 `light` 성격에서 주로 부여
- `comfort_push`
  - 반대로 저녁도 만족감 있게 밀어붙이는 메뉴
  - `hearty` + `special` 또는 튀김/한그릇형 만족감이 강한 메뉴에서 부여

예시 해석
- `콩가루배추국 정식`
  - `spice_reset`, `grease_reset`, `daily_reset`
- `제육볶음과 건새우아욱된장국 정식`
  - `rice_anchor`, `daily_reset`
- `치킨텐더와 카레라이스 정식`
  - `comfort_push`

5. lunch_aftertaste -> dinner_response 매칭 테이블
기본 의도
- 점심 상태(`lunch_aftertaste`)와 저녁 역할(`dinner_response`)을 직접 연결하는 우선순위 표다.
- taxonomy 자체보다 더 중요한 것은 “점심을 먹고 나서 저녁에 무엇으로 회복/전환/연결할지”다.
- 이 표는 추천 엔진 연결 전 단계의 기준표이며, 지금은 우선순위와 적합도 판단을 명시하는 역할을 한다.

점심 상태 정의
- `spicy_heavy`
  - 맵고 자극적이면서 무게감이 큰 점심
  - 저녁은 자극을 낮추고 일상적인 안정감을 주는 방향이 우선
- `greasy_heavy`
  - 튀김/기름짐 중심의 무거운 점심
  - 저녁은 국물/담백함 쪽으로 정리하는 방향이 우선
- `noodle_fatigue`
  - 면 위주 점심으로 밥 기반 균형이 비는 상태
  - 저녁은 밥 중심 앵커가 우선
- `rice_missing`
  - 덮밥/볶음밥 같은 한 그릇 점심 뒤, 일반식/반찬식 저녁이 당길 수 있는 상태
  - 저녁은 밥상형 앵커가 우선
- `comfort_saturated`
  - 맵고/기름지고/만족감 강한 점심으로 이미 자극과 포만이 충분한 상태
  - 저녁은 무난한 안정화가 우선, treat 연장은 후순위

저녁 역할 정의
- `bland_reset`
  - 자극을 낮추는 순한 리셋
- `broth_reset`
  - 국물/찌개 중심으로 기름짐을 정리하는 리셋
- `rice_anchor`
  - 밥상형 저녁으로 식사 축을 다시 잡아주는 역할
- `daily_stabilizer`
  - 평일 저녁으로 무난하게 수습하는 역할
- `treat_continuation`
  - 만족감과 보상감을 이어가는 역할

현재 우선 매칭 규칙
- `spicy_heavy`
  - 1순위: `bland_reset`
  - 2순위: `daily_stabilizer`
  - 후순위 허용: `broth_reset`
  - 비권장: `treat_continuation`
- `greasy_heavy`
  - 1순위: `broth_reset`
  - 2순위: `daily_stabilizer`
  - 후순위 허용: `bland_reset`
  - 비권장: `treat_continuation`
- `noodle_fatigue`
  - 1순위: `rice_anchor`
  - 2순위: `daily_stabilizer`
  - 후순위 허용: `broth_reset`
- `rice_missing`
  - 1순위: `rice_anchor`
  - 2순위: `daily_stabilizer`
- `comfort_saturated`
  - 1순위: `daily_stabilizer`
  - 2순위: `bland_reset` 또는 `broth_reset`
  - 후순위 허용: `rice_anchor`
  - 비권장: `treat_continuation`

조합 규칙
- `spicy_heavy + comfort_saturated`
  - 핵심 필요: `bland_reset`, `daily_stabilizer`
- `greasy_heavy + noodle_fatigue`
  - 핵심 필요: `broth_reset`, `rice_anchor`
- `greasy_heavy + comfort_saturated`
  - 핵심 필요: `broth_reset`, `daily_stabilizer`
- `spicy_heavy + noodle_fatigue`
  - 핵심 필요: `bland_reset`, `rice_anchor`

적합도 라벨
- `strong`
  - 현재 점심 상태의 핵심 필요 2개 이상을 그대로 만족
- `partial`
  - 핵심 필요 중 일부만 맞거나, 핵심은 아니지만 완전히 어긋나지는 않음
- `weak`
  - 핵심 필요를 거의 만족하지 못함

6. parent_pitch
기본 의도
- 세부 taxonomy를 부모가 즉시 이해할 수 있는 한 문장으로 바꾼다.

현재 생성 원칙
- `one_plate` -> `한 그릇으로 보기 좋은 메뉴`
- `soup_set`, `noodle_soup_set` -> `국물 중심으로 보기 좋은 한 끼`
- `stew_set` -> `찌개 중심으로 보기 좋은 한 끼`
- `braised_set` -> `메인요리 중심으로 보기 좋은 한 끼`
- 그 외 `main_side_set`
  - `light` -> `부담 없이 고르기 좋은 한 끼`
  - `hearty` -> `든든하게 이어가기 좋은 한 끼`
  - default -> `집밥처럼 이어가기 좋은 한 끼`

남아 있는 과제
- 자동 분류와 전수 override의 차이가 아직 남아 있는 패턴을 계속 줄인다.
- 특히 아래 경계를 더 다듬는 것이 다음 우선순위다.
  1. `soup_set` vs `main_side_set`
  2. `balanced` vs `light/hearty`
  3. `everyday` vs `flexible`

검증 기준
- `tests/test_final_production_dataset.py`
- 현재 taxonomy 전용 회귀 테스트 포함
  - 메인+국 조합
  - 계란/달걀 반찬형
  - 짬뽕순두부찌개
  - everyday/flexible 경계
  - 곰탕/갈비탕류 comfort/dinner_fit

현재 권장 운영
- 자동 분류는 계속 개선하되, 사용자-facing 품질 기준은 여전히 override가 최종 기준이다.
- 자동 분류기가 override와 더 가까워질수록 유지보수 비용이 줄어든다.
