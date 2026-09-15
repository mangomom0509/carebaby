// Developmental milestone reference. Gross-motor items follow the WHO Motor
// Development Study windows; the rest follow commonly used general pediatric
// checkpoints (CDC-style "몇 개월엔 이런 걸 해요" lists). This is a rough guide,
// not a diagnostic tool — always confirm with a pediatrician / 영유아 건강검진.
export type DevDomain = '대근육' | '소근육' | '언어' | '사회정서' | '인지';

export interface DevMilestoneRef {
  id: string;
  domain: DevDomain;
  label: string;
  ageMonths: number; // anchor age used to sort/group and to decide "확인해볼 시기"
  windowNote: string;
  ageGroup: string; // grouping label shown in the UI
}

export const DEV_MILESTONES: DevMilestoneRef[] = [
  // WHO Motor Development Study — published windows (50th percentile, min–max)
  { id: 'motor-sit', domain: '대근육', label: '도움 없이 앉기', ageMonths: 6, windowNote: 'WHO 기준 3.8~9.2개월', ageGroup: '대근육 발달(WHO)' },
  { id: 'motor-stand-assist', domain: '대근육', label: '잡고 서기', ageMonths: 8, windowNote: 'WHO 기준 4.8~11.4개월', ageGroup: '대근육 발달(WHO)' },
  { id: 'motor-crawl', domain: '대근육', label: '기어다니기', ageMonths: 8, windowNote: 'WHO 기준 5.2~13.5개월', ageGroup: '대근육 발달(WHO)' },
  { id: 'motor-walk-assist', domain: '대근육', label: '잡고 걷기', ageMonths: 9, windowNote: 'WHO 기준 5.9~13.7개월', ageGroup: '대근육 발달(WHO)' },
  { id: 'motor-stand-alone', domain: '대근육', label: '혼자 서기', ageMonths: 11, windowNote: 'WHO 기준 6.9~16.9개월', ageGroup: '대근육 발달(WHO)' },
  { id: 'motor-walk-alone', domain: '대근육', label: '혼자 걷기', ageMonths: 12, windowNote: 'WHO 기준 8.2~17.6개월', ageGroup: '대근육 발달(WHO)' },

  // General checkpoints, 2개월
  { id: 'fine-2', domain: '소근육', label: '손을 폈다 오므렸다 해요', ageMonths: 2, windowNote: '2개월 무렵', ageGroup: '2개월' },
  { id: 'lang-2', domain: '언어', label: '부드러운 소리에 반응해 조용해지거나 웃어요', ageMonths: 2, windowNote: '2개월 무렵', ageGroup: '2개월' },
  { id: 'social-2', domain: '사회정서', label: '사람 얼굴을 잠깐 쳐다봐요', ageMonths: 2, windowNote: '2개월 무렵', ageGroup: '2개월' },
  { id: 'cog-2', domain: '인지', label: '움직이는 물체를 눈으로 따라가요', ageMonths: 2, windowNote: '2개월 무렵', ageGroup: '2개월' },

  // 4개월
  { id: 'fine-4', domain: '소근육', label: '손을 뻗어 장난감을 잡으려고 해요', ageMonths: 4, windowNote: '4개월 무렵', ageGroup: '4개월' },
  { id: 'lang-4', domain: '언어', label: '옹알이를 해요', ageMonths: 4, windowNote: '4개월 무렵', ageGroup: '4개월' },
  { id: 'social-4', domain: '사회정서', label: '먼저 미소를 지어요', ageMonths: 4, windowNote: '4개월 무렵', ageGroup: '4개월' },
  { id: 'cog-4', domain: '인지', label: '익숙한 얼굴을 알아봐요', ageMonths: 4, windowNote: '4개월 무렵', ageGroup: '4개월' },

  // 6개월
  { id: 'fine-6', domain: '소근육', label: '물건을 한 손에서 다른 손으로 옮겨요', ageMonths: 6, windowNote: '6개월 무렵', ageGroup: '6개월' },
  { id: 'lang-6', domain: '언어', label: '자음 소리를 내기 시작해요 (바바, 마마 등)', ageMonths: 6, windowNote: '6개월 무렵', ageGroup: '6개월' },
  { id: 'social-6', domain: '사회정서', label: '낯가림을 시작해요', ageMonths: 6, windowNote: '6개월 무렵', ageGroup: '6개월' },
  { id: 'cog-6', domain: '인지', label: '떨어뜨린 물건을 찾으려고 해요', ageMonths: 6, windowNote: '6개월 무렵', ageGroup: '6개월' },

  // 9개월
  { id: 'fine-9', domain: '소근육', label: '엄지·검지로 작은 물건을 집어요 (집게잡기)', ageMonths: 9, windowNote: '9개월 무렵', ageGroup: '9개월' },
  { id: 'lang-9', domain: '언어', label: '이름을 부르면 반응해요', ageMonths: 9, windowNote: '9개월 무렵', ageGroup: '9개월' },
  { id: 'social-9', domain: '사회정서', label: '까꿍놀이를 좋아해요', ageMonths: 9, windowNote: '9개월 무렵', ageGroup: '9개월' },
  { id: 'cog-9', domain: '인지', label: '장난감을 숨기면 찾으려고 해요', ageMonths: 9, windowNote: '9개월 무렵', ageGroup: '9개월' },

  // 12개월
  { id: 'fine-12', domain: '소근육', label: '혼자 컵을 들고 마시려고 해요', ageMonths: 12, windowNote: '12개월 무렵', ageGroup: '12개월' },
  { id: 'lang-12', domain: '언어', label: '엄마·아빠 외에 한두 단어를 말해요', ageMonths: 12, windowNote: '12개월 무렵', ageGroup: '12개월' },
  { id: 'social-12', domain: '사회정서', label: '손을 흔들어 인사해요', ageMonths: 12, windowNote: '12개월 무렵', ageGroup: '12개월' },
  { id: 'cog-12', domain: '인지', label: '간단한 지시를 따라요 ("이리 줘")', ageMonths: 12, windowNote: '12개월 무렵', ageGroup: '12개월' },

  // 15개월
  { id: 'fine-15', domain: '소근육', label: '블록 2개를 쌓아요', ageMonths: 15, windowNote: '15개월 무렵', ageGroup: '15개월' },
  { id: 'lang-15', domain: '언어', label: '3~5개 단어를 말해요', ageMonths: 15, windowNote: '15개월 무렵', ageGroup: '15개월' },
  { id: 'social-15', domain: '사회정서', label: '친숙한 어른의 행동을 따라 해요', ageMonths: 15, windowNote: '15개월 무렵', ageGroup: '15개월' },
  { id: 'cog-15', domain: '인지', label: '그림책의 그림을 가리켜요', ageMonths: 15, windowNote: '15개월 무렵', ageGroup: '15개월' },

  // 18개월
  { id: 'fine-18', domain: '소근육', label: '숟가락을 사용해 먹어요', ageMonths: 18, windowNote: '18개월 무렵', ageGroup: '18개월' },
  { id: 'lang-18', domain: '언어', label: '10개 이상의 단어를 말해요', ageMonths: 18, windowNote: '18개월 무렵', ageGroup: '18개월' },
  { id: 'social-18', domain: '사회정서', label: '다른 아이에게 관심을 보여요', ageMonths: 18, windowNote: '18개월 무렵', ageGroup: '18개월' },
  { id: 'cog-18', domain: '인지', label: '몸의 부위(코, 눈 등)를 가리켜요', ageMonths: 18, windowNote: '18개월 무렵', ageGroup: '18개월' },

  // 24개월
  { id: 'fine-24', domain: '소근육', label: '블록 4개 이상을 쌓아요', ageMonths: 24, windowNote: '24개월 무렵', ageGroup: '24개월' },
  { id: 'lang-24', domain: '언어', label: '두 단어를 이어서 말해요 ("엄마 물")', ageMonths: 24, windowNote: '24개월 무렵', ageGroup: '24개월' },
  { id: 'social-24', domain: '사회정서', label: '간단한 역할놀이를 해요', ageMonths: 24, windowNote: '24개월 무렵', ageGroup: '24개월' },
  { id: 'cog-24', domain: '인지', label: '같은 모양끼리 짝지어요', ageMonths: 24, windowNote: '24개월 무렵', ageGroup: '24개월' },

  // 30개월
  { id: 'fine-30', domain: '소근육', label: '간단한 옷을 스스로 벗어요', ageMonths: 30, windowNote: '30개월 무렵', ageGroup: '30개월' },
  { id: 'lang-30', domain: '언어', label: '3단어 이상 문장을 말해요', ageMonths: 30, windowNote: '30개월 무렵', ageGroup: '30개월' },
  { id: 'social-30', domain: '사회정서', label: '다른 아이와 짧게 함께 놀아요', ageMonths: 30, windowNote: '30개월 무렵', ageGroup: '30개월' },
  { id: 'cog-30', domain: '인지', label: '색깔 이름을 한두 개 알아요', ageMonths: 30, windowNote: '30개월 무렵', ageGroup: '30개월' },

  // 36개월
  { id: 'fine-36', domain: '소근육', label: '가위로 종이를 자르는 흉내를 내요', ageMonths: 36, windowNote: '36개월 무렵', ageGroup: '36개월' },
  { id: 'lang-36', domain: '언어', label: '낯선 사람도 절반 이상 알아들을 수 있게 말해요', ageMonths: 36, windowNote: '36개월 무렵', ageGroup: '36개월' },
  { id: 'social-36', domain: '사회정서', label: '차례를 기다려요', ageMonths: 36, windowNote: '36개월 무렵', ageGroup: '36개월' },
  { id: 'cog-36', domain: '인지', label: '간단한 퍼즐(3~4조각)을 맞춰요', ageMonths: 36, windowNote: '36개월 무렵', ageGroup: '36개월' },
];

export const DOMAIN_COLOR: Record<DevDomain, string> = {
  대근육: '#3D7DD9',
  소근육: '#3AA07E',
  언어: '#C98A1E',
  사회정서: '#FF6B4A',
  인지: '#8B5CF6',
};
