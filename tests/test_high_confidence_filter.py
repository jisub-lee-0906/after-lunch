import unittest

from scripts.high_confidence_filter import filter_high_confidence_rows


class HighConfidenceFilterTests(unittest.TestCase):
    def test_keeps_clear_two_main_row(self):
        rows = [
            {
                "recommend_name": "수제닭다리살구이와 김치수제비국 정식",
                "original_menu": "칼슘강화잡곡밥, 김치수제비국, 수제닭다리살구이, 백김치",
                "calories": 822,
                "main_dishes": [
                    {"dish_name": "수제닭다리살구이", "main_ingredient": "가금류", "cooking_method": "구이"},
                    {"dish_name": "김치수제비국", "main_ingredient": "곡류/면류", "cooking_method": "국/탕"},
                ],
                "summary_tags": {"has_fried": False, "has_spicy": True, "main_proteins": ["가금류"], "prep_difficulty": "High"},
            }
        ]

        kept = filter_high_confidence_rows(rows)

        self.assertEqual(len(kept), 1)

    def test_drops_row_with_any_etc_method(self):
        rows = [
            {
                "recommend_name": "햄치즈크로플버거와 쇠고기야채죽 정식",
                "original_menu": "쇠고기야채죽, 햄치즈크로플버거",
                "calories": 721,
                "main_dishes": [
                    {"dish_name": "햄치즈크로플버거", "main_ingredient": "돼지고기", "cooking_method": "기타"},
                    {"dish_name": "쇠고기야채죽", "main_ingredient": "소고기", "cooking_method": "찜/삶기"},
                ],
                "summary_tags": {"has_fried": False, "has_spicy": False, "main_proteins": ["소고기"], "prep_difficulty": "Mid"},
            }
        ]

        kept = filter_high_confidence_rows(rows)

        self.assertEqual(kept, [])

    def test_drops_row_with_ambiguous_keywords_even_without_etc(self):
        rows = [
            {
                "recommend_name": "짜장덮밥과 새우튀김꼬치 정식",
                "original_menu": "짜장덮밥, 새우튀김꼬치, 배추김치",
                "calories": 811,
                "main_dishes": [
                    {"dish_name": "짜장덮밥", "main_ingredient": "곡류/면류", "cooking_method": "볶음"},
                    {"dish_name": "새우튀김꼬치", "main_ingredient": "해산물", "cooking_method": "튀김/전"},
                ],
                "summary_tags": {"has_fried": True, "has_spicy": False, "main_proteins": ["해산물"], "prep_difficulty": "High"},
            }
        ]

        kept = filter_high_confidence_rows(rows)

        self.assertEqual(kept, [])

    def test_drops_row_with_suspicious_sideish_name(self):
        rows = [
            {
                "recommend_name": "흑임자코다리강정과 베이컨감자채볶음 정식",
                "original_menu": "순대국, 베이컨감자채볶음, 흑임자코다리강정",
                "calories": 780,
                "main_dishes": [
                    {"dish_name": "흑임자코다리강정", "main_ingredient": "해산물", "cooking_method": "튀김/전"},
                    {"dish_name": "베이컨감자채볶음", "main_ingredient": "돼지고기", "cooking_method": "볶음"},
                ],
                "summary_tags": {"has_fried": True, "has_spicy": False, "main_proteins": ["해산물", "돼지고기"], "prep_difficulty": "High"},
            }
        ]

        kept = filter_high_confidence_rows(rows)

        self.assertEqual(kept, [])


if __name__ == "__main__":
    unittest.main()
