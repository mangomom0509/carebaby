# 토닥 (Todak)

영유아 기록 앱. Expo(React Native) + Supabase로 만들어졌고, **가족 초대 코드**로 부모·돌봄 선생님이 한 아이의 정보를 함께 보고 기록할 수 있어요.

## 시작하기

### 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com)에서 무료 프로젝트를 만드세요.
2. 프로젝트의 **SQL Editor**에서 `supabase/schema.sql` 내용을 전체 실행하세요. (테이블, 접근 권한(RLS), 가족 초대 코드 관련 함수, 사진 저장소 버킷까지 한 번에 만들어져요.)
3. **Authentication → Providers**에서 Email 로그인이 켜져 있는지 확인하세요 (기본으로 켜져 있어요). 개발 중에는 **Authentication → Settings**에서 "Confirm email"을 꺼두면 가입 즉시 로그인돼서 테스트가 편해요.
4. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사하세요.

### 2. 앱에 연결

```bash
cp .env.example .env
# .env 파일을 열어 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 채우기
npm install
npx expo start
```

Expo Go 앱(iOS/Android)으로 QR코드를 스캔하면 바로 확인할 수 있어요.

## 가족 공유가 동작하는 방식

- 회원가입한 사람이 "새 가족 만들기"를 하면 `families` 그룹이 생기고, 그 자리에서 **6자리 초대 코드**(7일 유효)가 발급돼요.
- 다른 사람(배우자, 돌봄 선생님)이 이 앱을 새로 설치해서 회원가입 후 그 코드를 입력하면 **자동으로 같은 가족 그룹에 연결**되고, 같은 아이 정보·기록을 함께 보고 씁니다.
- 프로필 탭에서 언제든 새 초대 코드를 다시 만들 수 있어요.
- 데이터 접근은 Supabase RLS(Row Level Security)로 강제돼요 — 가족 그룹에 속한 사람만 그 아이의 데이터를 읽고 쓸 수 있고, 다른 가족의 데이터는 절대 보이지 않아요.

## 앱스토어 배포까지 남은 것 (사장님이 직접 하셔야 하는 부분)

1. Apple Developer 계정($99/년), Google Play Console 계정($25 1회 결제)
2. `app.json`의 `ios.bundleIdentifier` / `android.package`를 실제 소유한 값으로 변경
3. 앱 아이콘/스플래시 이미지를 `assets/`에 교체 (현재는 Expo 기본 템플릿 이미지)
4. 개인정보처리방침 페이지 작성 (아이·가족 정보를 다루므로 스토어 심사에서 필수)
5. `eas build` (EAS 계정 필요, 무료 티어 있음)로 iOS/Android 빌드 생성 → `eas submit`으로 스토어 제출

## 지금 이 앱에서 되는 것 / 안 되는 것

**됨:**
- 회원가입/로그인 (Supabase Auth)
- 가족 만들기 / 초대 코드로 참여하기
- 아이 프로필 등록
- 홈 / 기록(오늘 타임라인 추가·실시간 반영) / 내정보(초대 코드 발급) 탭
- 캘린더 탭 (날짜별 사진 등록·교체·삭제, 달력 칸 썸네일, 사진 모아보기 그리드, 날짜 탭하면 그날 기록도 함께 표시) — 사진은 Supabase Storage의 비공개 버킷에 저장되고 signed URL로만 열람돼요.

**아직 프로토타입에만 있고 이 앱엔 없음 (다음 작업 대상):**
- 캘린더에 예방접종·검진 일정 표시
- 예방접종 스케줄 자동 계산 + 동시접종 묶기
- WHO 기준 발달 체크리스트
- 고정 스케줄표 / 패턴 기반 수유·수면 예측
- 사진 업로드(Supabase Storage 연동) 및 월별 콜라주 모아보기
- 일기·오늘의 한마디, 할 일 목록
- 다크모드

원래 있던 HTML 프로토타입(Claude 아티팩트)의 로직을 화면 단위로 하나씩 이 앱에 옮기면서 채워나갈 예정이에요.
