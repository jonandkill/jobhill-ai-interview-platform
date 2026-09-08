# RunPod GPU 파일럿 배포

Render는 JobHill 애플리케이션과 Secret 연결 지점으로 유지한다. Qwen3-TTS 추론은 GPU가 필요한 별도 서비스이므로 RunPod Pod에서 실행한다. 이 문서는 초기 음색 복제 검증용이며 결제·외부 공개를 승인하는 문서가 아니다.

## 권장 파일럿 구성

- Cloud: Secure Cloud
- GPU: 24GB VRAM급 1개부터 검증
- HTTP 포트: `8000`
- 영구 저장소 마운트: `/workspace`
- 컨테이너 작업 경로: `services/qwen3-tts`
- 모델: `Qwen/Qwen3-TTS-12Hz-0.6B-Base`
- 음성: `jobnkill-professor-01`

GPU 모델별 실제 속도와 메모리 사용량은 배포 후 측정해 확정한다. 파일럿에서는 시간 단위 과금을 확인하고, 사용하지 않을 때 Pod를 중지한다. 영구 저장소는 Pod 중지 뒤에도 별도 과금될 수 있다.

## 영구 저장소 구조

```text
/workspace/models/Qwen3-TTS-12Hz-0.6B-Base/
/workspace/voices/jobnkill-professor-01/reference.wav
/workspace/voices/jobnkill-professor-01/reference.txt
```

레퍼런스 음성과 전사문은 공개 저장소나 컨테이너 이미지에 넣지 않는다. RunPod의 비공개 영구 저장소에만 올리고, Pod에서는 다음 경로를 환경변수로 연결한다.

```text
QWEN_MODEL_PATH=/workspace/models/Qwen3-TTS-12Hz-0.6B-Base
VOICE_REFERENCE_AUDIO_PATH=/workspace/voices/jobnkill-professor-01/reference.wav
VOICE_REFERENCE_TEXT_PATH=/workspace/voices/jobnkill-professor-01/reference.txt
QWEN_DEVICE=cuda:0
QWEN_ATTENTION=sdpa
TTS_MAX_CONCURRENCY=1
```

`TTS_SERVICE_TOKEN`은 32자 이상의 무작위 값으로 RunPod Secrets에 만들고, Pod 템플릿에서는 Secret 참조 문법으로 연결한다. 토큰 값은 채팅·GitHub·스크린숏·로그에 남기지 않는다.

## 템플릿 설정

1. GitHub 저장소를 연결해 `services/qwen3-tts/Dockerfile`을 빌드한다.
2. 컨테이너 포트 `8000`을 HTTP 포트로 노출한다.
3. 영구 저장소를 `/workspace`에 연결한다.
4. 일반 환경변수와 Secret 참조를 구분해 등록한다.
5. Pod를 시작하고 다음 주소에서 준비 상태를 확인한다.

```text
https://POD_ID-8000.proxy.runpod.net/healthz
```

RunPod HTTP 프록시는 외부에서 접근 가능하므로 Bearer 인증을 제거하면 안 된다. 프록시에는 요청 시간이 제한되므로 긴 학습 작업을 이 API로 실행하지 않는다.

## JobHill 연결

GPU 서비스의 준비 상태가 `ready`가 된 뒤 JobHill 배포 서비스의 Secret 저장소에 등록한다.

```text
QWEN3_TTS_URL=https://POD_ID-8000.proxy.runpod.net
QWEN3_TTS_TOKEN=RunPod와-동일한-비밀값
QWEN3_TTS_ALLOWED_HOST=POD_ID-8000.proxy.runpod.net
```

저장 후 JobHill 서버를 다시 배포하고, 먼저 관리자 TTS 점검에서 한 문장만 합성한다. 그다음 Android Chrome, iPhone Safari 순서로 최초 재생·중단·다시 듣기를 확인한다.

## 첫 합성 문장

```text
지원한 직무에서 가장 중요하다고 생각하는 역량과 이를 발휘한 경험을 구체적으로 말씀해 주십시오.
```

첫 결과는 음색 유사도, 말하기 속도, 질문 억양, 문장 끝 명료도, 기계음, 누락·반복 여부로 평가한다. 결과가 충분하지 않으면 배포 승인을 내리지 않고 레퍼런스 구간 또는 녹음 데이터부터 보완한다.
