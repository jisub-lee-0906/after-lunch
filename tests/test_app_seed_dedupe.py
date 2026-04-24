import unittest

from scripts.app_seed_dedupe import build_canonical_key, dedupe_rows


class AppSeedDedupeTests(unittest.TestCase):
    def test_build_canonical_key_sorts_main_dishes(self):
        row = {
            "main_dishes": [
                {"dish_name": "수제돈까스", "main_ingredient": "돼지고기", "cooking_method": "튀김/전"},
                {"dish_name": "돈육김치찌개", "main_ingredient": "돼지고기", "cooking_method": "국/탕"},
            ]
        }

        self.assertEqual(build_canonical_key(row), "돈육김치찌개|수제돈까스")

    def test_dedupe_rows_groups_same_main_combo_and_aggregates_stats(self):
        rows = [
            {
                "recommend_name": "돈육김치찌개와 수제돈까스 정식",
                "original_menu": "돈육김치찌개, 수제돈까스, 깍두기",
                "calories": 710,
                "main_dishes": [
                    {"dish_name": "돈육김치찌개", "main_ingredient": "돼지고기", "cooking_method": "국/탕"},
                    {"dish_name": "수제돈까스", "main_ingredient": "돼지고기", "cooking_method": "튀김/전"},
                ],
                "summary_tags": {"has_fried": True, "has_spicy": True, "main_proteins": ["돼지고기"], "prep_difficulty": "High"},
                "school_level": "고등학교",
                "school_name": "A고",
                "office_name": "서울특별시교육청",
            },
            {
                "recommend_name": "수제돈까스와 돈육김치찌개 정식",
                "original_menu": "수제돈까스, 돈육김치찌개, 배추김치",
                "calories": 760,
                "main_dishes": [
                    {"dish_name": "수제돈까스", "main_ingredient": "돼지고기", "cooking_method": "튀김/전"},
                    {"dish_name": "돈육김치찌개", "main_ingredient": "돼지고기", "cooking_method": "국/탕"},
                ],
                "summary_tags": {"has_fried": True, "has_spicy": True, "main_proteins": ["돼지고기"], "prep_difficulty": "High"},
                "school_level": "중학교",
                "school_name": "B중",
                "office_name": "경기도교육청",
            },
        ]

        deduped = dedupe_rows(rows)

        self.assertEqual(len(deduped), 1)
        item = deduped[0]
        self.assertEqual(item["canonical_key"], "돈육김치찌개|수제돈까스")
        self.assertEqual(item["occurrence_count"], 2)
        self.assertEqual(item["calories_avg"], 735)
        self.assertEqual(item["calories_min"], 710)
        self.assertEqual(item["calories_max"], 760)
        self.assertEqual(item["school_levels_seen"], ["중학교", "고등학교"])
        self.assertEqual(item["representative_main_dishes"], ["돈육김치찌개", "수제돈까스"])
        self.assertEqual(item["summary_tags"]["has_fried"], True)
        self.assertEqual(item["summary_tags"]["has_spicy"], True)
        self.assertEqual(item["summary_tags"]["main_proteins"], ["돼지고기"])

    def test_dedupe_rows_limits_representative_menus(self):
        rows = []
        for idx in range(5):
            rows.append({
                "recommend_name": f"순두부찌개 정식 {idx}",
                "original_menu": f"순두부찌개, 반찬{idx}",
                "calories": 600 + idx,
                "main_dishes": [
                    {"dish_name": "순두부찌개", "main_ingredient": "콩/두부", "cooking_method": "국/탕"},
                ],
                "summary_tags": {"has_fried": False, "has_spicy": False, "main_proteins": ["콩/두부"], "prep_difficulty": "Mid"},
                "school_level": "초등학교",
                "school_name": f"학교{idx}",
                "office_name": "서울특별시교육청",
            })

        deduped = dedupe_rows(rows)

        self.assertEqual(len(deduped), 1)
        self.assertLessEqual(len(deduped[0]["representative_menus"]), 3)


if __name__ == "__main__":
    unittest.main()
