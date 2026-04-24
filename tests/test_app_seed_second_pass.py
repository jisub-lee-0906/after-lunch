import unittest

from scripts.app_seed_second_pass import normalize_dish_name, build_second_pass_key, compress_app_seed


class AppSeedSecondPassTests(unittest.TestCase):
    def test_normalize_dish_name_strips_noise_prefix_and_spacing(self):
        self.assertEqual(normalize_dish_name('=동태매운탕'), '동태매운탕')
        self.assertEqual(normalize_dish_name('"국 없는 날" 쇠고기양송이스프'), '쇠고기양송이스프')
        self.assertEqual(normalize_dish_name('김칫국'), '김치국')

    def test_build_second_pass_key_merges_equivalent_name_variants(self):
        row = {
            'representative_main_dishes': ['김칫국', '=동태매운탕']
        }
        self.assertEqual(build_second_pass_key(row), '김치국|동태매운탕')

    def test_compress_app_seed_groups_equivalent_rows(self):
        rows = [
            {
                'id': 'seed-1',
                'canonical_key': '김칫국|=동태매운탕',
                'recommend_name': '동태매운탕과 김칫국 정식',
                'representative_main_dishes': ['김칫국', '=동태매운탕'],
                'summary_tags': {'has_fried': False, 'has_spicy': True, 'main_proteins': [], 'prep_difficulty': 'Mid'},
                'calories_avg': 700,
                'calories_min': 680,
                'calories_max': 720,
                'school_levels_seen': ['중학교'],
                'occurrence_count': 2,
                'representative_menus': ['김칫국, 동태매운탕'],
            },
            {
                'id': 'seed-2',
                'canonical_key': '김치국|동태매운탕',
                'recommend_name': '동태매운탕과 김치국 정식',
                'representative_main_dishes': ['김치국', '동태매운탕'],
                'summary_tags': {'has_fried': False, 'has_spicy': True, 'main_proteins': [], 'prep_difficulty': 'Mid'},
                'calories_avg': 740,
                'calories_min': 730,
                'calories_max': 750,
                'school_levels_seen': ['고등학교'],
                'occurrence_count': 3,
                'representative_menus': ['김치국, 동태매운탕, 반찬'],
            },
        ]

        compressed = compress_app_seed(rows)

        self.assertEqual(len(compressed), 1)
        item = compressed[0]
        self.assertEqual(item['canonical_key_2'], '김치국|동태매운탕')
        self.assertEqual(item['occurrence_count'], 5)
        self.assertEqual(item['calories_avg'], 720)
        self.assertEqual(item['calories_min'], 680)
        self.assertEqual(item['calories_max'], 750)
        self.assertEqual(item['school_levels_seen'], ['중학교', '고등학교'])
        self.assertLessEqual(len(item['representative_menus']), 3)

    def test_normalize_dish_name_strips_event_phrases_and_symbols(self):
        self.assertEqual(normalize_dish_name('%%감자수제비국'), '감자수제비국')
        self.assertEqual(normalize_dish_name('"국 없는 날" 쇠고기양송이스프'), '쇠고기양송이스프')
        self.assertEqual(normalize_dish_name('"채식의날"크럼블두부비빔밥고추장'), '크럼블두부비빔밥고추장')
        self.assertEqual(normalize_dish_name(')달걀장조림'), '달걀장조림')
        self.assertEqual(normalize_dish_name('중)계란국'), '계란국')
        self.assertEqual(normalize_dish_name('반달)토마토치즈카프레제'), '토마토치즈카프레제')
        self.assertEqual(normalize_dish_name(',잔반없는날'), '')
        self.assertEqual(normalize_dish_name('.돼지고기김치찜'), '돼지고기김치찜')
        self.assertEqual(normalize_dish_name(':맑은된장국'), '맑은된장국')
        self.assertEqual(normalize_dish_name('<대구표준.초>갈비탕'), '갈비탕')
        self.assertEqual(normalize_dish_name('ㄱ:코다리살양념구이'), '코다리살양념구이')

    def test_compress_app_seed_merges_after_stronger_symbol_cleanup(self):
        rows = [
            {
                'id': 'seed-1',
                'canonical_key': '%%감자수제비국',
                'recommend_name': '%%감자수제비국 정식',
                'representative_main_dishes': ['%%감자수제비국'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': [], 'prep_difficulty': 'Mid'},
                'calories_avg': 700,
                'calories_min': 690,
                'calories_max': 710,
                'school_levels_seen': ['초등학교'],
                'occurrence_count': 1,
                'representative_menus': ['%%감자수제비국, 반찬'],
            },
            {
                'id': 'seed-2',
                'canonical_key': '감자수제비국',
                'recommend_name': '감자수제비국 정식',
                'representative_main_dishes': ['감자수제비국'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': [], 'prep_difficulty': 'Mid'},
                'calories_avg': 730,
                'calories_min': 720,
                'calories_max': 740,
                'school_levels_seen': ['중학교'],
                'occurrence_count': 2,
                'representative_menus': ['감자수제비국, 반찬'],
            },
        ]

        compressed = compress_app_seed(rows)

        self.assertEqual(len(compressed), 1)
        self.assertEqual(compressed[0]['canonical_key_2'], '감자수제비국')
        self.assertEqual(compressed[0]['occurrence_count'], 3)


if __name__ == '__main__':
    unittest.main()
