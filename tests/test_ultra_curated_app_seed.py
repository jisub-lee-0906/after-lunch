import json
import subprocess
import unittest
from pathlib import Path

from scripts.ultra_curated_app_seed import is_ultra_curatable_row, ultra_curate_rows


class UltraCuratedAppSeedTests(unittest.TestCase):
    def test_keeps_high_occurrence_all_school_levels_row(self):
        row = {
            'canonical_key_2': '쇠고기미역국',
            'representative_main_dishes': ['쇠고기미역국'],
            'summary_tags': {'main_proteins': ['소고기'], 'prep_difficulty': 'Mid'},
            'occurrence_count': 42,
            'school_levels_seen': ['초등학교', '중학교', '고등학교'],
        }
        self.assertTrue(is_ultra_curatable_row(row, min_occurrence=30))

    def test_drops_row_missing_full_school_level_coverage(self):
        row = {
            'canonical_key_2': '닭곰탕',
            'representative_main_dishes': ['닭곰탕'],
            'summary_tags': {'main_proteins': ['가금류'], 'prep_difficulty': 'Mid'},
            'occurrence_count': 60,
            'school_levels_seen': ['초등학교', '중학교'],
        }
        self.assertFalse(is_ultra_curatable_row(row, min_occurrence=30))

    def test_drops_row_below_ultra_occurrence_threshold(self):
        row = {
            'canonical_key_2': '순두부찌개',
            'representative_main_dishes': ['순두부찌개'],
            'summary_tags': {'main_proteins': ['콩/두부'], 'prep_difficulty': 'Mid'},
            'occurrence_count': 29,
            'school_levels_seen': ['초등학교', '중학교', '고등학교'],
        }
        self.assertFalse(is_ultra_curatable_row(row, min_occurrence=30))

    def test_ultra_curate_rows_sorts_by_occurrence_desc_then_name(self):
        rows = [
            {
                'canonical_key_2': 'B메뉴',
                'representative_main_dishes': ['B메뉴'],
                'summary_tags': {'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
                'occurrence_count': 30,
                'school_levels_seen': ['초등학교', '중학교', '고등학교'],
            },
            {
                'canonical_key_2': 'A메뉴',
                'representative_main_dishes': ['A메뉴'],
                'summary_tags': {'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
                'occurrence_count': 50,
                'school_levels_seen': ['초등학교', '중학교', '고등학교'],
            },
            {
                'canonical_key_2': '제외메뉴',
                'representative_main_dishes': ['제외메뉴'],
                'summary_tags': {'main_proteins': ['돼지고기'], 'prep_difficulty': 'Mid'},
                'occurrence_count': 80,
                'school_levels_seen': ['초등학교'],
            },
        ]

        curated = ultra_curate_rows(rows, min_occurrence=30)

        self.assertEqual([r['canonical_key_2'] for r in curated], ['A메뉴', 'B메뉴'])

    def test_script_runs_directly_from_repo_root(self):
        repo_root = Path(__file__).resolve().parents[1]
        dataset_dir = repo_root / 'datasets' / '2025'
        input_path = dataset_dir / 'app_seed_curated_2025.json'
        output_path = dataset_dir / 'app_seed_ultra_curated_2025.json'
        report_path = dataset_dir / 'app_seed_ultra_curated_2025_report.json'
        dataset_dir.mkdir(parents=True, exist_ok=True)
        input_rows = [
            {
                'canonical_key_2': '쇠고기미역국',
                'recommend_name': '쇠고기미역국 정식',
                'representative_main_dishes': ['쇠고기미역국'],
                'summary_tags': {'has_fried': False, 'has_spicy': False, 'main_proteins': ['소고기'], 'prep_difficulty': 'Mid'},
                'calories_avg': 780,
                'calories_min': 520,
                'calories_max': 1020,
                'school_levels_seen': ['초등학교', '중학교', '고등학교'],
                'occurrence_count': 42,
                'representative_menus': ['흑미밥, 쇠고기미역국, 배추김치'],
                'source_group_size': 3,
            }
        ]
        input_path.write_text(json.dumps(input_rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        try:
            result = subprocess.run(
                ['python3', 'scripts/ultra_curated_app_seed.py'],
                cwd=repo_root,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            self.assertTrue(output_path.exists())
            self.assertTrue(report_path.exists())
        finally:
            input_path.unlink(missing_ok=True)
            output_path.unlink(missing_ok=True)
            report_path.unlink(missing_ok=True)


if __name__ == '__main__':
    unittest.main()
