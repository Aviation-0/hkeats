// scripts/benchmark_accuracy.mjs
// Comprehensive Accuracy Benchmark for EatSafe HK Restaurant Entity Matching

import { DatabaseSync } from 'node:sqlite';
import { findD1SqliteFile } from '../lib/fehd-sync.mjs';

const TEST_CASES = [
  // --- 1. Iconic Dai Pai Dongs & Hawker Stalls ---
  {
    category: "Dai Pai Dong / Hawker",
    name: "Sing Heung Yuen",
    secondaryName: "勝香園",
    address: "2 Mee Lun Street, Central, Hong Kong",
    expectedMatch: true,
    expectedLicenceSubstring: "HAWKER-FP",
    expectedType: "DAI_PAI_DONG",
  },
  {
    category: "Dai Pai Dong / Hawker",
    name: "Bing Kee Cha Dong",
    secondaryName: "炳記茶檔",
    address: "5 Shepherd Street, Tai Hang, Hong Kong",
    expectedMatch: true,
    expectedLicenceSubstring: "HAWKER-FP",
    expectedType: "DAI_PAI_DONG",
  },
  {
    category: "Dai Pai Dong / Hawker",
    name: "Sing Kee",
    secondaryName: "盛記",
    address: "82 Stanley Street, Central, Hong Kong",
    expectedMatch: true,
    expectedLicenceSubstring: "HAWKER-FP",
    expectedType: "DAI_PAI_DONG",
  },
  {
    category: "Dai Pai Dong / Hawker",
    name: "Yue Hing Coffee",
    secondaryName: "裕興咖啡",
    address: "82 Stanley Street, Central, Hong Kong",
    expectedMatch: true,
    expectedLicenceSubstring: "HAWKER-FP",
    expectedType: "DAI_PAI_DONG",
  },

  // --- 2. High-End Hotel Dining / Master Concessions ---
  {
    category: "Hotel Concession",
    name: "Amber",
    secondaryName: "",
    address: "7/F, The Landmark Mandarin Oriental, 15 Queen's Road Central, Central, Hong Kong",
    expectedMatch: true,
    expectedLicenceSubstring: "2218801129",
    expectedConfidence: "CONCESSION",
  },
  {
    category: "Hotel Concession",
    name: "Lung King Heen",
    secondaryName: "龍景軒",
    address: "Four Seasons Hotel Hong Kong, 8 Finance St, Central, Hong Kong",
    expectedMatch: true,
    expectedLicenceSubstring: "2218800597",
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Hotel Concession",
    name: "Caprice",
    secondaryName: "",
    address: "Podium 6, Four Seasons Hotel Hong Kong, 8 Finance Street, Central, Hong Kong",
    expectedMatch: true,
    expectedLicenceSubstring: "2218800454",
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Hotel Concession",
    name: "The Lobby at The Peninsula",
    secondaryName: "半島酒店 大堂茶座",
    address: "The Peninsula Hong Kong, Salisbury Road, Tsim Sha Tsui, Kowloon",
    expectedMatch: true,
    expectedLicenceSubstring: "2261197934",
    expectedDistrict: "YAU TSIM",
  },
  {
    category: "Hotel Concession",
    name: "Spring Moon",
    secondaryName: "嘉麟樓",
    address: "1/F, The Peninsula Hong Kong, Salisbury Road, Tsim Sha Tsui, Kowloon",
    expectedMatch: true,
    expectedLicenceSubstring: "2261197767",
    expectedDistrict: "YAU TSIM",
  },
  {
    category: "Hotel Concession",
    name: "Tin Lung Heen",
    secondaryName: "天龍軒",
    address: "102/F, The Ritz-Carlton, Hong Kong, International Commerce Centre, 1 Austin Rd W, Tsim Sha Tsui",
    expectedMatch: true,
    expectedLicenceSubstring: "2261807451",
    expectedDistrict: "YAU TSIM",
  },
  {
    category: "Hotel Concession",
    name: "Pier 7 Café & Bar (Central)",
    secondaryName: "",
    address: "Shop M, Level 2, Central Pier No. 7, Star Ferry Pier, Central, Hong Kong",
    expectedMatch: true,
    expectedLicenceSubstring: "3118802306",
    expectedDistrict: "CENTRAL/WESTERN",
  },

  // --- 3. Historic Cha Chaan Teng & Famous Local Eateries ---
  {
    category: "Local Icon",
    name: "Australia Dairy Company",
    secondaryName: "澳洲牛奶公司",
    address: "47 Parkes St, Jordan, Kowloon",
    expectedMatch: true,
    expectedDistrict: "YAU TSIM",
  },
  {
    category: "Local Icon",
    name: "Central Restaurant",
    secondaryName: "中央飯店",
    address: "Tung Lo Court, 136-154 Tai Po Rd, Sham Shui Po, Kowloon",
    expectedMatch: true,
    expectedDistrict: "SHAM SHUI PO",
    expectedLicenceSubstring: "2263067893",
  },
  {
    category: "Local Icon",
    name: "Kau Kee Restaurant",
    secondaryName: "九記牛腩",
    address: "Ground Floor, 21 Gough St, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Local Icon",
    name: "Kam's Roast Goose",
    secondaryName: "甘牌燒鵝",
    address: "G/F, Po Wah Commercial Centre, 226 Hennessy Road, Wan Chai, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "WAN CHAI",
  },
  {
    category: "Local Icon",
    name: "Yat Lok Restaurant",
    secondaryName: "一樂燒鵝",
    address: "G/F, 34-38 Stanley Street, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Local Icon",
    name: "Krua Walaiphan",
    secondaryName: "",
    address: "G/F, Hang Sing Mansion, 64-70 High Street, Sai Ying Pun, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
    expectedLicenceSubstring: "2218818802",
  },
  {
    category: "Local Icon",
    name: "Lan Fong Yuen",
    secondaryName: "蘭芳園",
    address: "2 Gage St, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Local Icon",
    name: "Sister Wah",
    secondaryName: "華姐清湯腩",
    address: "G/F, 13A Electric Road, North Point, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "WAN CHAI",
  },
  {
    category: "Local Icon",
    name: "Mido Cafe",
    secondaryName: "美都餐室",
    address: "63 Temple St, Yau Ma Tei, Kowloon",
    expectedMatch: true,
    expectedDistrict: "YAU TSIM",
  },
  {
    category: "Local Icon",
    name: "Sun Hing Restaurant",
    secondaryName: "新興食家",
    address: "Shop C, G/F, Markfield Building, 8 Smithfield, Kennedy Town, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Local Icon",
    name: "Monster BBQ Restaurant",
    secondaryName: "燒味獸",
    address: "Shop 4, G/F, Seaview Garden, 31-33 Shau Kei Wan Main Street East, Shau Kei Wan, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "EASTERN",
  },
  {
    category: "Local Icon",
    name: "Mak's Noodle",
    secondaryName: "麥奀雲吞麵世家",
    address: "77 Wellington St, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Local Icon",
    name: "Joy Hing Roasted Meat",
    secondaryName: "再興燒臘飯店",
    address: "Block C, 265-267 Hennessy Rd, Wan Chai, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "WAN CHAI",
  },

  // --- 4. Pre-packaged Retail Outlets ---
  {
    category: "Prepackaged Retail",
    name: "Jenny Bakery",
    secondaryName: "珍妮曲奇聰明小熊",
    address: "Shop 24, G/F, Mirador Mansion, 54-64 Nathan Road, Tsim Sha Tsui, Kowloon",
    expectedMatch: true,
    expectedLicenceSubstring: "2911803406",
  },

  // --- 5. Chain Branches (Disambiguation by Location/Address) ---
  {
    category: "Chain Branch",
    name: "Samsen (Central)",
    secondaryName: "",
    address: "G/F, 18 On Lan St, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
    expectedLicenceSubstring: "2218819276",
  },
  {
    category: "Chain Branch",
    name: "Samsen (Wan Chai)",
    secondaryName: "",
    address: "68 Stone Nullah Ln, Wan Chai, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "WAN CHAI",
    expectedLicenceSubstring: "2212813559",
  },
  {
    category: "Chain Branch",
    name: "Tim Ho Wan (Central)",
    secondaryName: "添好運點心專門店",
    address: "Shop 12A & 12B, Level 1, MTR Hong Kong Station, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Chain Branch",
    name: "Genki Sushi",
    secondaryName: "元氣壽司",
    address: "Shop C1, G/F, Far East Finance Centre, 16 Harcourt Road, Admiralty, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Chain Branch",
    name: "Bakehouse Soho",
    secondaryName: "",
    address: "G/F., Asiarich Court, 5 Staunton Street, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Chain Branch",
    name: "King Lung Heen",
    secondaryName: "璟瓏軒",
    address: "Museum Restaurant on 4/F., Hong Kong Palace Museum, 8 Museum Drive, West Kowloon Cultural District, Kowloon",
    expectedMatch: true,
    expectedDistrict: "YAU TSIM",
    expectedLicenceSubstring: "2261822519",
  },

  // --- 6. Shopping Mall Establishments (Mall name in address) ---
  {
    category: "Mall Establishment",
    name: "Shake Shack (ifc mall)",
    secondaryName: "",
    address: "Shop 4018, Podium Level 4, ifc mall, 8 Finance St, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Mall Establishment",
    name: "Lady M New York",
    secondaryName: "",
    address: "Shop OT 215K, Level 2, Ocean Terminal, Harbour City, 3-27 Canton Road, Tsim Sha Tsui, Kowloon",
    expectedMatch: true,
    expectedDistrict: "YAU TSIM",
  },
  {
    category: "Mall Establishment",
    name: "Sen-ryo",
    secondaryName: "千両",
    address: "Shop B222, Basement 2, Times Square, 1 Matheson Street, Causeway Bay, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "WAN CHAI",
  },
  {
    category: "Mall Establishment",
    name: "Crystal Jade La Mian Xiao Long Bao",
    secondaryName: "翡翠拉麵小籠包",
    address: "Shop 332, Level 3, New Town Plaza Phase 1, 18 Sha Tin Centre Street, Sha Tin, New Territories",
    expectedMatch: true,
    expectedDistrict: "SHA TIN",
  },
  {
    category: "Mall Establishment",
    name: "Din Tai Fung",
    secondaryName: "鼎泰豐",
    address: "Shop 306, 3/F, Silvercord, 30 Canton Road, Tsim Sha Tsui, Kowloon",
    expectedMatch: true,
    expectedDistrict: "YAU TSIM",
  },
  {
    category: "Mall Establishment",
    name: "Cafe de Coral",
    secondaryName: "大家樂",
    address: "Shop 101, 1/F, Langham Place, 8 Argyle Street, Mong Kok, Kowloon",
    expectedMatch: true,
    expectedDistrict: "MONG KOK",
  },
  {
    category: "Mall Establishment",
    name: "Outback Steakhouse",
    secondaryName: "",
    address: "Shop 226B, Level 2, Citygate Outlets, 20 Tat Tung Road, Tung Chung, Lantau Island",
    expectedMatch: true,
    expectedDistrict: "ISLANDS",
  },

  // --- 7. Famous International & Contemporary Eateries ---
  {
    category: "Contemporary",
    name: "Chaiwala",
    secondaryName: "",
    address: "Basement, 43-55 Wyndham Street, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Contemporary",
    name: "Ho Lee Fook",
    secondaryName: "口利福",
    address: "G/F, 1-5 Elgin St, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Contemporary",
    name: "Yardbird",
    secondaryName: "",
    address: "G/F, 154-158 Wing Lok Street, Sheung Wan, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Contemporary",
    name: "Pici (Central)",
    secondaryName: "",
    address: "G/F, 24-26 Aberdeen Street, Central, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "CENTRAL/WESTERN",
  },
  {
    category: "Contemporary",
    name: "Pici (Wan Chai)",
    secondaryName: "",
    address: "G/F, 16 St. Francis Yard, Wan Chai, Hong Kong",
    expectedMatch: true,
    expectedDistrict: "WAN CHAI",
  },

  {
    category: "Contemporary",
    name: "Tagline Modern Indian Fusion Restaurant and Bar",
    address: "Shop G10, 68 Mody Road Empire Centre, Ground Floor, Tsim Sha Tsui",
    expectedMatch: true,
    expectedLicenceSubstring: "2261811083",
    expectedName: "TAGLINE",
  },

  // --- 8. Negative Controls (Should NEVER match or falsely pair) ---
  {
    category: "Negative Control",
    name: "Hong Kong Park",
    secondaryName: "香港公園",
    address: "19 Cotton Tree Dr, Central, Hong Kong",
    expectedMatch: false,
  },
  {
    category: "Negative Control",
    name: "Kennedy Town Station",
    secondaryName: "堅尼地城站",
    address: "Kennedy Town, Hong Kong",
    expectedMatch: false,
  },
  {
    category: "Negative Control",
    name: "Ichiran Ramen Shibuya",
    secondaryName: "一蘭 渋谷店",
    address: "1 Chome-22-7 Jinnan, Shibuya City, Tokyo 150-0041, Japan",
    expectedMatch: false,
  },
];

async function runBenchmark() {
  console.log(`================================================================`);
  console.log(`🔍 EatSafe HK Restaurant Entity Matching Accuracy Benchmark`);
  console.log(`   Total Test Cases: ${TEST_CASES.length}`);
  console.log(`================================================================\n`);

  let passedCount = 0;
  let failedCount = 0;
  const failures = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const params = new URLSearchParams();
    params.set("shopsign", tc.name);
    if (tc.secondaryName) params.set("secondaryName", tc.secondaryName);
    if (tc.address) params.set("address", tc.address);

    const apiHost = process.env.API_BASE || "https://eatsafe-hk.pages.dev";
    const url = `${apiHost.replace(/\/+$/, "")}/api/restaurants?${params.toString()}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const topMatch = data.restaurants && data.restaurants[0] ? data.restaurants[0] : null;

      let pass = true;
      let failureReason = "";

      if (tc.expectedMatch) {
        if (!topMatch) {
          pass = false;
          failureReason = "Expected match but got 0 results (false negative)";
        } else {
          // Check expected district if specified
          if (tc.expectedDistrict && topMatch.district !== tc.expectedDistrict) {
            pass = false;
            failureReason = `District mismatch: expected ${tc.expectedDistrict}, got ${topMatch.district} (${topMatch.name_en})`;
          }
          // Check expected licence number substring if specified
          if (tc.expectedLicenceSubstring && !topMatch.license_no.includes(tc.expectedLicenceSubstring)) {
            pass = false;
            failureReason = `Licence mismatch: expected ${tc.expectedLicenceSubstring}, got ${topMatch.license_no} (${topMatch.name_en})`;
          }
        }
      } else {
        // Expected NOT to match
        if (topMatch && !data.outsideHongKong) {
          pass = false;
          failureReason = `Expected NO match but got: ${topMatch.name_en} (${topMatch.license_no}) (false positive)`;
        }
      }

      if (pass) {
        passedCount++;
        const matchInfo = topMatch
          ? `[#${topMatch.license_no}] "${topMatch.name_en}" (${topMatch.district}) [${topMatch.matchConfidence || "OK"}]`
          : `[Correctly Suppressed]`;
        console.log(`✅ [${i + 1}/${TEST_CASES.length}] [${tc.category}] ${tc.name}: ${matchInfo}`);
      } else {
        failedCount++;
        failures.push({
          index: i + 1,
          category: tc.category,
          name: tc.name,
          secondaryName: tc.secondaryName,
          address: tc.address,
          failureReason,
          gotMatch: topMatch ? `${topMatch.name_en} (#${topMatch.license_no}, ${topMatch.district}, ${topMatch.address_en})` : null,
        });
        console.log(`❌ [${i + 1}/${TEST_CASES.length}] [${tc.category}] ${tc.name}: FAIL - ${failureReason}`);
        if (topMatch) {
          console.log(`     Got: "${topMatch.name_en}" (#${topMatch.license_no}, ${topMatch.district})`);
        }
      }
    } catch (err) {
      failedCount++;
      failures.push({
        index: i + 1,
        category: tc.category,
        name: tc.name,
        failureReason: `Fetch error: ${err.message}`,
      });
      console.log(`❌ [${i + 1}/${TEST_CASES.length}] [${tc.category}] ${tc.name}: ERROR - ${err.message}`);
    }
  }

  const accuracyPct = ((passedCount / TEST_CASES.length) * 100).toFixed(1);

  console.log(`\n================================================================`);
  console.log(`📊 BENCHMARK RESULTS SUMMARY`);
  console.log(`   Passed: ${passedCount} / ${TEST_CASES.length} (${accuracyPct}%)`);
  console.log(`   Failed: ${failedCount} / ${TEST_CASES.length}`);
  console.log(`================================================================`);

  if (failures.length > 0) {
    console.log(`\n⚠️ Detailed Failure Analysis (${failures.length} cases):`);
    failures.forEach((f, idx) => {
      console.log(`\n${idx + 1}. [${f.category}] "${f.name}" (${f.address})`);
      console.log(`   Reason: ${f.failureReason}`);
      if (f.gotMatch) console.log(`   Got: ${f.gotMatch}`);
    });
  } else {
    console.log(`\n🎉 100% ACCURACY ACHIEVED ACROSS ALL ${TEST_CASES.length} TEST CASES!`);
  }
}

runBenchmark();
