# AI 면접 코치(ai_interview_coach) — GPT WORK 인수인계 문서

> 이 문서는 현재 Manus WebDev 프로젝트를 GPT WORK, ChatGPT Projects, Codex/클라우드 IDE 또는 로컬 개발환경에서 이어가기 위한 기술 인수인계 문서입니다. **비밀키와 실제 사용자 데이터는 포함하지 않았습니다.**

## 1. 이관 기준점

| 항목 | 값 |
|---|---|
| 프로젝트명 | `ai_interview_coach` |
| 설명 | 이력서·자소서 기반 AI 모의면접, 실시간 답변 분석 및 결과 리포트 서비스 |
| 스택 | React 19, TypeScript, Tailwind CSS 4, Express 4, tRPC 11, Drizzle ORM, MySQL/TiDB |
| 최신 체크포인트 | `9d069d75` |
| 현재 배포 도메인 | `https://ai-interview.manus.space`, `https://aiintercoach-8oq9ut3p.manus.space` |
| 현재 개발 경로 | `/home/ubuntu/ai_interview_coach` |
| 인증 | Manus OAuth + 서버 세션 쿠키 |
| 파일 저장 | S3 헬퍼(`storagePut`, `storageGet`) |
| PDF 한글 폰트 | `server/assets/fonts/NotoSansCJK-Regular.ttc`, `NotoSansCJK-Bold.ttc` |

**권장 기준점**은 최신 체크포인트를 기반으로 소스코드를 먼저 옮긴 다음, 새 환경에서 의존성 설치와 타입 검사를 통과시키는 것입니다. 실제 DB와 S3 파일은 소스 ZIP과 별개의 운영 리소스이므로, 코드 이관만으로 사용자 기록이 자동 이전되지는 않습니다.

## 2. 구현된 사용자 기능

현재 앱은 7단계 순차 설정 위자드로 면접을 시작합니다. 기본 정보, 이력서·자소서, 면접 단계, 면접 모드, 면접관 아바타, 타이머, 준비 완료의 순서로 진행하며 한 화면에 모든 설정을 몰아넣지 않는 구조입니다.

면접 진행 중에는 질문 생성, 아바타 표시, 음성 질문 재생, 자막 토글, 볼륨·재생 속도, 답변 타이머, 녹음, Whisper 기반 STT, 카메라·표정·시선 분석 UI가 연결되어 있습니다. 6명의 아바타는 서로 다른 voice ID와 성별·스타일 매핑을 사용합니다. TTS는 `server/_core/edgeTTS.ts` 어댑터를 중심으로 동작하고 브라우저 음성 폴백 경로도 존재하므로, 이관 후 음성 공급자와 폴백을 반드시 별도로 점검해야 합니다.

답변을 제출한 뒤에는 사용자가 직접 **‘피드백 받기’** 버튼을 눌러야 점수, 강점, 개선점, AI 모범 답안, 후속 질문이 생성됩니다. 제출 중에는 ‘음성 분석 중’, ‘답변 내용 분석 중’, ‘모범 답안 생성 중’, ‘피드백 정리 완료’ 문구가 순차적으로 표시됩니다. API 오류가 발생하면 답변 입력을 보존하여 재시도할 수 있습니다.

결과 페이지에서는 녹음 파일과 STT 스크립트, 스크립트 원클릭 복사, STT와 모범 답안 좌우 비교, 질문별 재답변, 핵심 역량 워드클라우드, 추임새·반복어 하이라이트와 통계 위젯, PDF/Word 전체 리포트를 제공합니다. 예상 질문 PDF는 카테고리를 선택한 다음 같은 카테고리 안에서 원하는 질문만 체크박스로 골라 저장할 수 있습니다. 히스토리·필터·북마크·보안 공유 링크도 구현되어 있습니다.

## 3. 핵심 파일 지도

| 파일 | 책임 | 이관 시 주의점 |
|---|---|---|
| `client/src/pages/Interview.tsx` | 위자드, 면접 진행, 녹음, TTS, STT, 답변 제출, 피드백 상태 | `status`, `currentQA`, `submitMutation.isPending` 전이를 깨뜨리지 말 것 |
| `client/src/pages/InterviewResult.tsx` | 결과 상세, STT 카드, 통계, 비교, PDF 선택 모달 | 질문 ID와 `questionType` 필터 계약을 유지할 것 |
| `client/src/components/AnalyzingLoader.tsx` | 로딩 진행률과 단계 문구 | `stepLabels`와 `message` props를 유지할 것 |
| `client/src/lib/transcriptAnalysis.ts` | 추임새·반복어 위치 및 횟수 계산 | 하이라이트와 통계가 같은 분석 결과를 사용해야 함 |
| `client/src/components/InterviewerAvatar.tsx` | 면접관 아바타·표정·음성 메타데이터 | voice ID를 하나로 통합하지 말 것 |
| `server/routers.ts` | tRPC 인증, 질문 생성, 답변 제출, 피드백, export | 클라이언트가 호출하는 input schema가 계약임 |
| `server/db.ts` | DB 조회·저장 헬퍼 | 직접 SQL을 UI에 넣지 말 것 |
| `server/_core/pdfGenerator.ts` | PDF 리포트·예상 질문 PDF·CJK 폰트 | 폰트 파일 경로와 한글 인코딩을 확인할 것 |
| `server/_core/edgeTTS.ts` | Edge-TTS 실행 어댑터 | 새 환경에 `edge_tts` 런타임 의존성 필요 |
| `drizzle/schema.ts` | DB 테이블·관계 정의 | 스키마와 실제 DB migration을 함께 이관할 것 |
| `client/src/skills/interview-coaching-pipeline/SKILL.md` | 재사용 가능한 개발 프로세스 | GPT WORK의 작업 규칙 참고용 |
| `todo.md` | 기능·버그 이력 | 기존 미완료 항목을 새 기능 완료로 오인하지 말 것 |

## 4. GPT WORK에서 반드시 유지할 기술 계약

첫째, 프론트엔드 서버 통신은 임의의 `fetch` 또는 Axios를 새로 만들지 말고 기존 tRPC 라우터와 `client/src/lib/trpc.ts`를 사용합니다. 서버 절차를 추가할 때에는 인증 범위를 `publicProcedure` 또는 `protectedProcedure`로 명시하고, 사용자 소유 데이터는 반드시 `ctx.user.id`로 검증합니다.

둘째, 새 환경에는 `.env` 파일을 소스 저장소에 넣지 않습니다. `DATABASE_URL`, `JWT_SECRET`, OAuth 관련 값, S3·Forge 관련 값, 결제 키, 분석 키는 새 환경의 Secret/Environment Variable 저장소에서 별도로 주입합니다. 이 문서와 소스 ZIP에는 값이 없어야 하며, 기존 키를 GPT 대화창에 붙여넣지 않습니다.

셋째, 이미지·오디오·대용량 폰트는 일반 소스 파일과 분리해 관리합니다. WebDev 배포에서는 대용량 정적 파일을 `client/public`에 넣지 않고 S3 또는 WebDev 업로드 경로를 사용합니다. PDF를 외부 환경에서 생성한다면 Noto Sans CJK 폰트 파일을 별도 자산으로 설치하거나, 해당 환경이 제공하는 CJK 폰트 경로로 `pdfGenerator.ts` 설정을 바꿔야 합니다.

넷째, 답변 제출 흐름은 ‘답변 작성 → 사용자가 피드백 받기 클릭 → 제출 중 로더 → 피드백 결과 → 다음 질문’ 순서입니다. 자동으로 다음 질문으로 넘어가도록 바꾸면 사용자의 요청과 현재 UX 계약을 위반합니다. 동일 버튼의 중복 클릭은 `submitMutation.isPending`으로 막고, 실패 시 재시도할 수 있도록 입력 상태를 보존합니다.

## 5. 권장 이관 대안

| 대안 | 추천도 | 적합한 목적 | 필요한 작업 |
|---|---:|---|---|
| **Manus 프로젝트 유지 + GPT를 설계/코드 보조로 사용** | 매우 높음 | 기존 DB·S3·OAuth·배포를 보존하면서 GPT로 개발 | 최신 소스 일부와 요구사항을 GPT에 제공하고 실제 적용은 Manus에서 진행 |
| **GitHub private repository + Codex/클라우드 IDE** | 높음 | 전체 소스와 브랜치·PR·테스트를 보존 | 비밀키 제외 후 private repo에 push, DB/S3는 별도 연결 |
| **GPT WORK에 문서와 소스 ZIP 업로드** | 중간 | 기능 분석, 리팩터링 계획, 코드 리뷰, 파일 단위 수정 | `GPT_WORK_SOURCE_9d069d75.zip`와 본 문서 업로드. 큰 폰트는 별도 자산으로 제공 |
| **로컬 또는 Docker 재구성** | 중간 | 서비스 독립 운영·호스팅 변경 | Node 22, Python Edge-TTS, MySQL/TiDB, S3, OAuth를 직접 구성 |
| **새 환경에서 GPT가 앱을 재생성** | 낮음 | 기존 데이터가 필요 없고 UI만 재구축할 때 | 기존 앱과 동일한 데이터·인증·음성·PDF 계약을 다시 구현해야 하므로 비추천 |

가장 안전한 선택은 **Manus를 운영 기준으로 유지하고, GPT WORK는 분석·설계·코드 제안에 사용하는 하이브리드 방식**입니다. GPT WORK가 실제 저장소와 실행 환경을 연결할 수 있다면 private GitHub 연동을 추가할 수 있습니다. 반대로 GPT WORK가 단순 대화형 문서 공간이라면 전체 소스 이관보다 인수인계 문서와 필요한 파일만 올리는 편이 안정적입니다.

## 6. 소스 이관 실행 순서

### A. GPT WORK가 파일 업로드형인 경우

1. `GPT_WORK_HANDOVER.md`, `GPT_WORK_START_PROMPT.md`, `GPT_WORK_SOURCE_9d069d75.zip`를 업로드합니다.
2. `node_modules`, `.git`, `.manus-logs`, `dist`, `.env*`는 업로드하지 않습니다.
3. `GPT_WORK_ASSETS_9d069d75.zip`가 필요하면 PDF 한글 폰트와 작은 로고 자산만 별도로 업로드합니다.
4. GPT WORK에 먼저 “파일 목록을 읽고 변경하지 말고 현재 구조·실행 실패 가능성·이관 누락을 진단하라”고 요청합니다.
5. 진단 결과를 확인한 뒤에만 파일 수정과 의존성 설치를 요청합니다.

### B. GitHub/Codex형인 경우

```bash
git init
git add .gitignore package.json pnpm-lock.yaml tsconfig.json vite.config.ts drizzle client server shared docs
# 아래 명령으로 비밀 파일이 포함되지 않았는지 확인
git diff --cached --name-only
# private 원격 저장소를 만든 뒤 실행
git commit -m "chore: prepare ai interview coach for GPT WORK handover"
git remote add origin <PRIVATE_REPOSITORY_URL>
git push -u origin main
```

`DATABASE_URL`, OAuth, JWT, S3, Forge, 결제 키는 저장소가 아니라 해당 IDE의 Secret 관리 화면에서 등록합니다. 운영 DB를 새 환경에 연결하기 전에 읽기 전용 연결로 먼저 스키마와 migration 상태를 확인합니다.

### C. 새 로컬 서버형인 경우

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

추가로 Edge-TTS 어댑터가 Python의 `edge_tts` 모듈을 호출하므로 새 환경에서 해당 모듈 설치 여부를 확인합니다. 서버 측 PDF는 CJK 폰트 파일을 참조하므로 `server/assets/fonts`가 없으면 PDF 생성 테스트를 먼저 보완해야 합니다.

## 7. 검증 기준

| 검증 항목 | 성공 기준 |
|---|---|
| 타입 | `pnpm check`가 오류 없이 종료 |
| 신규 STT 분석 | `client/src/lib/transcriptAnalysis.test.ts` 통과 |
| 질문 PDF 선택 | `server/interview.export.test.ts`에서 선택 ID만 export input으로 전달 |
| 면접 제출 | ‘피드백 받기’ 클릭 전에는 피드백 mutation이 호출되지 않음 |
| 중복 제출 | 제출 중 버튼 disabled 및 로딩 상태 표시 |
| 오류 재시도 | 피드백 실패 후 작성한 답변이 사라지지 않음 |
| CJK PDF | 한글이 깨지지 않고 폰트가 포함 또는 정상 참조됨 |
| 모바일 | 390px 폭에서 STT 통계 3열, 질문 선택 체크박스, 비교 UI가 화면 밖으로 넘치지 않음 |
| 음성 | 6명 아바타의 음성이 하나로 합쳐지지 않으며 브라우저 폴백이 동작함 |

현재 마지막 검증에서는 타입 검사와 신규 기능 대상 테스트가 통과했습니다. 전체 테스트는 기존 테스트 데이터의 중복 후기 상태와 로컬 환경에 `edge_tts` Python 모듈이 없는 문제로 일부 실패할 수 있으므로, GPT WORK에서 이를 신규 기능의 회귀로 오인하지 않도록 분리해 기록해야 합니다.

## 8. GPT WORK에 첫 번째로 보낼 메시지

다음 파일을 업로드한 직후 `GPT_WORK_START_PROMPT.md`의 프롬프트를 그대로 붙여넣습니다.

> 이 프로젝트는 React 19 + TypeScript + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM 기반의 `ai_interview_coach` AI 면접 코치입니다. 업로드한 인수인계 문서와 소스 ZIP을 먼저 읽고, 파일을 수정하지 않은 상태에서 현재 아키텍처, 실행에 필요한 환경변수 목록, 이관 누락 가능성, 테스트 실패 가능성을 표로 진단해 주세요. 비밀키를 요구하거나 생성하지 말고, 먼저 변경 계획과 검증 순서를 제시하세요. 이후 기능을 수정할 때는 기존 tRPC 계약, 사용자 소유권 검증, 7단계 위자드, ‘피드백 받기’ 수동 클릭 흐름, 면접관별 TTS voice ID, CJK PDF 폰트 경로를 보존해야 합니다.
