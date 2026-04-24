import unittest

from scripts.final_production_dataset import (
    build_final_record,
    build_menu_id,
    classify_calorie_profile,
    is_production_ready_row,
    is_stable_operational_row,
    select_final_dataset_rows,
    select_stable_operational_rows,
)


class FinalProductionDatasetTests(unittest.TestCase):
    def test_keeps_row_with_plausible_calorie_profile(self):
        row = {
            'canonical_key_2': '쇠고기미역국',
            'recommend_name': '쇠고기미역국 정식',
            'representative_main_dishes': ['쇠고기미역국'],
            'summary_tags': {
                'has_fried': False,
                'has_spicy': False,
                'main_proteins': ['소고기'],
                'prep_difficulty': 'Mid',
            },
            'calories_avg': 780,
            'calories_min': 520,
            'calories_max': 1020,
            'school_levels_seen': ['초등학교', '중학교', '고등학교'],
            'occurrence_count': 120,
            'representative_menus': ['흑미밥, 쇠고기미역국, 배추김치'],
            'source_group_size': 3,
        }
        self.assertTrue(is_production_ready_row(row))

    def test_drops_row_with_implausible_calorie_profile(self):
        row = {
            'canonical_key_2': '치킨텐더',
            'recommend_name': '치킨텐더 정식',
            'representative_main_dishes': ['치킨텐더'],
            'summary_tags': {
                'has_fried': True,
                'has_spicy': False,
                'main_proteins': ['가금류'],
                'prep_difficulty': 'Mid',
            },
            'calories_avg': 1164,
            'calories_min': 14,
            'calories_max': 17253,
            'school_levels_seen': ['초등학교', '중학교', '고등학교'],
            'occurrence_count': 150,
            'representative_menus': ['치킨텐더, 샐러드, 밥'],
            'source_group_size': 2,
        }
        self.assertFalse(is_production_ready_row(row))

    def test_classify_calorie_profile_marks_large_range_as_variable(self):
        row = {
            'canonical_key_2': '참치김치찌개',
            'recommend_name': '참치김치찌개 정식',
            'representative_main_dishes': ['참치김치찌개'],
            'summary_tags': {
                'has_fried': False,
                'has_spicy': True,
                'main_proteins': ['해산물'],
                'prep_difficulty': 'Mid',
            },
            'calories_avg': 651,
            'calories_min': 198,
            'calories_max': 1877,
            'school_levels_seen': ['초등학교', '중학교', '고등학교'],
            'occurrence_count': 1271,
            'representative_menus': ['참치김치찌개'],
            'source_group_size': 2,
        }
        self.assertEqual(classify_calorie_profile(row), 'variable')
        self.assertFalse(is_stable_operational_row(row))

    def test_is_stable_operational_row_keeps_only_stable_rows(self):
        stable_row = {
            'canonical_key_2': '쇠고기미역국',
            'recommend_name': '쇠고기미역국 정식',
            'representative_main_dishes': ['쇠고기미역국'],
            'summary_tags': {
                'has_fried': False,
                'has_spicy': False,
                'main_proteins': ['소고기'],
                'prep_difficulty': 'Mid',
            },
            'calories_avg': 780,
            'calories_min': 520,
            'calories_max': 1020,
            'school_levels_seen': ['초등학교', '중학교', '고등학교'],
            'occurrence_count': 120,
            'representative_menus': ['흑미밥, 쇠고기미역국, 배추김치'],
            'source_group_size': 3,
        }
        self.assertTrue(is_stable_operational_row(stable_row))

    def test_select_final_dataset_rows_sorts_by_occurrence_desc(self):
        rows = [
            {
                'canonical_key_2': 'B메뉴',
                'recommend_name': 'B메뉴 정식',
                'representative_main_dishes': ['B메뉴'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
                'calories_avg': 700,
                'calories_min': 500,
                'calories_max': 900,
                'school_levels_seen': ['초등학교', '중학교', '고등학교'],
                'occurrence_count': 30,
                'representative_menus': ['B메뉴'],
                'source_group_size': 2,
            },
            {
                'canonical_key_2': 'A메뉴',
                'recommend_name': 'A메뉴 정식',
                'representative_main_dishes': ['A메뉴'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
                'calories_avg': 750,
                'calories_min': 520,
                'calories_max': 930,
                'school_levels_seen': ['초등학교', '중학교', '고등학교'],
                'occurrence_count': 50,
                'representative_menus': ['A메뉴'],
                'source_group_size': 2,
            },
            {
                'canonical_key_2': '제외메뉴',
                'recommend_name': '제외메뉴 정식',
                'representative_main_dishes': ['제외메뉴'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
                'calories_avg': 750,
                'calories_min': 0,
                'calories_max': 9300,
                'school_levels_seen': ['초등학교', '중학교', '고등학교'],
                'occurrence_count': 80,
                'representative_menus': ['제외메뉴'],
                'source_group_size': 2,
            },
        ]

        selected = select_final_dataset_rows(rows)

        self.assertEqual([r['canonical_key_2'] for r in selected], ['A메뉴', 'B메뉴'])

    def test_select_stable_operational_rows_keeps_only_stable_records(self):
        rows = [
            {
                'canonical_key_2': '안정메뉴',
                'recommend_name': '안정메뉴 정식',
                'representative_main_dishes': ['안정메뉴'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
                'calories_avg': 760,
                'calories_min': 600,
                'calories_max': 990,
                'school_levels_seen': ['초등학교', '중학교', '고등학교'],
                'occurrence_count': 40,
                'representative_menus': ['안정메뉴'],
                'source_group_size': 2,
            },
            {
                'canonical_key_2': '변동메뉴',
                'recommend_name': '변동메뉴 정식',
                'representative_main_dishes': ['변동메뉴'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['해산물'], 'prep_difficulty': 'Mid'},
                'calories_avg': 760,
                'calories_min': 100,
                'calories_max': 1505,
                'school_levels_seen': ['초등학교', '중학교', '고등학교'],
                'occurrence_count': 90,
                'representative_menus': ['변동메뉴'],
                'source_group_size': 2,
            },
        ]

        selected = select_stable_operational_rows(rows)

        self.assertEqual([r['canonical_key_2'] for r in selected], ['안정메뉴'])

    def test_build_menu_id_is_stable_and_slug_like(self):
        menu_id = build_menu_id('돼지갈비찜|쇠고기미역국')
        self.assertTrue(menu_id.startswith('yn-'))
        self.assertEqual(menu_id, build_menu_id('돼지갈비찜|쇠고기미역국'))

    def test_build_final_record_shapes_app_contract(self):
        row = {
            'canonical_key_2': '돼지갈비찜|쇠고기미역국',
            'recommend_name': '돼지갈비찜과 쇠고기미역국 정식',
            'representative_main_dishes': ['돼지갈비찜', '쇠고기미역국'],
            'summary_tags': {
                'has_fried': False,
                'has_spicy': True,
                'main_proteins': ['돼지고기', '소고기'],
                'prep_difficulty': 'High',
            },
            'calories_avg': 840,
            'calories_min': 680,
            'calories_max': 1010,
            'school_levels_seen': ['초등학교', '중학교', '고등학교'],
            'occurrence_count': 90,
            'representative_menus': ['흑미밥, 쇠고기미역국, 돼지갈비찜, 깍두기'],
            'source_group_size': 4,
        }

        record = build_final_record(row)

        self.assertEqual(record['display_name'], '돼지갈비찜과 쇠고기미역국 정식')
        self.assertEqual(record['main_dishes'], ['돼지갈비찜', '쇠고기미역국'])
        self.assertEqual(record['protein_tags'], ['돼지고기', '소고기'])
        self.assertEqual(record['nutrition']['calories']['avg'], 840)
        self.assertEqual(record['popularity']['occurrence_count'], 90)
        self.assertEqual(record['quality']['school_level_coverage'], 3)
        self.assertEqual(record['quality']['calorie_profile'], 'stable')


if __name__ == '__main__':
    unittest.main()
