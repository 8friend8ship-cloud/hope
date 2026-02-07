
import { ScenarioDB, UserInput, CountryConfig, ScenarioTemplate } from './types';

// --- GLOBAL MASTER DATASET ---
export const GLOBAL_100: Record<string, CountryConfig> = {
  korea: { code: 'ko', currency: '₩', bank: 'SC제일', prop: '직방', cities: ['강남','판교','용인','부산','서울','의정부','수원'], visaName: '거주비자', avgSalary: '4,500만원' },
  thailand: { code: 'th', currency: '฿', bank: 'Kasikorn', prop: 'DDproperty', cities: ['방콕','치앙마이','푸켓'], visaName: 'Elite Visa', avgSalary: '฿80만' },
  indonesia: { code: 'id', currency: 'Rp', bank: 'BCA', prop: 'Rumah123', cities: ['자카르타','발리','우붓'], visaName: 'KITAS', avgSalary: 'Rp2.4억' },
  singapore: { code: 'en', currency: 'SGD', bank: 'DBS', prop: 'PropertyGuru', cities: ['싱가포르','센토사'], visaName: 'EP', avgSalary: 'SGD 8.4만' },
  portugal: { code: 'pt', currency: '€', bank: 'Millennium', prop: 'Idealista', cities: ['리스본','포르투','알가르베'], visaName: 'D7 Visa', avgSalary: '€3.2만' },
  usa: { code: 'en', currency: '$', bank: 'Chase', prop: 'Zillow', cities: ['뉴욕','LA','플로리다','텍사스','샌프란시스코','오하이오'], visaName: 'H1B/O1', avgSalary: '$8.5만' },
  australia: { code: 'en', currency: 'A$', bank: 'CBA', prop: 'Realestate.com.au', cities: ['시드니','멜버른','브리즈번', '골드코스트'], visaName: 'TSS 482', avgSalary: 'A$9.2만' },
  default: { code: 'en', currency: '$', bank: 'Global Bank', prop: 'Global Prop', cities: ['Global City'], visaName: 'Work Visa', avgSalary: '$50,000' }
};

export const detectCountry = (text: string): string => {
  const t = text.toLowerCase();
  for (const [key, config] of Object.entries(GLOBAL_100)) {
    if (t.includes(key)) return key;
    if (config.cities.some(city => t.includes(city.toLowerCase()))) return key;
    if (key === 'portugal' && /포르투갈|리스본/.test(t)) return key;
    if (key === 'singapore' && /싱가포르|싱가폴/.test(t)) return key;
  }
  return 'default';
};

// --- DEFAULT TEMPLATES (Fallback) ---
// These are used if LocalStorage is empty.
export const DEFAULT_TEMPLATES: ScenarioTemplate[] = [
  // 1. SINGAPORE -> PORTUGAL (Specific Request)
  {
    id: 'template_sg_pt',
    type: 'report',
    tags: ['singapore', 'portugal', 'lisbon', 'retire', 'd7'],
    story: {
      titleTemplate: "{age}세 {start} → {goal} 알파마 정착 {months}개월",
      subTemplate: "(맞벌이 은퇴 부부 2인 - 자녀 독립)",
      stages: [
        {
          label: "Day 1",
          title: "포르투갈은 유럽 최저가 낙원의 환상이다",
          content: {
            situation: "{start} HDB 월세 SGD 5,500, 자산 SGD 850K. 은퇴 후 자산 운용 전문가 부부. 2.5년 후 {goal} 골든비자 D7 비자 정착 목표.",
            thought: "\"{start} 세금 22% → {goal} 비과세 + 의료 무료\"",
            action: "{goal} 부동산 에이전트 컨택 + 월 SGD 8,000 리스본 펀드 적립 시작"
          }
        },
        {
          label: "Month 7 (23% 진행)",
          title: "첫 번째 망함: 규제의 늪",
          content: {
            experiment: "{goal} 골든비자 투자 (50만 유로 아파트)",
            failure: "EU 자금세탁 규제 강화 → 비자 발급 18개월 대기. {start} HDB 재계약 + 임대수익 SGD 4,200 손실",
            question: "\"최저가 낙원이 아니라 규제 늪인가?\"",
            solution: "D7 비자 전환 (월 수입 증빙) + 리스본 외곽 소형 아파트 우선 매입",
            reality: "실제 절약: 월 SGD 5,500 → SGD 4,200 (SGD 1,300 성공)"
          }
        },
        {
          label: "Month 16 (53% 진행)",
          title: "중간 위기: 세금과 소음",
          content: {
            situation: "자산 SGD 920K, 월 원격 자산운용 수입 SGD 12,000 안정화",
            failure: "{goal} 부동산세 IMI 연 1.6% + 지방세 → 연 8,500유로. 부인 포르투갈어 불통 + 현지 은행 계좌 개설 거부. 아파트 관리비 폭등 + 이웃 소음 민원",
            solution: "1. 알가르베 지역으로 이전 (세금 0.8% + 조용한 마을)\n2. {goal} NIF 번호 + {start} 은행 연동 계좌\n3. 현지 부동산 관리 업체 위임 (월 350유로)",
            thought: "\"생활비 60% 절감, 관리비 200% 증가의 균형\""
          }
        },
        {
          label: "Month 30 (87% 진행)",
          title: "최종 고비: 리얼리티 체크",
          content: {
            result: "{goal} 알파마 80㎡ 아파트 매입 (유로 380K). 자산 SGD 1.02M (+SGD 170K 증가). 생활비 월 SGD 5,500 → SGD 3,800.",
            reality: "- {goal} 의료 무료지만 대기 6개월 → 사립병원 연 2,400유로 추가\n- 골든비자 폐지 후 D7 비자 갱신 매 2년 1,200유로\n- 유로화 강세: 자산 15% 환손실 가능성\n- {start} 복귀 불가: HDB 재구매 SGD 1.2M 현실\n\n하루 SGD 56 절약했지만, 매일 SGD 40의 '언어 장벽' 소모"
          }
        }
      ]
    },
    resultTable: [
      { item: '월 생활비', before: 'SGD 5,500', after: 'SGD 3,800', diff: '-1,700' },
      { item: '자산 가치', before: 'SGD 850K', after: 'SGD 1.02M', diff: '+20%' },
      { item: '의료비', before: '보험 적용', after: '사립 병원비', diff: '+SGD 200/월' },
      { item: '스트레스', before: '고비용 압박', after: '언어 장벽', diff: '종류 변화' }
    ],
    essay: {
      title: "낙원은 가성비의 영역이 아니다",
      intro: "{start}에서 {goal}로 이동하는 것은 단순히 위도와 경도를 바꾸는 일이 아닙니다. 당신은 '고효율 스트레스'를 '저효율 낭만'으로 맞바꾸려 하고 있습니다. 많은 이들이 {currency} 환율 계산기를 두드리며 이민을 결심하지만, 정작 그들을 무너뜨리는 건 숫자가 아닙니다.",
      body: "통장에 찍히는 생활비 잔액은 분명 늘어날 것입니다. 하지만 당신이 간과한 비용이 있습니다. \n\n첫째, '무능력자가 되는 경험'의 비용입니다. {start}에서 당신은 언어와 문화의 주인이었지만, {goal}에서는 은행 계좌 하나를 여는 데 3주를 소비하는 이방인일 뿐입니다. 그 자괴감의 비용은 엑셀 시트에 없습니다.\n\n둘째, '느림의 미학'이 주는 폭력성입니다. 여행자로 방문했을 때의 여유로움은 거주자가 되었을 때 무책임한 행정 처리로 돌변합니다. 당신의 한국식 '빨리빨리' 유전자는 매일 현지의 느긋함과 충돌하며 염증 반응을 일으킬 것입니다.\n\n결국 이민은 돈을 아끼러 가는 곳이 아니라, 불편함을 돈 주고 사러 가는 행위입니다. 그 불편함 속에서 새로운 나를 발견할 준비가 되지 않았다면, 당신의 낙원은 곧 지옥이 될 것입니다."
    },
    downloads: [
      {
        title: "포르투갈 D7 비자 서류 체크리스트 2026",
        description: "대사관 반려 사유 1위 항목 포함, 필수 준비 서류 12종 완벽 정리",
        type: "pdf",
        triggerType: "ad"
      },
      {
        title: "리스본/알가르베 한 달 살기 예산표",
        description: "현지 마트 물가, 공과금, 월세 실수령액 엑셀 계산기",
        type: "excel",
        triggerType: "link",
        triggerUrl: "https://www.coupang.com/vp/products/example" // Example Coupang Link
      }
    ]
  },

  // 2. BUSAN -> BALI (Report Style)
  {
    id: 'template_bali_report',
    type: 'report',
    tags: ['bali', 'indonesia', 'busan', 'freelance', 'family'],
    story: {
      titleTemplate: "{age}세 {start} → {goal} 우붓 정착 {months}개월",
      subTemplate: "(맞벌이 부부 + 자녀 1명 가정)",
      stages: [
        {
          label: "Day 1",
          title: "발리는 열대 낙원의 환상이다",
          content: {
            situation: "{start} 해운대 월세 220만 원, 자산 1억 8,000만 원. 2년 후 {goal} 우붓 빌라 장기 체류 목표.",
            thought: "\"IT 프리랜서로 {goal}서 디지털 노마드\"",
            action: "우붓 코워킹 스페이스 커뮤니티 가입 + 월 250만 원 해외 펀드 시작"
          }
        },
        {
          label: "Month 5 (21% 진행)",
          title: "첫 번째 망함: 교육비 충격",
          content: {
            experiment: "{goal} 국제학교 + KITAS 비자 조사",
            failure: "{goal} 국제학교 연 6,500만 루피아 (한국 3배) + KITAS 1년 3,500만 루피아. 자녀: \"한국 학교 친구들 놓치기 싫어\" 극심한 반발",
            question: "\"디지털 노마드가 아니라 교육 망국인가?\"",
            solution: "{goal} 한국어 homeschooling + 한국 학원 Zoom 병행",
            reality: "실제 절약: 월 220만 → 145만 원 (75만 원 성공)"
          }
        },
        {
          label: "Month 14 (55% 진행)",
          title: "중간 위기: 인프라의 한계",
          content: {
            situation: "자산 2억 4,500만 원, 원격 수입 월 380만 원 안정화",
            failure: "{goal} 빌라 외국인 소유 제한 + 임대 관리비 월 120만 루피아. 인터넷 불안정 → 클라이언트 작업 차질",
            solution: "1. 우붓 빌라 PTY 법인 설립 (1억 2,000만 원 투자)\n2. 현지인 파트너와 25년 계약 체결\n3. 스타링크 위성 인터넷 설치 (월 25만 루피아)",
            thought: "\"{goal} 생활비 60%, 하지만 인프라 40% 수준\""
          }
        },
        {
          label: "Month 24 (89% 진행)",
          title: "최종 고비: 완전 정착",
          content: {
            result: "우붓 그라스트리트 근처 빌라 25년권 계약. 자산 2억 9,800만 원. 생활비 월 220만 → 145만 원.",
            reality: "- 자녀 한국 대학 입시 불가능 → {goal} 국제학교 졸업장\n- 부인 우울증 → 한국 왕복 1년에 4회 (800만 원)\n- 루피아화 약세: 1억 원 상당 자산 25% 증발 가능\n- 한국 복귀 불가: 부산 월세 320만 원 현실\n\n하루 2.5만 원 절약했지만, 매일 3만 원의 '문화 충격' 소모"
          }
        }
      ]
    },
    resultTable: [
      { item: '월 주거비', before: '220만 원', after: '145만 원', diff: '-75만' },
      { item: '교육비', before: '공교육', after: '홈스쿨링', diff: '+부모 노동' },
      { item: '순자산', before: '1.8억', after: '2.98억', diff: '+1.18억' },
      { item: '삶의 질', before: '경쟁 압박', after: '인프라 부족', diff: '등가 교환' }
    ],
    essay: {
      title: "디지털 노마드라는 이름의 난민",
      intro: "노트북 하나 들고 해변에서 일하는 삶. 인스타그램이 만들어낸 21세기의 가장 달콤한 사기극입니다. {start}의 빌딩 숲을 탈출해 {goal}의 정글로 들어가는 당신은 스스로를 '개척자'라 부르겠지만, 현지인들의 눈에는 그저 '환율 차익을 노리는 뜨내기'일 뿐입니다.",
      body: "진짜 문제는 '자유'의 무게입니다. {start}에서는 회사가 당신의 시간을 통제했지만, {goal}에서는 당신이 스스로를 통제해야 합니다. 그리고 대부분의 현대인은 그 자유를 감당하지 못합니다. \n\n느린 인터넷 속도, 끊기는 전기, 눅눅한 침대 시트는 낭만이 아니라 생존의 문제입니다. 당신은 '일'과 '휴식'의 경계가 무너진 채, 싼 물가에 취해 서서히 게을러지는 자신을 발견하게 될 것입니다. \n\n도피성 이주에 성공은 없습니다. 당신이 {start}에서 해결하지 못한 내면의 문제는 비행기를 탄다고 사라지지 않습니다. 수하물처럼 당신을 따라와 {goal}의 풀빌라 옆자리에 누워있을 것입니다."
    },
    downloads: [
      {
        title: "발리 장기 거주 비자(KITAS/B211) 가이드",
        description: "최신 비자 정책 변화 및 대행사 사기 피하는 법",
        type: "pdf",
        triggerType: "ad"
      },
      {
        title: "디지털 노마드 필수 장비 추천 리스트",
        description: "현지 인터넷 환경을 극복하는 공유기 및 파워뱅크",
        type: "pdf",
        triggerType: "link",
        triggerUrl: "https://www.coupang.com/vp/products/example"
      }
    ]
  },

  // 3. GANGNAM DEBT (Report Style)
  {
    id: 'template_gangnam_report',
    type: 'report',
    tags: ['gangnam', 'seoul', 'debt', 'investment', 'korea'],
    story: {
      titleTemplate: "{age}세 {start} → {goal} 입성 {months}개월",
      subTemplate: "(외벌이 가장 + 1.8억 대출)",
      stages: [
        {
          label: "Day 1",
          title: "강남은 거대한 종교적 의식이다",
          content: {
            situation: "{start} 거주, 자산 3억. 학군과 계급 이동을 위해 {goal} 진입 결정.",
            thought: "\"지금 아니면 영원히 못 들어간다\"",
            action: "매주 주말 {goal} 임장 + 마이너스 통장 개설"
          }
        },
        {
          label: "Month 4 (15% 진행)",
          title: "첫 번째 망함: 현실의 벽",
          content: {
            experiment: "{goal} 구축 아파트 매수 시도",
            failure: "가계약금 500만 원 날림. 대출 한도 축소로 자금 계획 붕괴. {start}에서 {goal} 왕복 기름값만 월 80만 원.",
            question: "\"이 고생의 가치는 얼마인가?\"",
            solution: "제2금융권 추가 대출 (금리 6.5%) + {start} 전세금 반환 지연으로 인한 브릿지론",
            reality: "실제 지출: 월 이자 250만 원 발생 시작"
          }
        },
        {
          label: "Month 12 (50% 진행)",
          title: "중간 위기: 487만 원의 족쇄",
          content: {
            situation: "{goal} 입성 성공, 1.8억 부채 발생",
            failure: "월 고정 생활비 487만 원. 저축액 2,300만 원으로 급감. 역류성 식도염 및 불면증 발병.",
            solution: "1. 주말 대리운전 부업 시작\n2. 아이 학원비 카드로 돌려막기\n3. SNS에 {goal} 라이프 사진 업로드로 심리적 보상",
            thought: "\"자산은 올랐는데 삶은 가난해졌다\""
          }
        },
        {
          label: "Month 18 (100% 진행)",
          title: "최종 고비: 계산서 청구",
          content: {
            result: "{goal} 등기 완료. 자산 가치 +1억 상승. 하지만 현금 흐름 마이너스.",
            reality: "- 금리 인상 시 매월 30만 원 추가 부담\n- {start}로 복귀 불가능 (자존심 + 아이 교육)\n- 매일 아침 18만 원의 적자로 하루 시작\n\n사람들은 성공이라 부르지만, 나는 시스템의 톱니바퀴가 되었다."
          }
        }
      ]
    },
    resultTable: [
      { item: '월 고정지출', before: '250만 원', after: '487만 원', diff: '+237만' },
      { item: '순부채', before: '0원', after: '1.8억 원', diff: '+1.8억' },
      { item: '자산 가치', before: '3억 (전세)', after: '12억 (자가)', diff: '+9억' },
      { item: '현금 흐름', before: '+150만/월', after: '-30만/월', diff: '적자 전환' }
    ],
    essay: {
      title: "콘크리트 카스트 제도의 수감자들",
      intro: "{goal} 아파트는 단순한 거주 공간이 아닙니다. 그것은 대한민국이라는 계급 사회의 신분증이자, 당신의 노후를 담보로 한 가장 비싼 도박입니다. 당신은 등기권리증을 얻었지만, 그 대가로 '오늘의 행복'을 은행에 저당 잡혔습니다.",
      body: "매일 아침 눈을 뜰 때마다 18만 원의 이자가 숨만 쉬어도 사라집니다. 이것은 집이 당신을 보호하는 것이 아니라, 당신이 집을 모시고 사는 꼴입니다. \n\n이웃들은 경쟁자이고, 아이 친구의 부모는 정보원입니다. {goal}의 화려한 인프라는 돈 없이는 그림의 떡이며, 당신은 그 인프라를 누리기 위해 주말 밤 대리운전을 합니다. \n\n자산 가치는 올랐다고요? 팔아서 실현하지 않는 한 그것은 사이버 머니에 불과합니다. 당신은 부자가 된 것이 아니라, 12억짜리 감옥의 모범수가 된 것입니다. 탈옥은 불가능합니다. 밖은 더 춥거든요."
    },
    downloads: [
      {
        title: "영끌 대출 상환 시뮬레이터 (Excel)",
        description: "금리 인상 시 월 상환액 변화 및 파산 임계점 계산",
        type: "excel",
        triggerType: "ad"
      },
      {
        title: "학군지 진입 전 필독: 숨겨진 비용 보고서",
        description: "사교육비, 품위유지비, 셔틀비 등 현실 비용 총정리",
        type: "pdf",
        triggerType: "link",
        triggerUrl: "https://www.coupang.com/vp/products/example"
      }
    ]
  }
];

export const INITIAL_DB: ScenarioDB = {
  rates: { CAD: 1080, EUR: 1540, CHF: 1620, USD: 1380, AUD: 920, JPY: 910, VND: 0.055, GBP: 1750, SGD: 1030, THB: 38, IDR: 0.088 },
  scenarios: {},
  lastVerified: '2026-02-13 09:00',
  changes: []
};

export const RANDOM_SCENARIOS: Partial<UserInput>[] = [
  { age: '52', job: '은퇴', start: '싱가포르', goal: '포르투갈' },
  { age: '45', job: '프리랜서', start: '부산', goal: '발리' },
  { age: '53', job: '가장', start: '의정부', goal: '강남' },
  { age: '38', job: '워케이션', start: '도쿄', goal: '호주' },
];
