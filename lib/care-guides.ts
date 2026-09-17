interface GuideEntry {
  max: number;
  text: string;
}

const SLEEP_GUIDE: GuideEntry[] = [
  { max: 3, text: '하루 14~17시간, 낮잠 3~5회로 나뉘어요. 아직 밤낮 구분이 뚜렷하지 않을 수 있어요.' },
  { max: 6, text: '하루 12~15시간, 낮잠 2~3회가 흔해요. 밤잠이 조금씩 길어지는 시기예요.' },
  { max: 12, text: '하루 11~14시간, 낮잠 2회(오전·오후)로 자리잡는 시기예요.' },
  { max: 24, text: '하루 11~14시간, 낮잠이 1회로 줄어드는 아이도 있어요.' },
  { max: 36, text: '하루 10~13시간, 낮잠 1회 또는 생략하는 아이도 있어요.' },
  { max: 9999, text: '하루 10~13시간, 밤잠 위주로 자리잡는 시기예요.' },
];

const DIET_GUIDE: GuideEntry[] = [
  { max: 5, text: '모유·분유만으로 충분한 시기예요. 이유식은 보통 만 4~6개월부터 시작을 고려해요.' },
  { max: 8, text: '미음·죽 형태의 초기 이유식 시기예요. 새 재료는 하나씩, 알레르기 반응을 살피며 시도해요.' },
  { max: 11, text: '다지거나 으깬 형태의 중기 이유식 시기예요. 하루 2~3회로 늘려가는 시기예요.' },
  { max: 15, text: '잘게 썬 진밥 형태의 후기 이유식 시기예요. 손으로 집어먹는 연습도 시작해볼 수 있어요.' },
  { max: 24, text: '가족식에 가까운 유아식으로 넘어가는 시기예요. 간은 최대한 싱겁게 유지해요.' },
  { max: 9999, text: '유아식이 자리잡는 시기예요. 다양한 식재료와 식감을 골고루 경험시켜 주세요.' },
];

function getGuide(list: GuideEntry[], months: number): string {
  for (const entry of list) {
    if (months <= entry.max) return entry.text;
  }
  return list[list.length - 1].text;
}

export function getSleepGuide(months: number): string {
  return getGuide(SLEEP_GUIDE, months);
}

export function getDietGuide(months: number): string {
  return getGuide(DIET_GUIDE, months);
}
