import json
import unittest
from pathlib import Path
import tempfile

from scripts.final_production_dataset import (
    build_bridge_tags,
    build_final_record,
    build_menu_id,
    build_parent_pitch,
    build_transition_match_plan,
    classify_calorie_profile,
    classify_comfort_level,
    classify_dinner_fit,
    classify_dinner_response,
    classify_lunch_aftertaste,
    classify_meal_style,
    is_production_ready_row,
    is_stable_operational_row,
    OVERRIDE_PATH,
    load_manual_taxonomy_overrides,
    load_source_rows,
    resolve_pipeline_paths,
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
        self.assertEqual(record['taxonomy']['meal_style'], 'braised_set')
        self.assertEqual(record['taxonomy']['comfort_level'], 'hearty')
        self.assertEqual(record['taxonomy']['dinner_fit'], 'special')
        self.assertTrue(record['taxonomy']['parent_pitch'])
        self.assertTrue(record['bridge_tags'])
        self.assertTrue(record['dinner_response'])
        self.assertEqual(record['nutrition']['calories']['avg'], 840)
        self.assertEqual(record['popularity']['occurrence_count'], 90)
        self.assertEqual(record['quality']['school_level_coverage'], 3)
        self.assertEqual(record['quality']['calorie_profile'], 'stable')

    @unittest.skipUnless(OVERRIDE_PATH.exists(), 'optional ignored manual taxonomy overrides are not present')
    def test_manual_taxonomy_override_file_loads_known_rows(self):
        overrides = load_manual_taxonomy_overrides()
        self.assertEqual(len(overrides), 622)
        self.assertIn('yn-ca1918d32f24', overrides)
        self.assertEqual(overrides['yn-ca1918d32f24']['meal_style'], 'stew_set')
        self.assertEqual(overrides['yn-ca1918d32f24']['parent_pitch'], '국물 있는 균형 한 끼')
        self.assertIn('yn-95d77a07dc44', overrides)
        self.assertEqual(overrides['yn-95d77a07dc44']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-95d77a07dc44']['dinner_fit'], 'special')
        self.assertEqual(overrides['yn-95d77a07dc44']['parent_pitch'], '매콤한 메인요리 중심 한 끼')
        self.assertIn('yn-c3c566908d01', overrides)
        self.assertEqual(overrides['yn-c3c566908d01']['meal_style'], 'one_plate')
        self.assertEqual(overrides['yn-c3c566908d01']['dinner_fit'], 'flexible')
        self.assertEqual(overrides['yn-c3c566908d01']['parent_pitch'], '한 그릇으로 든든하게 고르기 좋은 메뉴')
        self.assertIn('yn-e1550441bee6', overrides)
        self.assertEqual(overrides['yn-e1550441bee6']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-e1550441bee6']['dinner_fit'], 'everyday')
        self.assertEqual(overrides['yn-e1550441bee6']['parent_pitch'], '매콤한 불고기로 무난하게 이어가기 좋은 한 끼')
        self.assertIn('yn-5e22bd204f2b', overrides)
        self.assertEqual(overrides['yn-5e22bd204f2b']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-5e22bd204f2b']['dinner_fit'], 'everyday')
        self.assertEqual(overrides['yn-5e22bd204f2b']['parent_pitch'], '제육볶음 중심으로 익숙하게 고르기 좋은 한 끼')
        self.assertIn('yn-2771351c3a74', overrides)
        self.assertEqual(overrides['yn-2771351c3a74']['meal_style'], 'braised_set')
        self.assertEqual(overrides['yn-2771351c3a74']['dinner_fit'], 'special')
        self.assertEqual(overrides['yn-2771351c3a74']['parent_pitch'], '등갈비김치찜과 미역국이 함께 있는 든든한 한 끼')
        self.assertIn('yn-22f9224d6f56', overrides)
        self.assertEqual(overrides['yn-22f9224d6f56']['meal_style'], 'one_plate')
        self.assertEqual(overrides['yn-22f9224d6f56']['dinner_fit'], 'special')
        self.assertEqual(overrides['yn-22f9224d6f56']['parent_pitch'], '카레와 새우튀김으로 만족감 있는 한 끼')
        self.assertIn('yn-9fa34b5087da', overrides)
        self.assertEqual(overrides['yn-9fa34b5087da']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-9fa34b5087da']['dinner_fit'], 'everyday')
        self.assertEqual(overrides['yn-9fa34b5087da']['parent_pitch'], '제육볶음 중심에 닭곰탕이 곁들여진 든든한 한 끼')
        self.assertIn('yn-78a8a219f841', overrides)
        self.assertEqual(overrides['yn-78a8a219f841']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-78a8a219f841']['dinner_fit'], 'everyday')
        self.assertEqual(overrides['yn-78a8a219f841']['parent_pitch'], '돼지수육으로 무난하게 고르기 좋은 한 끼')
        self.assertIn('yn-298253e216da', overrides)
        self.assertEqual(overrides['yn-298253e216da']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-298253e216da']['dinner_fit'], 'special')
        self.assertEqual(overrides['yn-298253e216da']['parent_pitch'], '닭갈비 중심에 미역국이 곁들여진 든든한 한 끼')
        self.assertIn('yn-c028de418f05', overrides)
        self.assertEqual(overrides['yn-c028de418f05']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-c028de418f05']['dinner_fit'], 'everyday')
        self.assertEqual(overrides['yn-c028de418f05']['parent_pitch'], '두부조림 중심에 닭곰탕이 곁들여진 익숙한 한 끼')
        self.assertIn('yn-49afbe82e725', overrides)
        self.assertEqual(overrides['yn-49afbe82e725']['meal_style'], 'braised_set')
        self.assertEqual(overrides['yn-49afbe82e725']['dinner_fit'], 'special')
        self.assertEqual(overrides['yn-49afbe82e725']['parent_pitch'], '돼지갈비찜과 아욱국이 함께 있는 든든한 한 끼')
        self.assertIn('yn-2f1dc802b838', overrides)
        self.assertEqual(overrides['yn-2f1dc802b838']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-2f1dc802b838']['dinner_fit'], 'everyday')
        self.assertEqual(overrides['yn-2f1dc802b838']['parent_pitch'], '제육볶음 중심으로 무난하게 이어가기 좋은 한 끼')
        self.assertIn('yn-f5dc86cdc863', overrides)
        self.assertEqual(overrides['yn-f5dc86cdc863']['meal_style'], 'stew_set')
        self.assertEqual(overrides['yn-f5dc86cdc863']['dinner_fit'], 'everyday')
        self.assertEqual(overrides['yn-f5dc86cdc863']['parent_pitch'], '우렁살된장찌개로 무난하게 고르기 좋은 한 끼')
        self.assertIn('yn-d076f5aa396b', overrides)
        self.assertEqual(overrides['yn-d076f5aa396b']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-d076f5aa396b']['dinner_fit'], 'special')
        self.assertEqual(overrides['yn-d076f5aa396b']['parent_pitch'], '코다리강정 중심에 떡국이 곁들여진 든든한 한 끼')
        self.assertIn('yn-ac59477e68a5', overrides)
        self.assertEqual(overrides['yn-ac59477e68a5']['meal_style'], 'main_side_set')
        self.assertEqual(overrides['yn-ac59477e68a5']['dinner_fit'], 'everyday')
        self.assertEqual(overrides['yn-ac59477e68a5']['parent_pitch'], '주꾸미삼겹살볶음으로 든든하게 이어가기 좋은 한 끼')
        self.assertIn('yn-b4af159afeef', overrides)
        self.assertEqual(overrides['yn-b4af159afeef']['meal_style'], 'one_plate')
        self.assertEqual(overrides['yn-b4af159afeef']['dinner_fit'], 'special')
        self.assertEqual(overrides['yn-b4af159afeef']['parent_pitch'], '치킨텐더와 카레라이스로 만족감 있는 한 끼')

    def test_taxonomy_classifiers_return_parent_facing_labels(self):
        row = {
            'recommend_name': '김치볶음밥과 계란후라이 정식',
            'representative_main_dishes': ['김치볶음밥', '계란후라이'],
            'summary_tags': {'has_fried': True, 'has_spicy': True, 'main_proteins': ['가금류'], 'prep_difficulty': 'Mid'},
            'calories_avg': 768,
            'occurrence_count': 180,
        }
        self.assertEqual(classify_meal_style(row), 'one_plate')
        self.assertEqual(classify_comfort_level(row), 'hearty')
        self.assertEqual(classify_dinner_fit(row), 'flexible')
        taxonomy = {
            'meal_style': classify_meal_style(row),
            'comfort_level': classify_comfort_level(row),
            'dinner_fit': classify_dinner_fit(row),
        }
        self.assertTrue(build_parent_pitch(row, taxonomy))

    def test_taxonomy_classifiers_handle_main_plus_soup_combos_more_appropriately(self):
        row = {
            'recommend_name': '제육볶음과 건새우아욱된장국 정식',
            'representative_main_dishes': ['제육볶음', '건새우아욱된장국'],
            'summary_tags': {'has_fried': False, 'has_spicy': True, 'main_proteins': ['돼지고기', '해산물'], 'prep_difficulty': 'Mid'},
            'calories_avg': 730,
            'occurrence_count': 210,
        }
        self.assertEqual(classify_meal_style(row), 'main_side_set')
        self.assertEqual(classify_comfort_level(row), 'balanced')
        self.assertEqual(classify_dinner_fit(row), 'everyday')

    def test_taxonomy_classifiers_treat_egg_side_menus_as_everyday_main_side(self):
        row = {
            'recommend_name': '달걀찜 정식',
            'representative_main_dishes': ['달걀찜'],
            'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['가금류'], 'prep_difficulty': 'Mid'},
            'calories_avg': 640,
            'occurrence_count': 128,
        }
        self.assertEqual(classify_meal_style(row), 'main_side_set')
        self.assertEqual(classify_comfort_level(row), 'light')
        self.assertEqual(classify_dinner_fit(row), 'everyday')

    def test_taxonomy_classifiers_keep_spicy_stews_out_of_noodle_soup_bucket(self):
        row = {
            'recommend_name': '짬뽕순두부찌개 정식',
            'representative_main_dishes': ['짬뽕순두부찌개'],
            'summary_tags': {'has_fried': False, 'has_spicy': True, 'main_proteins': ['해산물'], 'prep_difficulty': 'Mid'},
            'calories_avg': 790,
            'occurrence_count': 109,
        }
        self.assertEqual(classify_meal_style(row), 'stew_set')
        self.assertEqual(classify_comfort_level(row), 'hearty')
        self.assertEqual(classify_dinner_fit(row), 'flexible')

    def test_taxonomy_classifiers_mark_familiar_bowls_and_gomtang_as_everyday(self):
        deopbap_row = {
            'recommend_name': '참치마요덮밥 정식',
            'representative_main_dishes': ['참치마요덮밥'],
            'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['해산물'], 'prep_difficulty': 'Mid'},
            'calories_avg': 760,
            'occurrence_count': 120,
        }
        gomtang_row = {
            'recommend_name': '한우갈비탕 정식',
            'representative_main_dishes': ['한우갈비탕'],
            'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['소고기'], 'prep_difficulty': 'High'},
            'calories_avg': 611,
            'occurrence_count': 414,
        }
        self.assertEqual(classify_comfort_level(deopbap_row), 'balanced')
        self.assertEqual(classify_dinner_fit(deopbap_row), 'everyday')
        self.assertEqual(classify_comfort_level(gomtang_row), 'hearty')
        self.assertEqual(classify_dinner_fit(gomtang_row), 'special')

    def test_build_bridge_tags_captures_reset_vs_comfort_roles(self):
        reset_row = {
            'recommend_name': '콩가루배추국 정식',
            'representative_main_dishes': ['콩가루배추국'],
            'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['콩/두부'], 'prep_difficulty': 'Low'},
            'calories_avg': 540,
            'occurrence_count': 190,
        }
        comfort_row = {
            'recommend_name': '치킨텐더와 카레라이스 정식',
            'representative_main_dishes': ['치킨텐더', '카레라이스'],
            'summary_tags': {'has_fried': True, 'has_spicy': False, 'main_proteins': ['가금류'], 'prep_difficulty': 'Mid'},
            'calories_avg': 920,
            'occurrence_count': 34,
        }
        reset_taxonomy = {
            'meal_style': classify_meal_style(reset_row),
            'comfort_level': classify_comfort_level(reset_row),
            'dinner_fit': classify_dinner_fit(reset_row),
        }
        comfort_taxonomy = {
            'meal_style': classify_meal_style(comfort_row),
            'comfort_level': classify_comfort_level(comfort_row),
            'dinner_fit': classify_dinner_fit(comfort_row),
        }
        self.assertEqual(build_bridge_tags(reset_row, reset_taxonomy), ['spice_reset', 'grease_reset', 'daily_reset'])
        self.assertEqual(build_bridge_tags(comfort_row, comfort_taxonomy), ['comfort_push'])

    def test_build_bridge_tags_marks_rice_anchor_for_main_side_sets(self):
        row = {
            'recommend_name': '제육볶음과 건새우아욱된장국 정식',
            'representative_main_dishes': ['제육볶음', '건새우아욱된장국'],
            'summary_tags': {'has_fried': False, 'has_spicy': True, 'main_proteins': ['돼지고기', '해산물'], 'prep_difficulty': 'Mid'},
            'calories_avg': 730,
            'occurrence_count': 210,
        }
        taxonomy = {
            'meal_style': classify_meal_style(row),
            'comfort_level': classify_comfort_level(row),
            'dinner_fit': classify_dinner_fit(row),
        }
        bridge_tags = build_bridge_tags(row, taxonomy)
        self.assertIn('rice_anchor', bridge_tags)
        self.assertIn('daily_reset', bridge_tags)

    def test_classify_lunch_aftertaste_detects_noodle_and_grease_fatigue(self):
        lunch_signals = {
            'has_fried': True,
            'has_spicy': False,
            'is_heavy': True,
            'meal_items': ['짜장면', '탕수육', '단무지'],
        }
        self.assertEqual(classify_lunch_aftertaste(lunch_signals), ['greasy_heavy', 'noodle_fatigue'])

    def test_classify_lunch_aftertaste_detects_spicy_heavy_and_comfort_saturated(self):
        lunch_signals = {
            'has_fried': True,
            'has_spicy': True,
            'is_heavy': True,
            'meal_items': ['마라탕', '치킨텐더', '볶음밥'],
        }
        self.assertEqual(classify_lunch_aftertaste(lunch_signals), ['spicy_heavy', 'comfort_saturated'])

    def test_classify_dinner_response_returns_reset_direction_for_light_soup(self):
        row = {
            'recommend_name': '콩가루배추국 정식',
            'representative_main_dishes': ['콩가루배추국'],
            'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['콩/두부'], 'prep_difficulty': 'Low'},
            'calories_avg': 540,
            'occurrence_count': 190,
        }
        taxonomy = {
            'meal_style': classify_meal_style(row),
            'comfort_level': classify_comfort_level(row),
            'dinner_fit': classify_dinner_fit(row),
        }
        bridge_tags = build_bridge_tags(row, taxonomy)
        self.assertEqual(classify_dinner_response(row, taxonomy, bridge_tags), ['bland_reset', 'broth_reset', 'daily_stabilizer'])

    def test_classify_dinner_response_returns_treat_continuation_for_comfort_menu(self):
        row = {
            'recommend_name': '치킨텐더와 카레라이스 정식',
            'representative_main_dishes': ['치킨텐더', '카레라이스'],
            'summary_tags': {'has_fried': True, 'has_spicy': False, 'main_proteins': ['가금류'], 'prep_difficulty': 'Mid'},
            'calories_avg': 920,
            'occurrence_count': 34,
        }
        taxonomy = {
            'meal_style': classify_meal_style(row),
            'comfort_level': classify_comfort_level(row),
            'dinner_fit': classify_dinner_fit(row),
        }
        bridge_tags = build_bridge_tags(row, taxonomy)
        self.assertEqual(classify_dinner_response(row, taxonomy, bridge_tags), ['treat_continuation'])

    def test_build_transition_match_plan_prioritizes_reset_for_greasy_noodle_lunch(self):
        lunch_aftertaste = ['greasy_heavy', 'noodle_fatigue']
        dinner_response = ['rice_anchor', 'broth_reset', 'daily_stabilizer']
        match_plan = build_transition_match_plan(lunch_aftertaste, dinner_response)
        self.assertEqual(match_plan['primary_needs'], ['broth_reset', 'rice_anchor'])
        self.assertEqual(match_plan['matched_responses'], ['broth_reset', 'rice_anchor'])
        self.assertEqual(match_plan['fit_label'], 'strong')

    def test_build_transition_match_plan_prioritizes_bland_reset_for_spicy_lunch(self):
        lunch_aftertaste = ['spicy_heavy', 'comfort_saturated']
        dinner_response = ['bland_reset', 'daily_stabilizer']
        match_plan = build_transition_match_plan(lunch_aftertaste, dinner_response)
        self.assertEqual(match_plan['primary_needs'], ['bland_reset', 'daily_stabilizer'])
        self.assertEqual(match_plan['matched_responses'], ['bland_reset', 'daily_stabilizer'])
        self.assertEqual(match_plan['fit_label'], 'strong')

    def test_build_transition_match_plan_marks_partial_fit_when_only_one_need_matches(self):
        lunch_aftertaste = ['greasy_heavy', 'comfort_saturated']
        dinner_response = ['treat_continuation']
        match_plan = build_transition_match_plan(lunch_aftertaste, dinner_response)
        self.assertEqual(match_plan['primary_needs'], ['broth_reset', 'daily_stabilizer'])
        self.assertEqual(match_plan['matched_responses'], ['treat_continuation'])
        self.assertEqual(match_plan['fit_label'], 'partial')

    def test_resolve_pipeline_paths_uses_explicit_input_path_when_provided(self):
        root = Path('/tmp/after-lunch-audit')
        custom_input = root / 'fixtures' / 'custom_input.json'
        paths = resolve_pipeline_paths(root, input_path=custom_input)
        self.assertEqual(paths['input_path'], custom_input)
        self.assertEqual(paths['output_path'], root / 'datasets' / '2025' / 'production_final_dataset_2025.json')

    def test_load_source_rows_raises_clear_error_when_input_missing(self):
        missing_path = Path('/tmp/after-lunch-missing-input.json')
        with self.assertRaises(FileNotFoundError) as context:
            load_source_rows(missing_path)
        self.assertIn(str(missing_path), str(context.exception))
        self.assertIn('app_seed_ultra_curated_2025.json', str(context.exception))

    def test_load_source_rows_reads_json_rows_from_explicit_input_path(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / 'custom_input.json'
            input_path.write_text('[{"recommend_name": "테스트 정식"}]', encoding='utf-8')
            rows = load_source_rows(input_path)
        self.assertEqual(rows, [{'recommend_name': '테스트 정식'}])

    def test_shipped_production_dataset_matches_current_record_schema(self):
        dataset_path = Path(__file__).resolve().parents[1] / 'datasets' / '2025' / 'production_final_dataset_2025.json'
        rows = load_source_rows(dataset_path)
        first_row = rows[0]

        self.assertIn('bridge_tags', first_row)
        self.assertIn('dinner_response', first_row)
        self.assertIn('taxonomy', first_row)
        self.assertIn('parent_pitch', first_row['taxonomy'])
        self.assertIsInstance(first_row['bridge_tags'], list)
        self.assertIsInstance(first_row['dinner_response'], list)

    @unittest.skipUnless((Path(__file__).resolve().parents[1] / 'datasets' / '2025' / 'production_final_dataset_2025_report.json').exists(), 'optional ignored production report is not present')
    def test_shipped_production_report_samples_match_current_record_schema(self):
        report_path = Path(__file__).resolve().parents[1] / 'datasets' / '2025' / 'production_final_dataset_2025_report.json'
        report = json.loads(report_path.read_text(encoding='utf-8'))
        sample = report['samples'][0]
        taxonomy_sample = report['taxonomy_samples'][0]

        self.assertIn('taxonomy', sample)
        self.assertIn('bridge_tags', sample)
        self.assertIn('dinner_response', sample)
        self.assertIn('bridge_tags', taxonomy_sample)
        self.assertIn('dinner_response', taxonomy_sample)


if __name__ == '__main__':
    unittest.main()
