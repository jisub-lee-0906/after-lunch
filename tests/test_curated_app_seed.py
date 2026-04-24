import unittest

from scripts.curated_app_seed import is_curatable_row, curate_rows


class CuratedAppSeedTests(unittest.TestCase):
    def test_keeps_high_occurrence_clean_row(self):
        row = {
            'canonical_key_2': 'LA돼지갈비구이|쇠고기미역국',
            'recommend_name': 'LA돼지갈비구이와 쇠고기미역국 정식',
            'representative_main_dishes': ['LA돼지갈비구이', '쇠고기미역국'],
            'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['돼지고기', '소고기'], 'prep_difficulty': 'High'},
            'occurrence_count': 20,
            'school_levels_seen': ['초등학교', '중학교', '고등학교'],
        }
        self.assertTrue(is_curatable_row(row, min_occurrence=4))

    def test_drops_low_occurrence_row(self):
        row = {
            'canonical_key_2': '단일메뉴',
            'recommend_name': '단일메뉴 정식',
            'representative_main_dishes': ['단일메뉴'],
            'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
            'occurrence_count': 1,
            'school_levels_seen': ['초등학교'],
        }
        self.assertFalse(is_curatable_row(row, min_occurrence=4))

    def test_drops_noisy_prefixed_row(self):
        row = {
            'canonical_key_2': '@고추장찌개',
            'recommend_name': '@고추장찌개 정식',
            'representative_main_dishes': ['@고추장찌개'],
            'summary_tags': {'has_fried': False, 'has_spicy': True, 'main_proteins': [], 'prep_difficulty': 'Mid'},
            'occurrence_count': 10,
            'school_levels_seen': ['초등학교', '중학교'],
        }
        self.assertFalse(is_curatable_row(row, min_occurrence=4))

    def test_curate_rows_sorts_by_occurrence_then_name(self):
        rows = [
            {
                'canonical_key_2': 'B메뉴',
                'recommend_name': 'B메뉴 정식',
                'representative_main_dishes': ['B메뉴'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
                'occurrence_count': 4,
                'school_levels_seen': ['초등학교'],
            },
            {
                'canonical_key_2': 'A메뉴',
                'recommend_name': 'A메뉴 정식',
                'representative_main_dishes': ['A메뉴'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
                'occurrence_count': 7,
                'school_levels_seen': ['초등학교'],
            },
        ]
        curated = curate_rows(rows, min_occurrence=4)
        self.assertEqual([r['canonical_key_2'] for r in curated], ['A메뉴', 'B메뉴'])


if __name__ == '__main__':
    unittest.main()
