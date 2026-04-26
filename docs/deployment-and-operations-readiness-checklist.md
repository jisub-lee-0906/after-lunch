# 영양채움 배포/운영 준비 체크리스트

목적: 현재 영양채움 프로젝트를 실제로 배포하고 운영하기 전에 확인해야 할 기술/데이터/운영 항목을 최신 검증 결과 기준으로 정리한다.

## 최종 판정

현재 판정:
- 추천 엔진 핵심 로직: 운영 가능 수준
- transition-aware 추천 품질: 1차 운영 가능 수준
- 부모 관점 점심 라벨/copy: 운영 가능 수준
- 배포 준비도: 체크리스트 기준으로 높음
- 추천 품질 리스크: 낮아졌지만 운영 피드백 루프는 여전히 필요

핵심 근거:
- 622개 운영 메뉴셋 + manual override 전수 반영
- transition-aware scoring 엔진 연결 완료
- 전체 96개 테스트 통과
- `npm run verify:deploy` 통과
- 실제 NEIS 점심 샘플 80건 확대 검증 완료
- 확대 검증 결과 issue row 0건
- 점심 라벨 40건 spot-check 완료
- 고진중학교 집중 검증 및 인접 중학교 95건 확대 검증 완료
- 남은 flagged row는 1건이며 calorie-only outlier 성격으로 판단

즉 지금은
- “더 연구가 필요한 프로토타입” 단계는 아니고,
- “배포 가능한 1차 운영 버전”으로 보는 것이 맞다.

---

## 1. 배포 전 필수 체크

### 1-1. 환경변수
- [x] `.env`에 `NEIS_API_KEY` 존재
- [x] API 키는 gitignored 로컬 파일에만 저장
- [ ] 실제 배포 환경(Vercel 등)에 `NEIS_API_KEY` 등록
- [ ] 배포 환경에서 API 키가 정상 주입되는지 확인

### 1-2. 빌드/실행
- [x] `npm run build` 통과
- [x] `npm run verify:deploy` 통과
- [ ] 배포 대상 환경에서 production start smoke test
- [ ] `/api/schools` 응답 확인
- [ ] `/api/lunch` 응답 확인
- [ ] `/api/recommendations` 응답 확인
- [ ] 점심 없는 날 `/api/recommendations/fallback` 응답 확인

### 1-3. 데이터 자산
- [x] `datasets/2025/production_final_dataset_2025.json` 존재
- [x] `datasets/2025/manual_taxonomy_overrides_2025.json` 존재
- [x] 운영용 메뉴셋 622개 기준 정리 완료
- [ ] 데이터 파일 크기/배포 번들 영향 마지막 확인

---

## 2. 추천 품질 체크

### 2-1. 현재 완료된 검증
- [x] 대표 시나리오 검증 완료
  - `spicy_heavy`
  - `greasy_heavy`
  - `noodle_fatigue`
  - `rice_missing`
  - `neutral`
- [x] `neutral` 오판정 수정 완료
- [x] `rice_missing` 탐지 보강 완료
- [x] `rice_missing`의 `daily_stabilizer` 우대 완료
- [x] `noodle_fatigue`의 `treat_continuation` 억제 완료
- [x] whole-tray 점심 라벨링 도입 완료
- [x] bridge comment 톤 QA 완료

### 2-2. 확대 검증 결과 반영
- [x] 확대 검증 리포트 존재
  - `.analysis/transition_validation_report_extended.md`
- [x] 점심 라벨 grounding 리포트 존재
  - `.analysis/lunch_label_grounding_spotcheck.md`
  - `.analysis/gojin-middle-school-focused-check.md`
  - `.analysis/middle_school_label_validation_extended.md`
- [x] sample count 80
- [x] top1 fit labels
  - `strong`: 31
  - `neutral`: 49
- [x] issue row count 0
- [x] `noodle_fatigue` 표본에서 top1 `treat_continuation` 0건
- [x] 지방감 있는 육류 메인 과소평가(`오리훈제`, `삼겹살편육`) 보강 완료
- [x] 고진중학교 반복 과소평가 패턴(`함박`, `삼겹살고추장구이`, `오리쌈`, `마파두부`) 보강 완료
- [x] 인접 중학교 반복 패턴(`순대곱창볶음`, `오향장육`, `유린기`) 보강 완료
- [x] bridge copy tone 완화(`점심이 조금 진한 편이어서...`)까지 UI에서 확인 완료

### 2-3. 배포 전 권장 수동 리뷰
- [x] 부모 관점 lunch label/copy 모바일 QA 수행
- [ ] 상위 추천 결과 20~30건 수동 확인
- [ ] 학부모 관점으로 “너무 특별한 메뉴가 뜨지 않는지” 확인
- [ ] fallback 추천이 지나치게 반복적이지 않은지 확인

---

## 3. UI/제품 동작 체크

### 3-1. 실제 사용자 흐름
- [x] 학교 검색 → 학교 선택 → 날짜 이동 → 점심 조회 → 저녁 추천 전체 플로우 로컬 확인
- [ ] 선택 학교 localStorage 복원 확인
- [ ] 점심 없는 날 안내 문구 확인
- [ ] fallback 추천 흐름 확인
- [ ] recipe 링크 동작 확인

### 3-2. 모바일 품질
- [x] 360px ~ 480px 구간 핵심 카드/카피 시각 QA 수행
- [ ] recommendation carousel overflow/clipping 확인
- [x] recommendation copy density 재확인
- [ ] school modal 검색 usability 확인

---

## 4. 운영 준비 체크

### 4-1. 장애 대응
- [ ] NEIS API 실패 시 사용자 메시지 적절한지 확인
- [ ] lunch not found 시 fallback 동작 확인
- [ ] empty state / error state 스크린샷 기준 검수

### 4-2. 관측성
- [ ] 운영 중 이상 추천 사례를 기록할 경로 결정
- [ ] 최소한의 사용자 피드백 수집 방법 정의
- [ ] 문제 사례 발생 시 lunch menu + top3 recommendation을 재현 가능한 형태로 남길 방법 정의

### 4-3. 유지보수
- [ ] 새 학기/새 시즌에 메뉴셋 재검토 주기 정하기
- [ ] override 수정 프로세스 정하기
- [x] known caveats 문서화

---

## 5. 남은 리스크

### 리스크 A. 전국 전체 케이스 완전 대표는 아님
설명:
- 80건 검증은 강한 근거이지만, 모든 계절/학교/지역/메뉴 조합을 대변하진 않음.
대응:
- 운영 중 이상 사례 수집
- 샘플 검증 점진 확대

### 리스크 A-1. calorie-only outlier 소수 잔존
설명:
- `서현중학교 20260413`처럼 recorded calories는 높지만 tray-level heaviness 근거가 약한 케이스가 남아 있다.
- 현재는 과적합 방지를 위해 전역 calorie threshold를 더 세게 조정하지 않았다.
대응:
- `docs/known-label-caveats.md` 기준으로 운영 중 유사 사례 누적 여부를 본 뒤 재판단

### 리스크 B. 수작업 override 유지보수 부담
설명:
- 현재 품질은 override 기준이 큰 역할을 함.
대응:
- override 수정 프로세스 명확화
- 운영 중 자주 문제되는 메뉴만 선별 업데이트

### 리스크 C. UI보다 운영 피드백 루프가 더 중요해짐
설명:
- 지금부터는 추천 규칙 자체의 대형 결함보다 “현장 선호와의 미세 차이”가 더 중요한 단계임.
대응:
- 피드백 루프 우선 설계

---

## 6. 배포 Go / No-Go 기준

### Go 조건
아래를 만족하면 배포 진행 가능:
- [x] 테스트 통과
- [x] build/verify 통과
- [x] transition rule 80건 확대 검증 완료
- [x] 명시적 issue row 0건
- [x] 점심 라벨 40건 + 중학교 95건 추가 검증 완료
- [ ] production 환경 환경변수 등록 완료
- [ ] production smoke test 완료
- [ ] 핵심 모바일 화면 수동 확인 완료

### No-Go 조건
아래 중 하나라도 있으면 배포 보류:
- [ ] production API route 오류
- [ ] recommendation endpoint 응답 실패
- [ ] 점심 없는 날 fallback 오류
- [ ] 모바일 주요 레이아웃 붕괴
- [ ] 운영자가 설명하기 어려운 이상 추천 다수 발견

현재 판정:
- 코드/데이터/추천 품질 기준으로는 Go 쪽
- 남은 것은 주로 배포 환경/운영 절차 확인

---

## 7. 지금 바로 권장하는 실행 순서

1. 배포 환경에 `NEIS_API_KEY` 등록
2. production 배포 후 API smoke test
3. 모바일 실기기/브라우저 최종 확인
4. `docs/known-label-caveats.md` 기준으로 운영 관찰 항목 공유
5. 운영 시작
6. 이상 추천 사례 수집 루프 붙이기

---

## 8. 최종 한 줄 결론

현재 영양채움은 “추천 로직 때문에 배포를 미뤄야 하는 상태”는 아니다.
남은 것은 추천 엔진 연구보다, 배포 환경 점검과 운영 준비다.
