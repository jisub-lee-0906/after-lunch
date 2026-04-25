from pathlib import Path
import unittest


PROJECT_ROOT = Path('/home/jisub-lee/workspace/after-lunch')


class SchoolBackendContractTests(unittest.TestCase):
    def test_neis_server_helpers_and_routes_exist(self):
        neis_path = PROJECT_ROOT / 'lib/neis.ts'
        schools_route = PROJECT_ROOT / 'app/api/schools/route.ts'
        lunch_route = PROJECT_ROOT / 'app/api/lunch/route.ts'
        recommendations_route = PROJECT_ROOT / 'app/api/recommendations/route.ts'

        for path in [neis_path, schools_route, lunch_route, recommendations_route]:
            self.assertTrue(path.exists(), f'{path} should exist')

        neis_content = neis_path.read_text(encoding='utf-8')
        schools_content = schools_route.read_text(encoding='utf-8')
        lunch_content = lunch_route.read_text(encoding='utf-8')
        recommendations_content = recommendations_route.read_text(encoding='utf-8')
        combined = '\n'.join([neis_content, schools_content, lunch_content, recommendations_content])

        required_strings = [
            'NEIS_API_KEY',
            'schoolInfo',
            'mealServiceDietInfo',
            'ATPT_OFCDC_SC_CODE',
            'SD_SCHUL_CODE',
            'MMEAL_SC_CODE',
            'MLSV_YMD',
            'Type=json',
            'cleanDishName',
            'searchSchools',
            'fetchSchoolLunch',
            'buildDinnerRecommendationPayload',
            'NextResponse.json',
        ]
        for item in required_strings:
            self.assertIn(item, combined)

    def test_page_uses_real_school_and_recommendation_loading_logic(self):
        page_path = PROJECT_ROOT / 'app/page.tsx'
        self.assertTrue(page_path.exists(), 'app/page.tsx should exist')
        content = page_path.read_text(encoding='utf-8')

        required_strings = [
            "fetch('/api/schools?query=",
            "'/api/recommendations?officeCode='",
            'selectedSchool?.schoolName',
            'selectedSchool?.officeCode',
            'selectedSchool?.schoolCode',
            'useEffect',
            'isLoadingLunch',
            'isLoadingRecommendations',
            '학교를 검색해 설정해보세요.',
            '오늘 급식을 불러오는 중이에요.',
            '추천을 불러오는 중이에요.',
            '오늘 급식 정보가 없어요.',
            '다른 날짜를 확인하거나 바로 저녁 추천을 이어볼 수 있어요.',
            '어제 급식 보기',
            '내일 급식 보기',
            '학교 다시 선택',
        ]
        for item in required_strings:
            self.assertIn(item, content)

        forbidden_strings = [
            "const schoolOptions = [",
            "originalMenu: '현미밥, 돈육김치찌개, 수제돈까스, 깍두기'",
            "const lunch = {",
        ]
        for item in forbidden_strings:
            self.assertNotIn(item, content)


if __name__ == '__main__':
    unittest.main()
