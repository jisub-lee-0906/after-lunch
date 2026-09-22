from pathlib import Path
import os
import shutil
import subprocess
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def find_git_executable() -> str | None:
    """Find Git without assuming it is available as an executable name on Windows."""
    configured = os.environ.get('GIT')
    candidates = [configured, shutil.which('git')]
    if os.name == 'nt':
        candidates.extend([
            os.path.join(os.environ.get('ProgramFiles', r'C:\Program Files'), 'Git', 'cmd', 'git.exe'),
            os.path.join(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)'), 'Git', 'cmd', 'git.exe'),
        ])
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise FileNotFoundError('Git executable is required to verify tracked runtime data')


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
    def test_runtime_imported_production_dataset_is_committed_for_vercel(self):
        dataset_path = PROJECT_ROOT / 'datasets' / '2025' / 'production_final_dataset_2025.json'
        self.assertTrue(dataset_path.exists(), 'runtime production dataset must exist locally')

        relative_path = dataset_path.relative_to(PROJECT_ROOT).as_posix()
        tracked_files = subprocess.check_output(
            [find_git_executable(), 'ls-files', '--', relative_path],
            cwd=PROJECT_ROOT,
            text=True,
        ).splitlines()
        self.assertIn(
            relative_path,
            tracked_files,
            'Vercel builds from git only; runtime-imported production dataset must be committed',
        )


if __name__ == '__main__':
    unittest.main()
