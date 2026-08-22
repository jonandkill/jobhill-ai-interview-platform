# JOB HILL AI 모의면접 플랫폼

이력서·자기소개서와 지원 회사·직무를 바탕으로 질문을 생성하고, 카메라·마이크 사전 점검, 음성 답변 전사, 근거 기반 AI 피드백, 재연습과 결과 내보내기를 제공하는 웹 애플리케이션입니다.

카메라는 셀프뷰와 촬영 환경 확인에 사용합니다. 표정으로 감정·성격·합격 가능성을 추론하지 않으며, 화면의 평가는 실제 채용 결과가 아닌 답변 연습을 돕는 지표입니다.

## 기술 구성

- 클라이언트: React 19, TypeScript, Vite 7, Tailwind CSS 4, TanStack Query
- 서버: Node.js 22, Express 4, tRPC 11
- 데이터: MySQL/TiDB, Drizzle ORM
- 테스트: Vitest
- 패키지 관리자: pnpm 10

클라이언트와 API는 하나의 Express 프로세스로 배포됩니다. Vite는 `dist/public`에 정적 파일을 만들고 esbuild는 서버 진입점을 `dist/index.js`로 번들링합니다.

## 로컬 실행

### 1. 요구 사항

- Node.js 22.x
- pnpm 10.x (`packageManager`에 고정된 버전 권장)
- MySQL 8 호환 데이터베이스 또는 TiDB
- 음성 질문 사용 시 별도 GPU `services/qwen3-tts` 사이드카와 읽기 전용 Qwen3-TTS 모델
- 한글 PDF 생성 시 Noto Sans CJK KR Regular/Bold 글꼴

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install --frozen-lockfile
cp .env.example .env
```

`.env`에는 실제 개발용 값을 입력하되 저장소에 커밋하지 않습니다. 기존 데이터가 없는 로컬 DB에서만 다음 명령으로 스키마를 적용합니다.

```bash
pnpm db:push
pnpm dev
```

기본 주소는 `http://localhost:3000`입니다. localhost가 아닌 장치에서 카메라·마이크를 사용하려면 HTTPS가 필요합니다.

## 환경변수

| 변수 | 운영 필수 | 용도 |
|---|---:|---|
| `DATABASE_URL` | 예 | MySQL/TiDB 연결 문자열 |
| `JWT_SECRET` | 예 | 세션 서명 비밀값, 최소 32자 |
| `APP_BASE_URL` | 예 | 공개 HTTPS 원점, 예: `https://interview.example.com` |
| `VITE_APP_ID` | 예 | OAuth 애플리케이션 ID |
| `OAUTH_SERVER_URL` | 예 | OAuth API 서버 URL |
| `OAUTH_PORTAL_URL` | 예 | OAuth 로그인 포털 URL |
| `OWNER_OPEN_ID` | 선택 | 최초 운영자 역할 매핑 |
| `BUILT_IN_FORGE_API_URL` | AI 기능 사용 시 | 서버 측 AI·스토리지 API 기준 URL |
| `BUILT_IN_FORGE_API_KEY` | AI 기능 사용 시 | 서버 측 AI·스토리지 비밀키 |
| `QWEN3_TTS_URL`, `QWEN3_TTS_TOKEN` | 선택 | 자체 호스팅 Qwen3-TTS 한국어 음성 서비스 |
| `SUPERTONIC3_TTS_URL` | 선택 | 자체 호스팅 경량 TTS 폴백 |
| `VITE_TOSS_CLIENT_KEY` | Toss 사용 시 | 브라우저에 공개되는 Toss 클라이언트 키 |
| `TOSS_SECRET_KEY` | Toss 사용 시 | 서버 전용 Toss 시크릿 키 |
| `SCHEDULER_SECRET` | 스케줄 API 사용 시 | 수동 스케줄 실행 보호값, 최소 32자 |
| `KIWOOMPAY_*` | 레거시 연동 시 | 키움페이 상점·웹훅 설정 |
| `PORT` | 선택 | HTTP 포트, 기본값 `3000` |

`VITE_` 접두사가 붙은 값은 브라우저 번들에 포함될 수 있습니다. 비밀키에는 절대 이 접두사를 사용하지 마세요. 운영 설정은 호스팅 서비스의 암호화된 Secret 저장소에서 주입합니다.

## 품질 검사

```bash
pnpm check
pnpm test:ci
pnpm build
```

`test:ci`는 외부 결제사·DB·TTS에 접속하지 않는 결정적 회귀 테스트만 실행합니다. `pnpm test`는 전체 테스트 모음이며 일부 레거시 통합 테스트가 실제 DB, Python TTS 또는 결제 테스트 키를 요구하므로 격리된 스테이징 환경에서 실행해야 합니다.

GitHub Actions는 pull request와 `main` push에서 Node.js 22와 pnpm 10.4.1을 사용해 잠금 파일 설치, 타입 검사, 결정적 테스트, 프로덕션 빌드를 차례로 검증합니다. 어떤 비밀값도 CI 소스에 저장하지 않습니다.

## 프로덕션 빌드

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:ci
pnpm build
NODE_ENV=production pnpm start
```

운영 시작 시 필수 인증·DB 설정이 없거나 `APP_BASE_URL`이 HTTPS가 아니면 서버가 시작을 거부합니다. 배포 플랫폼은 `PORT`를 주입하고, 애플리케이션 프로세스에 종료 신호를 전달하며, `dist/` 전체를 동일한 릴리스 산출물로 배포해야 합니다.

헬스 체크는 tRPC의 `system.health`를 사용합니다.

```bash
curl --get \
  --data-urlencode 'input={"json":{"timestamp":0}}' \
  https://interview.example.com/api/trpc/system.health
```

## 배포 시 별도 준비할 자산

대용량·환경 종속 파일은 Git에서 제외합니다.

- `server/assets/fonts/NotoSansCJK-Regular.ttc`
- `server/assets/fonts/NotoSansCJK-Bold.ttc`
- GPU 추론 서비스의 Qwen3-TTS 1.7B 모델과 `services/qwen3-tts` 컨테이너

리눅스 시스템에 Noto CJK 글꼴을 설치해 `/usr/share/fonts/opentype/noto/`에서 제공해도 PDF 생성기가 탐색합니다. Qwen3-TTS 질문 음성은 메모리 WAV로만 반환하며 DB, S3, CDN, 임시 파일에 저장하지 않습니다. 서버 측 외부 Edge TTS 경로는 제거했습니다.

## 보안·개인정보 원칙

- 모든 사용자 소유 객체는 `ctx.user.id`로 소유권을 확인합니다.
- 상품명·가격·결제 상태는 서버 카탈로그와 결제사 승인 결과만 신뢰합니다.
- `.env`, `.manus/`, `.project-config.json`, 로그와 실제 사용자 자료를 커밋하지 않습니다.
- 영상은 현재 서버에 업로드하지 않습니다. 음성 전사 공급자, 저장 범위, 보존·삭제 정책은 실제 운영과 개인정보처리방침이 일치해야 합니다.
- 다중 인스턴스 배포 전 rate limit과 스케줄러 잠금을 Redis 같은 공유 저장소로 이전해야 합니다.

보안·UX 조치 내역은 [AI_INTERVIEW_SECURITY_UX_AUDIT_2026-08-22.md](./AI_INTERVIEW_SECURITY_UX_AUDIT_2026-08-22.md), 실제 운영 순서는 [배포 체크리스트](./docs/DEPLOYMENT_CHECKLIST.md)를 확인하세요.

## 라이선스

저장소 루트의 Boost Software License 1.0(`BSL-1.0`)을 따릅니다.
