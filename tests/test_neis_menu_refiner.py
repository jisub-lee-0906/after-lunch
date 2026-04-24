import unittest

from scripts.neis_menu_refiner import refine_row


class RefineRowTests(unittest.TestCase):
    def test_skips_side_dishes_and_keeps_real_cutlet_main(self):
        row = {
            "DDISH_NM": "기장밥<br/>근대된장국<br/>허브돈까스 소스<br/>배추김치<br/>콘슬로우<br/>참깨돈까스소스",
            "CAL_INFO": "712.4 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "허브돈까스",
                "main_ingredient": "돼지고기",
                "cooking_method": "튀김/전",
            },
            {
                "dish_name": "근대된장국",
                "main_ingredient": "콩/두부",
                "cooking_method": "국/탕",
            },
        ])
        self.assertEqual(refined["recommend_name"], "허브돈까스와 근대된장국 정식")

    def test_prefers_real_main_over_sideish_bokkeum(self):
        row = {
            "DDISH_NM": "혼합곡밥<br/>돈육김치찌개<br/>건파래볶음<br/>오이지무침<br/>단호박감자채볶음<br/>우유",
            "CAL_INFO": "623.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "돈육김치찌개",
                "main_ingredient": "돼지고기",
                "cooking_method": "국/탕",
            }
        ])
        self.assertEqual(refined["summary_tags"]["has_spicy"], True)

    def test_uses_real_single_dish_over_soup_when_present(self):
        row = {
            "DDISH_NM": "양송이스프<br/>군대리아<br/>오이피클<br/>애플망고쥬스<br/>우유<br/>양배추샐러드",
            "CAL_INFO": "701.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "군대리아",
                "main_ingredient": "곡류/면류",
                "cooking_method": "기타",
            }
        ])
        self.assertEqual(refined["recommend_name"], "군대리아 정식")

    def test_builds_natural_name_from_main_combo(self):
        row = {
            "DDISH_NM": "카레라이스<br/>오이달래무침<br/>백김치<br/>딸기<br/>우유<br/>반반치킨",
            "CAL_INFO": "718.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["recommend_name"], "반반치킨과 카레라이스 정식")
        self.assertEqual(refined["summary_tags"]["has_fried"], True)
        self.assertEqual(refined["summary_tags"]["main_proteins"], ["가금류"])

    def test_keeps_real_main_with_sauce_descriptor(self):
        row = {
            "DDISH_NM": "칼슘강화잡곡밥<br/>김치수제비국<br/>햄감자채볶음<br/>수제닭다리살구이 바베큐소스<br/>백김치<br/>견과류단호박범벅",
            "CAL_INFO": "822.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "수제닭다리살구이",
                "main_ingredient": "가금류",
                "cooking_method": "구이",
            },
            {
                "dish_name": "김치수제비국",
                "main_ingredient": "곡류/면류",
                "cooking_method": "국/탕",
            },
        ])
        self.assertEqual(refined["recommend_name"], "수제닭다리살구이와 김치수제비국 정식")

    def test_blacklists_small_sideish_bokkeum_with_seafood(self):
        row = {
            "DDISH_NM": "현미밥<br/>순대국<br/>멸치찹쌀콩볶음<br/>김치메밀전병<br/>석박지<br/>부추겉절이",
            "CAL_INFO": "793.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "순대국",
                "main_ingredient": "기타",
                "cooking_method": "국/탕",
            }
        ])

    def test_whitelists_boundary_protein_stir_fry(self):
        row = {
            "DDISH_NM": "찰보리밥<br/>한방닭곰탕<br/>골뱅이황태파채무침<br/>순대야채볶음<br/>석박지<br/>새우완자 케첩",
            "CAL_INFO": "801.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "순대야채볶음",
                "main_ingredient": "기타",
                "cooking_method": "볶음",
            },
            {
                "dish_name": "한방닭곰탕",
                "main_ingredient": "가금류",
                "cooking_method": "국/탕",
            },
        ])

    def test_prefers_two_strong_mains_over_soup(self):
        row = {
            "DDISH_NM": "발아현미보리밥<br/>해물볶음우동<br/>얼큰쇠고기무국<br/>목살한입스테이크<br/>달래오이무침<br/>배추김치",
            "CAL_INFO": "910.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "해물볶음우동",
                "main_ingredient": "해산물",
                "cooking_method": "볶음",
            },
            {
                "dish_name": "목살한입스테이크",
                "main_ingredient": "돼지고기",
                "cooking_method": "구이",
            },
        ])
        self.assertEqual(refined["recommend_name"], "해물볶음우동과 목살한입스테이크 정식")
    def test_detects_chicken_before_galbi_for_dakgalbi(self):
        row = {
            "DDISH_NM": "칼슘강화찹쌀밥<br/>근대된장국<br/>들기름막국수<br/>매콤닭갈비<br/>배추김치",
            "CAL_INFO": "842.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"][0], {
            "dish_name": "매콤닭갈비",
            "main_ingredient": "가금류",
            "cooking_method": "볶음",
        })

    def test_keeps_tteokgalbi_with_rose_sauce_descriptor(self):
        row = {
            "DDISH_NM": "발아현미밥<br/>김치콩나물국<br/>파인애플샐러드<br/>노각무침<br/>치즈떡갈비 로제소스<br/>키위쥬스",
            "CAL_INFO": "755.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "치즈떡갈비",
                "main_ingredient": "소고기",
                "cooking_method": "구이",
            }
        ])

    def test_merges_split_bokkeumbap_rice_and_garnish(self):
        row = {
            "DDISH_NM": "미소장국<br/>총각김치<br/>볶음밥 밥<br/>멸치볶음밥 고명<br/>하트꼬마돈카츠",
            "CAL_INFO": "745.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "멸치볶음밥",
                "main_ingredient": "곡류/면류",
                "cooking_method": "볶음",
            },
            {
                "dish_name": "하트꼬마돈카츠",
                "main_ingredient": "돼지고기",
                "cooking_method": "튀김/전",
            },
        ])

    def test_merges_split_bibimbap_rice_and_garnish(self):
        row = {
            "DDISH_NM": "비빔밥 밥<br/>식용꽃비빔밥 고명<br/>달걀파국<br/>채식볶음고추장<br/>해쉬브라운",
            "CAL_INFO": "701.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"][0], {
            "dish_name": "식용꽃비빔밥",
            "main_ingredient": "곡류/면류",
            "cooking_method": "무침/샐러드",
        })

    def test_strips_noisy_prefixes_and_suffixes(self):
        row = {
            "DDISH_NM": "!치킨마요덮밥<br/>쇠고기콩나물국<br/>오이지무침<br/>!딸기",
            "CAL_INFO": "688.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "치킨마요덮밥",
                "main_ingredient": "가금류",
                "cooking_method": "기타",
            }
        ])
        self.assertEqual(refined["recommend_name"], "치킨마요덮밥 정식")

    def test_splits_dot_joined_entries_into_clean_menu_items(self):
        row = {
            "DDISH_NM": "녹두밥<br/>편육..새우젓양념장<br/>건새우아욱된장국!<br/>보쌈김치",
            "CAL_INFO": "733.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "편육",
                "main_ingredient": "돼지고기",
                "cooking_method": "찜/삶기",
            },
            {
                "dish_name": "건새우아욱된장국",
                "main_ingredient": "해산물",
                "cooking_method": "국/탕",
            },
        ])
    def test_merges_split_curry_rice_and_sauce(self):
        row = {
            "DDISH_NM": "돈육카레라이스 소스<br/>카레라이스 밥<br/>멘치카츠<br/>포기김치",
            "CAL_INFO": "792.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "돈육카레라이스",
                "main_ingredient": "돼지고기",
                "cooking_method": "볶음",
            },
            {
                "dish_name": "멘치카츠",
                "main_ingredient": "돼지고기",
                "cooking_method": "튀김/전",
            },
        ])

    def test_strips_internal_noise_from_meat_and_wrap_combo(self):
        row = {
            "DDISH_NM": "보리밥<br/>김치수제비국<br/>오리훈제! 무쌈<br/>배추김치",
            "CAL_INFO": "702.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "오리훈제",
                "main_ingredient": "가금류",
                "cooking_method": "기타",
            },
            {
                "dish_name": "김치수제비국",
                "main_ingredient": "곡류/면류",
                "cooking_method": "국/탕",
            },
        ])

    def test_maps_deopbap_category_out_of_etc(self):
        row = {
            "DDISH_NM": "짜장덮밥<br/>짬뽕순두부국<br/>새우튀김꼬치<br/>배추김치",
            "CAL_INFO": "811.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"][0], {
            "dish_name": "짜장덮밥",
            "main_ingredient": "곡류/면류",
            "cooking_method": "볶음",
        })

    def test_maps_bibimbap_category_out_of_etc(self):
        row = {
            "DDISH_NM": "야채비빔밥 계란프라이<br/>팽이버섯된장국<br/>너비아니<br/>나박김치",
            "CAL_INFO": "760.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"][0], {
            "dish_name": "야채비빔밥 계란프라이",
            "main_ingredient": "가금류",
            "cooking_method": "무침/샐러드",
        })

    def test_maps_pasta_and_udon_categories_out_of_etc(self):
        pasta_row = {
            "DDISH_NM": "투움바파스타<br/>콩나물김치국<br/>치킨텐더샐러드<br/>수제비트오이무피클",
            "CAL_INFO": "734.0 Kcal",
        }
        udon_row = {
            "DDISH_NM": "후리가케양념밥<br/>쑥갓우동<br/>수제오꼬노미야끼<br/>깍두기",
            "CAL_INFO": "782.0 Kcal",
        }

        pasta_refined = refine_row(pasta_row)
        udon_refined = refine_row(udon_row)

        self.assertEqual(pasta_refined["main_dishes"][0]["cooking_method"], "볶음")
        methods_by_name = {dish["dish_name"]: dish["cooking_method"] for dish in udon_refined["main_dishes"]}
        self.assertEqual(methods_by_name["쑥갓우동"], "국/탕")
        self.assertEqual(methods_by_name["수제오꼬노미야끼"], "튀김/전")

    def test_maps_jorim_and_juk_categories_out_of_etc(self):
        jorim_row = {
            "DDISH_NM": "두부고추장조림<br/>감자옹심이국<br/>해물찜닭<br/>배추김치",
            "CAL_INFO": "799.0 Kcal",
        }
        juk_row = {
            "DDISH_NM": "흰쌀밥<br/>쇠고기야채죽<br/>햄치즈크로플버거<br/>나박김치",
            "CAL_INFO": "721.0 Kcal",
        }

        jorim_refined = refine_row(jorim_row)
        juk_refined = refine_row(juk_row)

        self.assertEqual(jorim_refined["main_dishes"][1]["cooking_method"], "찜/삶기")
        self.assertEqual(juk_refined["main_dishes"][1]["cooking_method"], "찜/삶기")

    def test_strips_school_or_brand_style_prefix_noise(self):
        row = {
            "DDISH_NM": "찹쌀밥<br/>=동태매운탕<br/>숯불파채훈제오리볶음<br/>배추김치",
            "CAL_INFO": "755.0 Kcal",
        }

        refined = refine_row(row)

        self.assertEqual(refined["main_dishes"], [
            {
                "dish_name": "숯불파채훈제오리볶음",
                "main_ingredient": "가금류",
                "cooking_method": "볶음",
            },
            {
                "dish_name": "동태매운탕",
                "main_ingredient": "기타",
                "cooking_method": "국/탕",
            },
        ])

    def test_strips_self_and_st_tokens_from_menu_names(self):
        row = {
            "DDISH_NM": "쑥갓어묵국<br/>self치킨또띠아랩<br/>오므라이스ST볶음밥<br/>깍두기",
            "CAL_INFO": "901.0 Kcal",
        }

        refined = refine_row(row)
        names = [dish["dish_name"] for dish in refined["main_dishes"]]

        self.assertIn("치킨또띠아랩", names)
        self.assertIn("오므라이스볶음밥", names)
        self.assertNotIn("self치킨또띠아랩", names)
        self.assertNotIn("오므라이스ST볶음밥", names)


if __name__ == "__main__":
    unittest.main()
