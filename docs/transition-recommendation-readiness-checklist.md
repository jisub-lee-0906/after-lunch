# 영양채움 전환형 추천 엔진 완성도 체크리스트

목적: 현재 영양채움의 점심→저녁 전환형 추천 로직과 부모 관점 점심 라벨(`식단 밀도`, `식단 요약`, `bridge comment`)이 운영 가능한 수준인지 판단하기 위한 최신 기준 문서다.

## 현재 판단 요약

현재 상태는 다음으로 보는 것이 가장 정확하다.
- 앱 기능 MVP: 운영 직전 수준
- taxonomy/transition rule 설계: 핵심 구조 확보 및 실데이터 검증 완료
- 추천 엔진 연결: 완료
- 대표 시나리오 검증: 완료
- 부모 관점 점심 라벨 검증: 완료
- 완성 선언: 1차 운영 가능 수준
- 남은 일: 운영 환경 점검, 피드백 루프 정리, known caveats 유지

즉, “구조가 아직 불안정한 상태”가 아니라 “운영 전 최종 정리 단계”에 가깝다.

---

## 1. 데이터셋 준비 상태

### 1-1. 운영용 분류 기준
- [x] 622개 운영 메뉴 전수 manual taxonomy override 존재
- [x] `manual_taxonomy_overrides_2025.json`이 운영 기준점 역할 수행
- [x] taxonomy 핵심 축이 문서화되어 있음
  - `meal_style`
  - `comfort_level`
  - `dinner_fit`
  - `parent_pitch`
- [x] `bridge_tags` 기준 문서화 완료
- [x] `lunch_aftertaste -> dinner_response` 매칭 테이블 문서화 완료

### 1-2. 자동 분류 안전성
- [x] classifier regression test 존재
- [x] transition-layer regression test 존재
- [ ] auto-vs-manual mismatch를 서비스 핵심 근거로 직접 노출하지 않음
- [ ] classifier mismatch 추가 감축이 필요하면 후속 과제로 분리 가능

판단:
- 현재는 “자동 분류만 100% 신뢰” 단계는 아님
- 하지만 “운영용 override + 엔진 규칙 결합” 구조로는 충분히 실전 운영 판단 가능

---

## 2. 추천 엔진 구조 상태

### 2-1. 점심 신호 추론
- [x] `summarizeLunchSignals()` 존재
- [x] `hasFried`, `hasSpicy`, `isHeavy` 추론
- [x] `mealType`, `proteinPreference`, `proteinTags`, `keywords` 추론
- [x] `lunchAftertaste` 추론 연결 완료
- [x] parent-facing `getLunchProfile(...)` 기반 whole-tray 라벨링 연결 완료

### 2-2. transition layer
- [x] `deriveLunchAftertaste()` 구현
- [x] `deriveDinnerResponse()` 구현
- [x] `buildTransitionMatchPlan()` 구현
- [x] `transitionMatchBonus()` 구현
- [x] neutral / strong / partial / weak 구분 존재

### 2-3. 현재 보정 완료 상태
- [x] `neutral` 점심을 strong으로 오판정하던 문제 수정
- [x] `rice_missing` 탐지 보강
- [x] `rice_missing`에서 `daily_stabilizer` 우대
- [x] `rice_missing`에서 `treat_continuation` 억제
- [x] `noodle_fatigue`에서 `daily_stabilizer` 우대
- [x] `noodle_fatigue`에서 `treat_continuation` 억제
- [x] `comfort_saturated` 약한 매칭 상황에서 `treat_continuation` 감점 존재
- [x] 지방감 있는 육류 메인(`오리훈제`, `삼겹살`, `편육`, `수육`) parent-facing 과소평가 보강
- [x] 고진중학교 패턴(`함박`, `삼겹살고추장구이`, `오리쌈`, `마파두부`) 보강
- [x] 인접 중학교 패턴(`순대곱창볶음`, `오향장육`, `유린기`) 보강
- [x] `기름진 편` → `기름기 있는 편` copy tone 완화
- [x] `점심이 조금 무거웠어서...` → `점심이 조금 진한 편이어서...` bridge copy 완화

판단:
- 현재 엔진은 단순 튀김/맵기 회피 수준을 넘어, “면 뒤에는 밥상형”, “맵고 무거운 뒤에는 순한 정리형”, “부모가 식판 전체를 보고 납득하는 라벨”까지 실질적으로 점수화하고 있다.

---

## 3. 대표 시나리오 검증 상태

### 3-1. 강한 전환 시나리오
- [x] `greasy_heavy + noodle_fatigue` 시나리오에서 `broth_reset`, `rice_anchor` 우선 동작 확인
- [x] `spicy_heavy + comfort_saturated` 시나리오에서 `bland_reset`, `daily_stabilizer` 우선 동작 확인
- [x] `rice_missing` 시나리오에서 `rice_anchor + daily_stabilizer` 계열 상향 확인
- [x] `noodle_fatigue` 시나리오에서 top1 `treat_continuation` 제거 확인

### 3-2. 중립 시나리오
- [x] transition 없는 점심은 `neutral`로 남음
- [x] transition bonus가 과잉 개입하지 않음

### 3-3. 점심 라벨 whole-tray 시나리오
- [x] fried-heavy tray가 단순 `담백한 편`으로 붕괴하지 않음
- [x] one-plate/starch-heavy tray가 `든든한 한 그릇형`으로 읽힘
- [x] heavy protein main tray가 `국물 있는 한 끼`에 과도하게 덮이지 않음
- [x] bridge comment가 최종 summary label과 톤 일치

판단:
- 대표 시나리오 기준으로 방향성과 부모 관점 라벨 설득력이 모두 꽤 안정적이다.

---

## 4. 실제 배치 검증 상태

검증 리포트:
- `.analysis/transition_validation_report.md`
- `.analysis/lunch_label_grounding_spotcheck.md`
- `.analysis/gojin-middle-school-focused-check.md`
- `.analysis/middle_school_label_validation_extended.md`

현재 배치 검증 결과:
- transition validation sample count: 80
- top1 fit labels:
  - `strong`: 31
  - `neutral`: 49
- transition validation flagged issues: 0

부모 관점 점심 라벨 추가 검증 결과:
- 초등학교 실데이터 표본 40건 spot-check 수행
- 초기 heuristic issue 2건(`오리훈제`, `삼겹살편육`) 확인 후 보강
- 고진중학교 집중 검증 수행
- 인접 중학교 표본 95건 확대 검증 수행
- 반복 패턴 보강 후 middle-school flagged count: 1
- 남은 1건은 calorie-only outlier 성격으로 판단

체크리스트:
- [x] 실제 NEIS 점심 데이터 기반 샘플 배치 검증 수행
- [x] top1 fit label 분포 확인
- [x] 규칙 위반 flag 조건 점검
- [x] transition 표본에서는 명시적 issue 0건
- [x] 실제 점심 샘플 50~100건 확대 검증 완료
- [x] 부모 관점 점심 라벨 40건 spot-check 완료
- [x] 특정 학교(고진중학교) 집중 검증 완료
- [x] 인접 중학교 표본 95건 확대 검증 완료

판단:
- 지금 상태는 “초기 운영 전 검토 통과”를 넘어, “1차 운영 가능한 추천 품질”에 가깝다.
- transition 품질뿐 아니라 부모 관점 점심 라벨/bridge copy까지 실데이터와 UI에서 함께 검증한 상태다.
- 추가 검증은 여전히 가치 있지만, 완성 선언을 막는 blocker 수준은 아니다.

---

## 5. 테스트/빌드 상태

- [x] `python3 -m unittest discover -s tests -p 'test_*.py' -v` 통과
- [x] 전체 96개 테스트 통과
- [x] `npm run build` 통과
- [x] `npm run verify:deploy` 통과
- [x] 추천 엔진 contract test 유지
- [x] transition scoring 관련 contract 문자열 추가 완료
- [x] 점심 라벨 whole-menu 회귀 테스트 14/14 통과

판단:
- 회귀 안정성은 꽤 좋다.
- 현재 남은 리스크는 “테스트 미비”보다 “운영 중 드물게 들어올 예외 메뉴명/칼로리 outlier” 쪽이다.

---

## 6. 완성 선언 체크리스트

아래 항목을 모두 만족하면 “실서비스용 1차 완성”이라고 부를 수 있다.

### 필수 조건
- [x] 운영용 메뉴셋(622개)과 override 기준이 고정되어 있다
- [x] taxonomy와 transition 규칙이 문서화되어 있다
- [x] transition scoring이 엔진에 연결되어 있다
- [x] neutral/strong/partial/weak 구분이 있다
- [x] rice_missing, noodle_fatigue, spicy_heavy, greasy_heavy 대표 시나리오가 모두 동작한다
- [x] 대표 시나리오에서 잘못된 top1 패턴이 주요하게 해소되었다
- [x] 배치 검증 리포트가 존재한다
- [x] 전체 테스트/빌드가 통과한다
- [x] 점심 라벨과 bridge copy가 부모 관점에서 수동 QA를 통과했다

### 권장 조건
- [x] 실제 점심 샘플 50~100건 배치 검증
- [x] 부모 관점 모바일 UI/copy 수동 리뷰
- [x] 남은 애매 사례를 `docs/known-label-caveats.md`로 문서화
- [ ] 운영 중 이상 추천 사례를 수집할 피드백 루프 설계

현재 판정:
- 필수 조건: 충족
- 권장 조건: 운영 피드백 루프 설계만 남음

결론:
- “1차 운영 가능 버전”으로는 완성권에 들어왔다.
- “더 이상 손볼 게 없는 최종형”으로 부르기엔 아직 이르지만, 남은 과제는 추천 정확도보다 운영 수집 체계 쪽이다.

---

## 7. 남은 리스크 요약

### 리스크 A. calorie-only outlier 존재
설명:
- 일부 급식은 recorded calories는 높지만 강한 메인/튀김/묵직한 단백질 신호가 약하다.
- 대표 사례는 `서현중학교 20260413`으로, 현재 `균형 잡힌 구성 / 담백한 편`으로 남아 있다.
영향:
- 낮음
권장 대응:
- 전역 calorie threshold를 성급히 올리지 말고, 반복 패턴이 쌓일 때만 재검토

### 리스크 B. special 메뉴가 일부 상황에서 다시 상승할 가능성
설명:
- 현재 `rice_missing`, `noodle_fatigue`는 많이 좋아졌지만, 다른 조합 시나리오에서 special 메뉴가 다시 오를 여지는 있다.
영향:
- 중간
권장 대응:
- `spicy_heavy + noodle_fatigue`, `greasy_heavy + comfort_saturated` 등의 교차 조합 추가 검증

### 리스크 C. auto classifier 자체의 완전 신뢰도는 아직 제한적
설명:
- 현재 구조는 override와 규칙 결합으로 실용화되었지만, classifier 자체를 단독 근거로 보긴 아직 이르다.
영향:
- 중간
권장 대응:
- 운영 중에는 override 기준을 우선 유지

### 리스크 D. 운영 중 지역/시즌별 메뉴명 변형 유입
설명:
- 현재는 초등 40건, 특정 중학교 집중 점검, 인접 중학교 95건까지는 안정적이지만 전국/학기 전체 표현 변형을 모두 포함하진 않는다.
영향:
- 중간
권장 대응:
- 운영 중 이상 사례를 수집해 keyword coverage만 점진적으로 보강

---

## 8. 추천 최종 판정

현재 추천:
- “완성형 직전”이 아니라,
- “1차 운영 가능한 완성형”으로 판단한다.

좀 더 솔직한 표현으로는:
- 추천 엔진 구조: 완성권
- 데이터 기반 전환 논리: 실서비스 투입 가능 수준
- 부모 관점 점심 라벨/bridge copy: 운영 가능 수준
- 실서비스 선언 자신감: 약 90%+

즉 지금 당장 말할 수 있는 문장:
- “핵심 로직은 거의 완성됐다.”
- “운영 시작을 막는 추천 품질 blocker는 현재 보이지 않는다.”
- “이제 남은 핵심 일은 배포/운영 준비와 운영 피드백 루프 정리다.”

---

## 9. 다음 우선순위

### 옵션 A. 현 상태 동결 후 제품화 집중
1. 현재 규칙/엔진을 동결
2. UI/카피/배포/운영 흐름에 집중
3. 추천 품질은 운영 피드백 기반으로 후속 개선

### 옵션 B. 운영 전 추가 검증 한 번 더
1. 다른 지역 학교군으로 spot-check 확대
2. top1/top3 수동 리뷰 packet 추가
3. known caveats 문서 지속 업데이트

권장:
- 현재 시점 기본 권장은 옵션 A
- 더 보수적으로 가고 싶으면 운영 직전 옵션 B를 한 번 더 수행
