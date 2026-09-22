# 영양채움 (After Lunch)

학교 점심 메뉴를 바탕으로 저녁 메뉴를 추천하는 Next.js 애플리케이션입니다. 런타임은 커밋된 `datasets/2025/production_final_dataset_2025.json`만 읽습니다.

## 공개 준비 상태

- 상태: **개발 중 애플리케이션**. 기존 로컬 검증 기록에는 TypeScript 검사, 런타임 테스트 29개, Python 테스트 97개(선택 fixture 2개 skip), production build 통과가 있습니다.
- 이 근거는 로컬 테스트·빌드 검증입니다. 실서비스 동작, 브라우저 E2E와 실제 NEIS 호출은 검증되지 않았습니다.
- 2026-09-23 lockfile 의존성 감사 결과는 보고된 취약점 0건입니다. 이는 개발 서버·배포 환경의 운영 통제를 대신하지 않습니다.

## 로컬 실행

```bash
npm ci --ignore-scripts
npm run lint
npm run test:runtime
python -m unittest discover -s tests -p 'test_*.py' -v
npm run build
npm run dev
```

`npm run verify:deploy`는 위의 TypeScript 검사, 런타임 테스트, Python 테스트, production build를 차례로 실행합니다. `npm run start`는 먼저 `npm run build`가 필요합니다.

## 구조

- `app/`: 화면과 API route
- `lib/`: NEIS 조회, 추천 엔진, 추천 이력
- `datasets/2025/production_final_dataset_2025.json`: 배포에 필요한 소형 런타임 데이터
- `scripts/`: 데이터 정제·생성 도구
- `tests/`: 런타임, 계약, 데이터 파이프라인 회귀 테스트

## 데이터와 실행 한계

데이터 생성 스크립트는 원본 급식 데이터와 수동 taxonomy override, 생성 리포트를 필요로 할 수 있습니다. 이 대형·생성 산출물은 기본적으로 Git에서 제외되며, 없는 깨끗한 체크아웃에서는 관련 회귀 검사가 `skip`됩니다. 원본 데이터 재생성에는 별도 입력 데이터가, 외부 NEIS API 사용에는 해당 환경 설정과 네트워크 연결이 필요합니다.

정적 검사와 build 통과는 외부 API 가용성, 실제 학교 데이터 최신성, 추천 품질, 운영 배포를 검증하지 않습니다. API smoke test나 데이터 재생성은 별도 테스트 환경과 준비된 입력 데이터에서 수행해야 합니다.

## 자동 검증 현황 (2026-09-23)

GitHub Actions 워크플로와 실행 기록은 없습니다. 위 로컬 테스트·빌드 기록을 원격 CI 통과로 해석하지 마세요.

Vercel은 직전 보안 커밋 [`9b665d6`](https://github.com/jisub-lee-0906/after-lunch/commit/9b665d6545552f97df183683d5fd95a5b8ec874c)의 배포 완료 상태를 보고했습니다. 실제 서비스 기능이나 E2E 동작까지 확인한 것은 아닙니다.
