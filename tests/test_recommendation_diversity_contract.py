from pathlib import Path
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class RecommendationDiversityContractTests(unittest.TestCase):
    def test_engine_adds_diversity_selection_layer_for_final_recommendations(self):
        engine_path = PROJECT_ROOT / 'lib/dinner-engine.ts'
        self.assertTrue(engine_path.exists(), 'lib/dinner-engine.ts should exist')
        content = engine_path.read_text(encoding='utf-8')

        required_strings = [
            'selectDiverseRecommendations',
            'seenProteinTags',
            'seenMealCategories',
            'candidatePoolSize',
            'dinner.protein_tags.some',
            'SOUP_KEYWORDS.some',
            '추천 다양성',
        ]
        for item in required_strings:
            self.assertIn(item, content)


if __name__ == '__main__':
    unittest.main()
