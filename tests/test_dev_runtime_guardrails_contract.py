from pathlib import Path
import unittest


PROJECT_ROOT = Path('/home/jisub-lee/workspace/after-lunch')


class DevRuntimeGuardrailsContractTests(unittest.TestCase):
    def test_dev_reset_uses_dedicated_reset_script(self):
        package_json = (PROJECT_ROOT / 'package.json').read_text(encoding='utf-8')
        self.assertIn('"dev:reset": "bash ./scripts/dev-reset.sh"', package_json)

    def test_reset_scripts_exist_with_guardrail_behaviors(self):
        shell_script = PROJECT_ROOT / 'scripts' / 'dev-reset.sh'
        python_script = PROJECT_ROOT / 'scripts' / 'reset_next_dev.py'

        self.assertTrue(shell_script.exists(), 'scripts/dev-reset.sh should exist')
        self.assertTrue(python_script.exists(), 'scripts/reset_next_dev.py should exist')

        shell_content = shell_script.read_text(encoding='utf-8')
        python_content = python_script.read_text(encoding='utf-8')

        self.assertIn('python3 ./scripts/reset_next_dev.py', shell_content)

        required_python_strings = [
            'node_modules/.bin/next',
            'os.killpg',
            'wait_for_port_release',
            'wait_for_process_exit',
            'shutil.rmtree',
            "127.0.0.1",
            '3000',
        ]
        for item in required_python_strings:
            self.assertIn(item, python_content)


if __name__ == '__main__':
    unittest.main()
