# GPT WORK 이관 선택지 및 권장 절차

## 결론

현재 앱은 코드만 있는 정적 웹페이지가 아니라 **OAuth, MySQL/TiDB, S3, 음성 합성, STT, PDF 폰트, 결제 설정**이 결합된 풀스택 서비스입니다. 따라서 “GPT에 코드 파일을 올리면 운영 서비스가 그대로 복제된다”라고 생각하면 안 됩니다. 가장 안전한 방법은 **Manus 배포와 운영 DB/S3를 기준 시스템으로 유지하면서 GPT WORK를 코드 분석·수정 보조로 사용하는 방식**입니다.

## 선택지 비교

| 방식 | 실제 이전 범위 | 데이터 연속성 | 개발 편의성 | 주요 위험 | 권장도 |
|---|---|---:|---:|---|---:|
| Manus 유지 + GPT 보조 | 소스 변경 제안만 GPT에서 진행 | 유지 | 높음 | 작업 내용을 실제 저장소에 반영해야 함 | **1순위** |
| Private GitHub + Codex/IDE | 소스, 브랜치, 테스트, PR | DB/S3 별도 연결 | 매우 높음 | Secret·DB 연결을 새로 설정해야 함 | **2순위** |
| GPT WORK에 ZIP 업로드 | 소스와 문서 | 없음 | 중간 | 파일 업로드 크기, 실행 환경, DB 부재 | **3순위** |
| 로컬/Docker 독립 운영 | 소스와 실행 환경 | 별도 백업 필요 | 중간 | OAuth·S3·TTS·폰트·DB 구성 복잡 | 조건부 |
| GPT가 새로 재생성 | UI·일부 로직 | 없음 | 낮음 | 기존 기능·데이터·보안 계약 유실 | 비추천 |

## 대안 1 — Manus를 운영 기준으로 유지

현재 배포 도메인은 `https://ai-interview.manus.space`와 `https://aiintercoach-8oq9ut3p.manus.space`입니다. GPT WORK에는 인수인계 문서, 특정 파일, 오류 로그, 요구사항만 전달하고, 실제 수정은 Manus 프로젝트에 반영합니다. 이 방법은 운영 DB, OAuth 로그인, S3 파일, 체크포인트·롤백, 자동 배포를 유지할 수 있는 유일한 무중단 접근입니다.

이 방식은 “전체 프로젝트를 GPT가 한 번에 실행”해야 하는 경우에는 제한이 있지만, 기능 설계, 버그 원인 분석, 파일 단위 수정안, 테스트 코드 작성에는 가장 안정적입니다. GPT에는 민감한 운영 값 대신 타입·계약·오류 메시지·관련 파일만 전달하세요.

## 대안 2 — Private GitHub와 Codex/클라우드 IDE

코드 전체를 장기적으로 다른 개발 환경에서 관리하려면 private GitHub 저장소가 가장 적합합니다. `node_modules`, `.git`, `dist`, `.manus-logs`, `.env*`를 제외한 소스를 커밋하고, `DATABASE_URL`, `JWT_SECRET`, Manus OAuth, S3, Forge, 결제 키는 저장소가 아닌 IDE의 Secret 저장소에 주입합니다.

이 경우에도 DB와 S3를 별도로 연결해야 합니다. 운영 DB를 곧바로 연결하기보다 개발 DB 또는 읽기 전용 연결로 먼저 마이그레이션과 조회를 검증하세요. 데이터가 필요 없다면 스키마만 이관하고 새 DB를 사용하며, 기존 사용자 면접 이력과 녹음 파일을 이어 보려면 DB·S3 백업/복구 절차가 추가로 필요합니다.

## 대안 3 — GPT WORK 파일 업로드

GPT WORK가 파일 업로드와 코드 분석을 지원한다면 다음 세 가지를 업로드합니다.

1. `GPT_WORK_HANDOVER.md`
2. `GPT_WORK_START_PROMPT.md`
3. `GPT_WORK_SOURCE_9d069d75.zip`

한글 PDF를 새 환경에서 실제 생성할 계획이라면 `GPT_WORK_ASSETS_9d069d75.zip`의 CJK 폰트도 추가합니다. 다만 GPT WORK가 서버를 실행하거나 DB를 연결하지 못하는 경우, 이 방식은 “분석·리팩터링”에 적합하고 “운영 서비스 이관”에는 적합하지 않습니다.

## 대안 4 — 로컬/Docker 독립 구성

독립 운영이 필요하면 Node 22, pnpm, MySQL/TiDB, S3 호환 저장소, Manus OAuth 또는 대체 OAuth, Python `edge_tts`, CJK 폰트를 구성합니다. 서버 포트를 코드에 하드코딩하지 말고 환경변수로 주입합니다. 이 방식은 자유도가 높지만 현재 플랫폼이 제공하는 인증·스토리지·LLM 프록시를 직접 대체하거나 연결해야 하므로 작업량이 가장 큽니다.

## 이전하지 말아야 하는 것

| 항목 | 처리 방법 |
|---|---|
| `.env`, API key, JWT secret, 결제 secret | 절대 ZIP·GPT 대화·Git에 넣지 말고 새 환경 Secret에 직접 등록 |
| 운영 DB 비밀번호와 사용자 원문 답변 | GPT에 업로드하지 말고 별도 백업/복구 절차 사용 |
| `node_modules`, `dist`, `.git` | 제외 후 새 환경에서 `pnpm install` |
| `.manus-logs` | 오류가 필요할 때 해당 로그 일부만 정제해서 전달 |
| 대용량 이미지·오디오 | S3 또는 별도 자산 저장소로 분리 |
| CJK 폰트 | PDF가 필요할 때만 별도 자산으로 이관 |

## 이관 후 첫 실행 순서

```bash
pnpm install
pnpm check
pnpm vitest run client/src/lib/transcriptAnalysis.test.ts server/interview.export.test.ts
pnpm dev
```

그 다음 로그인, 면접 위자드, 아바타 음성 미리듣기, 답변 입력, ‘피드백 받기’, 결과 STT 통계, PDF 카테고리·질문 선택을 순서대로 확인합니다. 전체 테스트가 실패할 때는 신규 코드 오류, 기존 DB 테스트 데이터 충돌, 외부 Edge-TTS 런타임 누락을 서로 다른 문제로 구분해야 합니다.
