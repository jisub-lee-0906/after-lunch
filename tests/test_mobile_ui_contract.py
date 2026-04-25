from pathlib import Path
import unittest


PROJECT_ROOT = Path('/home/jisub-lee/workspace/after-lunch')


class MobileMainPageContractTests(unittest.TestCase):
    def test_page_contains_minimal_parent_focused_sections(self):
        page_path = PROJECT_ROOT / 'app/page.tsx'
        self.assertTrue(page_path.exists(), 'app/page.tsx should exist')
        content = page_path.read_text(encoding='utf-8')
        engine_path = PROJECT_ROOT / 'lib/dinner-engine.ts'
        self.assertTrue(engine_path.exists(), 'lib/dinner-engine.ts should exist')
        combined_content = content + '\n' + engine_path.read_text(encoding='utf-8')

        required_strings = [
            'selectedDayLabel',
            "`${selectedDayLabel} 급식`",
            "`${selectedDayLabel} 저녁`",
            '점심 메뉴',
            '급식 메뉴',
            '식단 요약',
            '식단 밀도',
            '메뉴 추천',
            '레시피 보기',
            '10000recipe.com',
            '학교 설정',
            '학교 검색',
            '검색으로 학교를 바꿔보세요.',
            '선택 중',
            '어울리는 반찬',
            '추천 근거',
            '오늘 점심을 바탕으로 고른 메뉴예요.',
            '추천을 불러오는 중이에요.',
            '어제',
            'overflow-x-auto',
            'snap-x snap-mandatory',
            'min-w-[272px]',
            'max-w-[300px]',
            'pr-2',
            'useState',
            'Settings',
            'surface-card',
            'surface-subtle',
            'text-kicker',
            'text-display',
            'pill-muted',
            'pill-subtle',
            'meta-chip',
            'section-description',
            'icon-button',
            'setRecommendations',
            'recommendationError',
            'isLoadingRecommendations',
            'buildDinnerRecommendationPayload',
            'LOCAL_STORAGE_SELECTED_SCHOOL_KEY',
            'window.localStorage.setItem',
            'JSON.parse',
            'JSON.stringify',
        ]
        for item in required_strings:
            self.assertIn(item, combined_content)

        forbidden_strings = [
            '🍱',
            '✨',
            '🏫',
            'AI',
            'Sparkles',
            '오늘의 우리집 저녁가이드',
            'production_final_dataset_2025.json',
            '실제 서비스 데이터셋 기준',
            '캐러셀 안내',
            '데이터 기준 · 전국',
            '반복 출현 · 학교급',
            '저녁 추천 기준',
            '반찬 추천',
            'border-orange-200 bg-white text-orange-700 hover:bg-orange-50',
            'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
            'rounded-3xl border border-border bg-card text-card-foreground shadow-sm rounded-[',
            'realDinnerRecommendations.map',
            'curatedDinnerSeed',
        ]
        for item in forbidden_strings:
            self.assertNotIn(item, content)

    def test_design_tokens_are_defined_in_global_styles(self):
        globals_path = PROJECT_ROOT / 'app/globals.css'
        self.assertTrue(globals_path.exists(), 'app/globals.css should exist')
        content = globals_path.read_text(encoding='utf-8')

        required_strings = [
            ':root',
            '--page-background:',
            '--surface-card:',
            '--surface-subtle:',
            '--surface-muted:',
            '--text-strong:',
            '--text-muted:',
            '--border-soft:',
            '--shadow-card:',
            '.surface-card',
            '.surface-subtle',
            '.surface-muted',
            '.pill-muted',
            '.pill-subtle',
            '.meta-chip',
            '.text-kicker',
            '.text-display',
            '.section-description',
            '.difficulty-badge',
            '.difficulty-icon',
            '.difficulty-label',
            '.icon-button',
        ]
        for item in required_strings:
            self.assertIn(item, content)


if __name__ == '__main__':
    unittest.main()
