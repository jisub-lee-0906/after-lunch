import unittest
from pathlib import Path

from scripts.nationwide_dataset_runner import (
    NationwideRunConfig,
    build_output_paths,
    build_sample_stage_paths,
    compute_level_targets,
    should_stop_collecting,
)


class NationwideDatasetRunnerTests(unittest.TestCase):
    def test_compute_level_targets_for_1000_sample(self):
        targets = compute_level_targets(1000)

        self.assertEqual(sum(targets.values()), 1000)
        self.assertEqual(targets["초등학교"], 340)
        self.assertEqual(targets["중학교"], 330)
        self.assertEqual(targets["고등학교"], 330)

    def test_compute_level_targets_for_full_run_is_none(self):
        self.assertIsNone(compute_level_targets(None))

    def test_should_stop_collecting_only_after_all_targets_met(self):
        targets = {"초등학교": 2, "중학교": 1, "고등학교": 1}

        self.assertFalse(should_stop_collecting({"초등학교": 2, "중학교": 1, "고등학교": 0}, targets))
        self.assertTrue(should_stop_collecting({"초등학교": 2, "중학교": 1, "고등학교": 1}, targets))

    def test_build_sample_stage_paths_uses_sample_partition(self):
        config = NationwideRunConfig(root_dir=Path("/tmp/after-lunch"), year=2025, sample_rows=1000)
        paths = build_sample_stage_paths(config)

        self.assertEqual(paths["raw"], Path("/tmp/after-lunch") / "datasets" / "2025" / "sample_1000" / "raw_meals_2025_sample_1000.jsonl")
        self.assertEqual(paths["refined"], Path("/tmp/after-lunch") / "datasets" / "2025" / "sample_1000" / "refined_meals_2025_sample_1000.jsonl")
        self.assertEqual(paths["high_confidence"], Path("/tmp/after-lunch") / "datasets" / "2025" / "sample_1000" / "high_confidence_seed_2025_sample_1000.json")
        self.assertEqual(paths["app_seed"], Path("/tmp/after-lunch") / "datasets" / "2025" / "sample_1000" / "app_seed_deduped_2025_sample_1000.json")

    def test_build_output_paths_uses_full_run_partition_when_sample_rows_none(self):
        config = NationwideRunConfig(root_dir=Path("/tmp/after-lunch"), year=2025, sample_rows=None)
        paths = build_output_paths(config)

        self.assertEqual(paths["raw"], Path("/tmp/after-lunch") / "datasets" / "2025" / "raw_meals_2025.jsonl")
        self.assertEqual(paths["refined"], Path("/tmp/after-lunch") / "datasets" / "2025" / "refined_meals_2025.jsonl")
        self.assertEqual(paths["high_confidence"], Path("/tmp/after-lunch") / "datasets" / "2025" / "high_confidence_seed_2025.json")
        self.assertEqual(paths["app_seed"], Path("/tmp/after-lunch") / "datasets" / "2025" / "app_seed_deduped_2025.json")


if __name__ == "__main__":
    unittest.main()
