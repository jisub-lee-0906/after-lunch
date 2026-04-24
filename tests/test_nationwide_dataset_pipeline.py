import unittest
from pathlib import Path

from scripts.nationwide_dataset_pipeline import (
    NationwidePipelineConfig,
    build_stage_paths,
    build_year_date_bounds,
    build_year_month_ranges,
    build_run_manifest,
)


class NationwideDatasetPipelineTests(unittest.TestCase):
    def test_build_year_date_bounds_for_2025(self):
        self.assertEqual(build_year_date_bounds(2025), ("20250101", "20251231"))

    def test_build_year_month_ranges_covers_all_months(self):
        ranges = build_year_month_ranges(2025)

        self.assertEqual(len(ranges), 12)
        self.assertEqual(ranges[0], ("20250101", "20250131"))
        self.assertEqual(ranges[-1], ("20251201", "20251231"))

    def test_build_stage_paths_uses_year_partition(self):
        root = Path("/tmp/after-lunch")
        paths = build_stage_paths(root, 2025)

        self.assertEqual(paths["raw"], root / "datasets" / "2025" / "raw_meals_2025.jsonl")
        self.assertEqual(paths["refined"], root / "datasets" / "2025" / "refined_meals_2025.jsonl")
        self.assertEqual(paths["high_confidence"], root / "datasets" / "2025" / "high_confidence_seed_2025.json")
        self.assertEqual(paths["app_seed"], root / "datasets" / "2025" / "app_seed_deduped_2025.json")

    def test_build_run_manifest_records_2025_scope_and_outputs(self):
        config = NationwidePipelineConfig(year=2025)
        manifest = build_run_manifest(config, {"raw_rows": 120, "refined_rows": 80})

        self.assertEqual(manifest["scope"]["year"], 2025)
        self.assertEqual(manifest["scope"]["date_from"], "20250101")
        self.assertEqual(manifest["scope"]["date_to"], "20251231")
        self.assertEqual(manifest["stats"], {"raw_rows": 120, "refined_rows": 80})
        self.assertIn("raw", manifest["outputs"])
        self.assertIn("app_seed", manifest["outputs"])


if __name__ == "__main__":
    unittest.main()
