# 영양채움 (After Lunch)

학교 점심 메뉴를 바탕으로 저녁 메뉴를 추천하는 Next.js 애플리케이션입니다. 런타임은 커밋된 `datasets/2025/production_final_dataset_2025.json`만 읽습니다.

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
