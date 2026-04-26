from pathlib import Path
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class DevResetContractTests(unittest.TestCase):
    def test_package_json_points_dev_reset_to_project_script(self):
        package_path = PROJECT_ROOT / 'package.json'
        self.assertTrue(package_path.exists(), 'package.json should exist')
        content = package_path.read_text(encoding='utf-8')

        self.assertIn('"dev:reset"', content)
        self.assertIn('bash ./scripts/dev-reset.sh', content)


if __name__ == '__main__':
    unittest.main()
