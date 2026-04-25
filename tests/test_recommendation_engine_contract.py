from pathlib import Path
import unittest


PROJECT_ROOT = Path('/home/jisub-lee/workspace/after-lunch')


class RecommendationEngineContractTests(unittest.TestCase):
    def test_engine_helper_and_route_exist(self):
        engine_path = PROJECT_ROOT / 'lib/dinner-engine.ts'
        route_path = PROJECT_ROOT / 'app/api/recommendations/route.ts'
        fallback_route_path = PROJECT_ROOT / 'app/api/recommendations/fallback/route.ts'

        for path in [engine_path, route_path, fallback_route_path]:
            self.assertTrue(path.exists(), f'{path} should exist')

        engine_content = engine_path.read_text(encoding='utf-8')
        route_content = route_path.read_text(encoding='utf-8')
        fallback_content = fallback_route_path.read_text(encoding='utf-8')
        combined = '\n'.join([engine_content, route_content, fallback_content])

        required_strings = [
            'buildDinnerRecommendationPayload',
            'buildFallbackDinnerRecommendations',
            'scoreDinnerCandidate',
            'summarizeLunchSignals',
            'mealType',
            'proteinPreference',
            'proteinTags',
            'primaryProteinKeywords',
            'starchHeavyKeywords',
            'heartySoupKeywords',
            'proteinDiversityBonus',
            'selectDiverseRecommendations',
            'seenProteinTags',
            'seenMealCategories',
            'candidatePoolSize',
            'dinner.protein_tags',
            'fetchSchoolLunch',
            'NextResponse.json',
            'productionDataset',
            'recommendations',
            'reason',
            'score',
            'keywords',
            'prep_difficulty',
            'production_ready',
        ]
        for item in required_strings:
            self.assertIn(item, combined)

    def test_page_uses_live_recommendation_engine_endpoint(self):
        page_path = PROJECT_ROOT / 'app/page.tsx'
        self.assertTrue(page_path.exists(), 'app/page.tsx should exist')
        content = page_path.read_text(encoding='utf-8')

        required_strings = [
            "'/api/recommendations?officeCode='",
            "'/api/recommendations/fallback'",
            'setRecommendations',
            'isLoadingRecommendations',
            'recommendationError',
            'isFallbackRecommendationMode',
            '점심 없이 저녁 추천 보기',
            '오늘 급식 정보가 없어요.',
            '추천을 불러오는 중이에요.',
            'schoolName',
            'bridge-card',
            'bridgeComment',
            '메뉴 추천',
            '어제 보기',
            '내일 보기',
        ]
        for item in required_strings:
            self.assertIn(item, content)

        forbidden_strings = [
            'realDinnerRecommendations.map',
            'curatedDinnerSeed',
        ]
        for item in forbidden_strings:
            self.assertNotIn(item, content)


if __name__ == '__main__':
    unittest.main()
