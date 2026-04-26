from pathlib import Path
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class RecommendationClassificationContractTests(unittest.TestCase):
    def test_engine_uses_protein_tags_and_refined_meal_types_in_scoring(self):
        engine_path = PROJECT_ROOT / 'lib/dinner-engine.ts'
        self.assertTrue(engine_path.exists(), 'lib/dinner-engine.ts should exist')
        content = engine_path.read_text(encoding='utf-8')

        required_strings = [
            'mealType',
            'proteinPreference',
            'proteinTags',
            'primaryProteinKeywords',
            'starchHeavyKeywords',
            'heartySoupKeywords',
            'proteinDiversityBonus',
            '콩/두부',
            '해산물',
            '가금류',
            '돼지고기',
            '소고기',
            'dinner.protein_tags',
        ]
        for item in required_strings:
            self.assertIn(item, content)


if __name__ == '__main__':
    unittest.main()
