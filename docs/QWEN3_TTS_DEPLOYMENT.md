# Qwen3-TTS JOB&KILL 한국어 면접관 음성

JobHill의 전용 면접관 음성은 `Qwen/Qwen3-TTS-12Hz-0.6B-Base`와 비공개 레퍼런스 `jobnkill-professor-01`을 사용한다. Qwen3-TTS 공식 코드는 Apache-2.0이고, Base 모델은 한국어와 레퍼런스 오디오·전사문을 이용한 음성 복제를 지원한다.

기본 Qwen 가중치 자체가 JOB&KILL의 독점 자산이 되는 것은 아니다. JOB&KILL이 권리를 관리하는 범위는 직접 제작한 녹음·전사·평가자료, 전용 처리 코드, 추가 학습 체크포인트와 운영 노하우이다. 타인의 목소리를 추가할 때는 AI 학습·합성·상업 이용을 포함한 별도 동의를 기록해야 한다.

공식 자료:

- https://github.com/QwenLM/Qwen3-TTS
- https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base
- https://arxiv.org/html/2601.15621v1

## 현재 프로필

- 음성 ID: `jobnkill-professor-01`
- 레퍼런스 형식: 24 kHz, 모노, PCM WAV, 3–30초
- 레퍼런스 전사: UTF-8 일반 텍스트
- 기본 말하기 속도: `1.02`
- 상태: 초기 음색 복제 시험용이며 파인튜닝 완료 모델이 아님

## 비공개 파일 배치

다음 두 파일은 공개 GitHub, Docker 이미지, 정적 웹 폴더에 넣지 않는다.

```text
/voices/jobnkill-professor-01/reference.wav
/voices/jobnkill-professor-01/reference.txt
```

`reference.wav`는 준비된 `jobnkill-professor-01_reference_candidate.wav`를 사용한다. `reference.txt`에는 해당 구간에서 실제로 발화한 문장만 넣는다.

```text
안녕하십니까. 오늘 면접을 진행하겠습니다. 먼저 간단한 자기소개와 함께 지원한 직무를 선택한 이유를 말씀해 주십시오.
```

GPU 서비스의 영구 볼륨에 위 경로를 만들고 추론 컨테이너에는 읽기 전용으로 연결한다. 서비스는 시작할 때 레퍼런스 파일의 크기·길이·채널·샘플레이트를 검증하고 재사용 가능한 음성 복제 프롬프트를 메모리에 한 번만 만든다.

## 모델 준비

GPU가 있는 격리된 준비 환경에서 실행한다.

```bash
cd services/qwen3-tts
python download_model.py
```

고정 모델:

```text
Qwen/Qwen3-TTS-12Hz-0.6B-Base
5d83992436eae1d760afd27aff78a71d676296fc
```

다운로드한 모델 디렉터리는 `/models/Qwen3-TTS-12Hz-0.6B-Base`에 읽기 전용으로 연결한다.

## Secret

32자 이상의 무작위 토큰 하나를 GPU 서비스 Secret 저장소에 `TTS_SERVICE_TOKEN`으로 등록한다. 값을 채팅, Git, 이미지, 로그에 넣지 않는다.

JobHill 앱의 배포 Secret 저장소에는 다음만 등록한다.

```text
QWEN3_TTS_URL=https://GPU-서비스의-비공개-또는-보호된-주소
QWEN3_TTS_TOKEN=동일한-서비스-토큰
QWEN3_TTS_ALLOWED_HOST=GPU-서비스의-정확한-호스트명
```

공용 인터넷을 통과할 때는 HTTPS가 필수이다. 앱 어댑터는 서버측 요청 위조 방지를 위해 사설 호스트 또는 `QWEN3_TTS_ALLOWED_HOST`와 정확히 일치하는 단일 외부 호스트만 허용한다. 이 값에는 `https://`와 경로를 넣지 않고 호스트명만 넣는다.

## 고정 API 계약

앱 서버는 `POST /v1/tts`에 다음 값만 전송한다.

- `model=Qwen/Qwen3-TTS-12Hz-0.6B-Base`
- `voice=jobnkill-professor-01`
- `lang=ko`
- `speed=0.90–1.08`
- `response_format=wav`

GPU 서비스는 Bearer 토큰을 확인하고 `audio/wav`만 반환한다. 요청으로 레퍼런스 음성, 전사, 모델, 임의 음성 ID 또는 사용자 지시를 바꿀 수 없다. 질문과 생성 음성은 메모리에서만 처리하고 파일·DB·CDN·애플리케이션 캐시에 저장하지 않는다.

## 배포 승인 기준

- 한국인 평가자 5명 이상의 자연스러움·면접 질문 억양 평균 4.0/5 이상
- 숫자, 회사명, KPI/OEE, 생산·품질 용어 발음 오류율 2% 이하
- 100회 합성에서 반복·누락 0건
- 250자 질문 warm p95 2초 이하, 오류율 1% 미만
- 20개 동시 요청에서 무한 대기와 메모리 급증 없음
- iPhone Safari 및 Android Chrome의 최초 재생·중단·다시 듣기 성공
- 컨테이너, 로그, DB, 스토리지에 질문 또는 생성 음성 잔존 0건

초기 레퍼런스 복제가 위 기준을 충족하지 못하면 녹음 데이터를 늘린 뒤 1.7B Base 단일 화자 파인튜닝을 별도 단계로 진행한다. 현재 공개 파인튜닝 지원 범위와 실행 스크립트는 실제 학습 시작 직전에 다시 검증한다.
