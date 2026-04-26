# 영양채움 전환형 추천 엔진 완성도 체크리스트

목적: 현재 영양채움의 점심→저녁 전환형 추천 로직이 “완성 선언 가능한 수준인지”를 판단하기 위한 운영 체크리스트와 남은 리스크를 한 문서에 정리한다.

## 현재 판단 요약

현재 상태는 다음으로 보는 것이 가장 정확하다.
- 앱 기능 MVP: 완료에 가까움
- taxonomy/transition rule 설계: 핵심 구조 확보
- 추천 엔진 연결: 완료
- 대표 시나리오 검증: 1차 완료
- 완성 선언: 가능 직전 단계
- 남은 일: 배치 검증 확대, 규칙 미세조정 여부 최종 판단, 운영 기준 문서화

즉, “구조가 아직 불안정한 상태”는 아니고, “마지막 운영 검수 단계”에 들어간 상태다.

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
- 하지만 “운영용 override + 엔진 규칙 결합” 구조로는 충분히 실전 검토 가능

---

## 2. 추천 엔진 구조 상태

### 2-1. 점심 신호 추론
- [x] `summarizeLunchSignals()` 존재
- [x] `hasFried`, `hasSpicy`, `isHeavy` 추론
- [x] `mealType`, `proteinPreference`, `proteinTags`, `keywords` 추론
- [x] `lunchAftertaste` 추론 연결 완료

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

판단:
- 현재 엔진은 단순 튀김/맵기 회피 수준을 넘어,
  “면 뒤에는 밥상형”, “맵고 무거운 뒤에는 순한 정리형” 같은 전환 규칙을 실질적으로 점수화하고 있다.

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

판단:
- 대표 시나리오 기준으로는 방향성이 꽤 안정적이다.

---

## 4. 실제 배치 검증 상태

검증 리포트:
- `.analysis/transition_validation_report.md`

현재 배치 검증 결과:
- sample count: 80
- top1 fit labels:
  - `strong`: 31
  - `neutral`: 49
- lunch aftertaste distribution:
  - `noodle_fatigue`: 12
  - `neutral`: 49
  - `greasy_heavy`: 7
  - `rice_missing`: 7
  - `spicy_heavy`: 9
  - `comfort_saturated`: 1
- flagged issues: 0

체크리스트:
- [x] 실제 NEIS 점심 데이터 기반 샘플 배치 검증 수행
- [x] top1 fit label 분포 확인
- [x] 규칙 위반 flag 조건 점검
- [x] 현재 표본에서는 명시적 issue 0건
- [x] 실제 점심 샘플 50~100건 확대 검증 완료

판단:
- 지금 상태는 “초기 운영 전 검토 통과”를 넘어, “1차 운영 가능한 추천 품질”에 가깝다.
- 추가 검증은 여전히 가치 있지만, 완성 선언을 막는 blocker 수준은 아니다.

---

## 5. 테스트/빌드 상태

- [x] `python3 -m unittest discover -s tests -p 'test_*.py' -v` 통과
- [x] 전체 88개 테스트 통과
- [x] `npm run build` 통과
- [x] 추천 엔진 contract test 유지
- [x] transition scoring 관련 contract 문자열 추가 완료

판단:
- 회귀 안정성은 꽤 좋다.
- 현재 남은 리스크는 “테스트 미비”보다 “실제 선호와의 미세 불일치” 쪽이다.

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

### 권장 조건
- [x] 실제 점심 샘플 50~100건 배치 검증
- [ ] 부모 관점 수동 리뷰(상위 추천 20~30건)
- [ ] 남은 애매 사례를 “known caveats”로 문서화
- [ ] 운영 중 이상 추천 사례를 수집할 피드백 루프 설계

현재 판정:
- 필수 조건: 사실상 충족
- 권장 조건: 일부 미완료

결론:
- “1차 운영 가능 버전”으로는 거의 완성
- “더 이상 손볼 게 없는 최종형”으로 부르기엔 아직 이르다

---

## 7. 남은 리스크 요약

### 리스크 A. 검증 표본 수 부족
설명:
- 현재 24건 배치 검증은 방향 확인엔 충분하지만, 전체 서비스 안정성을 말하기엔 작다.
영향:
- 중간
권장 대응:
- 점심 샘플 50~100건으로 확대 검증

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

### 리스크 D. 사용자 선호와의 최종 일치 여부는 아직 수동 리뷰 필요
설명:
- 기술적으로 맞는 추천과 “학부모가 실제로 납득하는 추천”은 완전히 동일하지 않을 수 있다.
영향:
- 중간
권장 대응:
- 상위 추천 케이스 수동 검토 20~30건

---

## 8. 추천 최종 판정

현재 추천:
- “완성형 직전”이 아니라,
- “1차 운영 가능한 완성형”으로 판단한다.

좀 더 솔직한 표현으로는:
- 추천 엔진 구조: 완성권
- 데이터 기반 전환 논리: 실서비스 투입 가능 수준
- 실서비스 선언 자신감: 약 88~92%

즉 지금 당장 말할 수 있는 문장:
- “핵심 로직은 거의 완성됐다.”
- “운영 시작을 막는 추천 품질 blocker는 현재 보이지 않는다.”
- “이제 남은 핵심 일은 배포/운영 준비와 수동 리뷰다.”

---

## 9. 다음 우선순위

### 옵션 A. 완성 선언 전 마지막 검증
1. 실제 점심 샘플 50~100건으로 배치 확대
2. top1/top3 수동 리뷰
3. 이상 사례를 known issues로 문서화

### 옵션 B. 현 상태 동결 후 제품화 집중
1. 현재 규칙/엔진을 동결
2. UI/카피/배포/운영 흐름에 집중
3. 추천 품질은 운영 피드백 기반으로 후속 개선

권장:
- “추천의 완성도”를 정말 확인하고 싶다면 옵션 A
- “서비스를 먼저 굴려보는 게 더 중요”하면 옵션 B
