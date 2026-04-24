# 영양채움 최종 서비스 데이터셋 계약

파일
- 입력: `datasets/2025/app_seed_ultra_curated_2025.json`
- 출력: `datasets/2025/production_final_dataset_2025.json`
- 리포트: `datasets/2025/production_final_dataset_2025_report.json`

목표
- 앱/백엔드가 바로 적재할 수 있는 안정된 메뉴 seed 제공
- 불안정한 칼로리 프로필을 가진 메뉴 제거
- 표시 이름, 안정 ID, 품질 메타데이터를 명시적으로 포함

선정 규칙
1. ultra-curated 입력만 사용
2. 칼로리 평균은 250~1200 kcal 범위
3. 칼로리 최소값은 0 초과
4. 칼로리 최대값은 2500 이하
5. 통과 행만 production-ready 로 간주

레코드 스키마
- `menu_id`: canonical key 기반 안정 ID (`yn-<sha1 12자리>`)
- `display_name`: 앱 표시명
- `canonical_name`: 내부 기준 이름
- `main_dishes`: 대표 메인 메뉴 목록
- `protein_tags`: 단백질 태그 목록
- `attributes.spicy`: 매운맛 여부
- `attributes.fried`: 튀김 여부
- `attributes.prep_difficulty`: 조리 난이도
- `nutrition.calories.avg|min|max`: 칼로리 요약
- `popularity.occurrence_count`: 전국 반복 출현 수
- `popularity.source_group_size`: 병합된 소스 그룹 수
- `quality.school_level_coverage`: 학교급 커버 수
- `quality.calorie_profile`: `stable|variable|implausible`
- `quality.production_ready`: 서비스 투입 가능 여부
- `school_levels_seen`: 관측된 학교급 목록
- `representative_menus`: 실제 관측 메뉴 예시

해석 규칙
- `stable`: 칼로리 프로필이 합리적이고 변동폭이 크지 않음
- `variable`: 칼로리 범위는 합리적이지만 학교별 편차가 큼
- `implausible`: 최종 서비스 seed 에서 제외

권장 사용법
- MVP/초기 운영: `production_final_dataset_2025.json` 사용
- 확장 탐색/운영 후보군: `app_seed_curated_2025.json` 유지
- 운영 중 품질 개선: 제외 행(`implausible`)을 후속 정제 대상으로 재검토
