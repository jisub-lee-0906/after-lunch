from pathlib import Path
import unittest


PROJECT_ROOT = Path('/home/jisub-lee/workspace/after-lunch')


class DevResetContractTests(unittest.TestCase):
    def test_package_json_defines_single_port_dev_reset_script(self):
        package_path = PROJECT_ROOT / 'package.json'
        self.assertTrue(package_path.exists(), 'package.json should exist')
        content = package_path.read_text(encoding='utf-8')

        required_strings = [
            '"dev:reset"',
            'fuser -k 3000/tcp',
            'rm -rf .next',
            'next dev --hostname 127.0.0.1 --port 3000',
        ]
        for item in required_strings:
            self.assertIn(item, content)


if __name__ == '__main__':
    unittest.main()
