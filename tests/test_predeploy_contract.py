from pathlib import Path
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class PredeployContractTests(unittest.TestCase):
    def test_package_json_exposes_working_predeploy_verification_scripts(self):
        package_json = (PROJECT_ROOT / 'package.json').read_text(encoding='utf-8')

        self.assertIn('"lint": "tsc --noEmit"', package_json)
        self.assertIn('"verify:deploy": "npm run lint && npm run test:runtime && python3 -m unittest discover -s tests -p \'test_*.py\' -v && npm run build"', package_json)

    def test_gitignore_covers_local_typecheck_artifacts(self):
        gitignore = (PROJECT_ROOT / '.gitignore').read_text(encoding='utf-8')
        self.assertIn('*.tsbuildinfo', gitignore)

    def test_contract_tests_do_not_hardcode_machine_specific_repo_paths(self):
        tests_dir = PROJECT_ROOT / 'tests'
        machine_specific_root_marker = "Path('/home/" + "jisub-lee/workspace/after-lunch')"
        for path in tests_dir.glob('test_*.py'):
            content = path.read_text(encoding='utf-8')
            self.assertNotIn(machine_specific_root_marker, content, f'{path.name} should derive PROJECT_ROOT dynamically')


if __name__ == '__main__':
    unittest.main()
