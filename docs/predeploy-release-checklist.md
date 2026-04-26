# 영양채움 predeploy release checklist

## Code and repo hygiene
- [x] `.next/`, `__pycache__/`, `*.tsbuildinfo` removed or ignored
- [x] `.env` kept local and gitignored
- [x] `.analysis/` kept untracked
- [x] machine-specific absolute test paths removed from active contract tests

## Verification commands
- [x] `npm run lint`
- [x] `npm run test:runtime`
- [x] `python3 -m unittest discover -s tests -p 'test_*.py' -v`
- [x] `npm run build`
- [x] `npm run verify:deploy`

## API and data guardrails
- [x] `/api/lunch` rejects invalid date format with 400
- [x] `/api/recommendations` rejects invalid date format with 400
- [x] production dataset generator supports explicit input-path override in code path resolution
- [x] shipped production dataset/report schema is verified against current generator expectations

## Local smoke before deploy
- [x] start fresh app on local production-like server (verified on port 3001 because a separate 3000 listener was already in use)
- [x] smoke `/api/schools`
- [x] smoke `/api/lunch`
- [x] smoke `/api/recommendations`
- [x] smoke `/api/recommendations/fallback`
- [x] browser/HTTP check homepage response

## Latest verified sample
- school query: `고진중학교`
- lunch sample: `officeCode=J10&schoolCode=7751396&date=20260424`
- fallback sample: `/api/recommendations/fallback`

## Release note
Repo is ready for real deployment smoke in the target environment; remaining checks are environment injection and live endpoint verification.
