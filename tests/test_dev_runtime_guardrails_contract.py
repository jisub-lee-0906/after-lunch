from pathlib import Path
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class DevRuntimeGuardrailsContractTests(unittest.TestCase):
    def test_dev_reset_uses_cross_platform_launcher(self):
        package_json = (PROJECT_ROOT / 'package.json').read_text(encoding='utf-8')
        self.assertIn('"dev:reset": "node ./scripts/dev-reset.mjs"', package_json)

    def test_reset_scripts_exist_with_guardrail_behaviors(self):
        launcher_script = PROJECT_ROOT / 'scripts' / 'dev-reset.mjs'
        python_script = PROJECT_ROOT / 'scripts' / 'reset_next_dev.py'

        self.assertTrue(launcher_script.exists(), 'scripts/dev-reset.mjs should exist')
        self.assertTrue(python_script.exists(), 'scripts/reset_next_dev.py should exist')

        launcher_content = launcher_script.read_text(encoding='utf-8')
        python_content = python_script.read_text(encoding='utf-8')

        self.assertIn('./scripts/reset_next_dev.py', launcher_content)

        required_python_strings = [
            'node_modules/.bin/next',
            'wait_for_port_release',
            'wait_for_process_exit',
            'shutil.rmtree',
            "127.0.0.1",
            '3000',
            'taskkill',
            'os.killpg',
        ]
        for item in required_python_strings:
            self.assertIn(item, python_content)


if __name__ == '__main__':
    unittest.main()
