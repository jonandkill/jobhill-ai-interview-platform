# Qwen3-TTS 한국어 면접관 음성

JobHill의 품질 우선 TTS는 `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`와 한국어 프리셋 `Sohee`를 사용한다. 모델과 공식 코드는 Apache-2.0이다. 오디오와 질문은 메모리에서만 처리하며 파일, DB, S3, CDN 또는 애플리케이션 캐시에 저장하지 않는다. 실제 사람의 음성 복제와 사용자 지정 음성 업로드는 지원하지 않는다.

## 선택 근거

- 한국어 고유 프리셋 `Sohee`와 한국어 명시 지원
- 자연어 지시 기반 속도, 억양 및 운율 제어
- 공식 보고서의 12Hz 1.7B CustomVoice 한국어 WER 1.741
- 코드와 모델 가중치 모두 Apache-2.0

WER는 자연스러움 점수가 아니다. 운영 승인 전 한국어 면접 질문 블라인드 청취 평가를 별도로 통과해야 한다.

공식 자료:

- https://github.com/QwenLM/Qwen3-TTS
- https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice
- https://arxiv.org/html/2601.15621v1

## 구성

1. GPU가 있는 격리된 빌드 호스트에서 `services/qwen3-tts/download_model.py`를 실행한다.
2. 내려받은 모델 디렉터리는 추론 컨테이너의 `/models`에 읽기 전용으로 마운트한다.
3. 32자 이상의 무작위 서비스 토큰을 배포 Secret 저장소에만 등록한다. 채팅, Git, 이미지, 로그에 값을 넣지 않는다.
4. `services/qwen3-tts/docker-compose.example.yml`을 참고해 내부 네트워크에 사이드카를 기동한다.
5. 애플리케이션 Secret에 `QWEN3_TTS_URL`과 `QWEN3_TTS_TOKEN`을 등록한다.
6. `/healthz`가 `ready`인 뒤 30개 이상의 한국어 골든 문장으로 실제 합성을 검증한다.

운영 환경에서 HTTP 내부 통신을 사용할 때만 `QWEN3_TTS_ALLOW_INSECURE_HTTP=true`를 명시하고 네트워크 정책으로 접근 주체를 앱 서버로 제한한다. 공용 인터넷을 통과하면 HTTPS 또는 mTLS를 사용한다.

## 고정 API 계약

앱 서버는 `POST /v1/tts`에 `model`, `text`, `voice=Sohee`, `lang=ko`, `speed`, `response_format=wav`만 전송한다. 사이드카는 `audio/wav`를 반환한다. 서비스 토큰은 Bearer 헤더로만 전달한다. 리디렉션, 임의 모델, 임의 음성, 음성 복제, SSML 및 사용자 지시는 허용하지 않는다.

기존 대형 면접 화면의 안전한 호환을 위해 tRPC 응답의 `provider` 식별자는 당분간 `supertonic2`를 유지한다. 실제 주엔진과 모델은 서버 어댑터의 `model=Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`로 검증한다. 화면 모듈을 분리한 뒤 별도 변경으로 공급자 라벨을 정확히 교체한다.

## 배포 승인 기준

- 한국인 평가자 5명 이상의 자연스러움·질문 억양 평균 4.0/5 이상
- 숫자, 회사명, KPI/OEE, 생산·품질 용어 발음 오류율 2% 이하
- 100회 합성에서 반복·누락 0건
- 250자 질문 warm p95 2초 이하, 오류율 1% 미만
- 20개 동시 요청에서 무한 대기와 메모리 급증 없음
- iPhone Safari 및 Android Chrome의 최초 재생·중단·다시 듣기 성공
- 컨테이너, 로그, DB, 스토리지에 질문 또는 생성 음성 잔존 0건

Qwen이 실패하면 별도 내부 `SUPERTONIC3_TTS_URL`이 설정된 경우에만 Supertonic 3를 시도한다. 두 자체 호스팅 엔진이 모두 실패하면 기존 클라이언트의 브라우저 로컬 음성 또는 텍스트 진행 경로가 사용된다. 서버 측 외부 Edge TTS 경로는 제거한다.
