from pathlib import Path
import unittest


class MobileMainPageContractTests(unittest.TestCase):
    def test_page_contains_requested_mobile_sections_and_controls(self):
        page_path = Path('/home/jisub-lee/workspace/after-lunch/app/page.tsx')
        self.assertTrue(page_path.exists(), 'app/page.tsx should exist')
        content = page_path.read_text(encoding='utf-8')

        required_strings = [
            '행복초등학교',
            '오늘의 식판',
            '맞춤 저녁 추천',
            '장보기 메모에 담기',
            '오늘',
            '어제',
            '내일',
            '돈육김치찌개',
            '담백한 대구살 찜과 미역국',
            '부드러운 소고기 버섯 볶음',
            'overflow-x-auto',
            'Settings2',
            '우리 아이 컨디션 요약',
            '점심 밸런스',
            '추천 이유',
            '급식 데이터 브리핑',
            '든든함 대비',
            '단백질 보완',
            '오늘 저녁으로 선택',
            '다른 메뉴 보기',
            '왜 이 메뉴예요?',
            '아이 반응 기록하기',
            '홈',
            '장보기',
            '스와이프해서 더 보기',
        ]
        for item in required_strings:
            self.assertIn(item, content)


if __name__ == '__main__':
    unittest.main()
