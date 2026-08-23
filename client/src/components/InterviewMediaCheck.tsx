import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  acquireMediaStreamWithRetry,
  createSingleFlight,
  getMediaErrorName,
  stopMediaStream,
  waitForMediaRelease,
} from "@/lib/mediaDeviceLifecycle";

type MediaCheckState = "idle" | "releasing" | "requesting" | "ready" | "error";

interface InterviewMediaCheckProps {
  audio?: boolean;
  video?: boolean;
  autoStart?: boolean;
  compact?: boolean;
  onReadyChange?: (ready: boolean) => void;
}

function getMediaErrorMessage(error: unknown) {
  const name = getMediaErrorName(error);
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "브라우저 주소창의 카메라·마이크 권한을 허용해주세요.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "사용할 수 있는 카메라 또는 마이크를 찾지 못했습니다.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "다른 앱이나 브라우저 탭이 장치를 사용 중입니다. 해당 앱을 닫고 다시 시도해주세요.";
  }
  if (name === "OverconstrainedError") {
    return "선택한 장치 설정을 사용할 수 없습니다. 기본 카메라·마이크로 다시 시도해주세요.";
  }
  if (name === "AbortError") {
    return "장치 연결이 일시적으로 중단되었습니다. 잠시 후 다시 점검해주세요.";
  }
  return "장치를 시작하지 못했습니다. 연결 상태와 브라우저 권한을 확인해주세요.";
}

export default function InterviewMediaCheck({
  audio = true,
  video = true,
  autoStart = false,
  compact = false,
  onReadyChange,
}: InterviewMediaCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestGateRef = useRef(createSingleFlight<void>());
  const mountedRef = useRef(true);
  const [state, setState] = useState<MediaCheckState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [deviceNames, setDeviceNames] = useState({ camera: "카메라", microphone: "마이크" });

  const releaseActiveMedia = useCallback(async () => {
    const hadActiveMedia = Boolean(streamRef.current || audioContextRef.current);

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;

    const stream = streamRef.current;
    streamRef.current = null;
    stopMediaStream(stream);

    if (videoRef.current) videoRef.current.srcObject = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      try {
        await audioContext.close();
      } catch {
        // Device cleanup remains best-effort across mobile browser implementations.
      }
    }

    if (mountedRef.current) setMicLevel(0);
    return hadActiveMedia;
  }, []);

  const dispose = useCallback(() => {
    requestIdRef.current += 1;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    onReadyChange?.(false);
    void releaseActiveMedia();
  }, [onReadyChange, releaseActiveMedia]);

  const stop = useCallback(() => {
    const stopRequestId = ++requestIdRef.current;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    onReadyChange?.(false);
    if (mountedRef.current) setState("releasing");

    void releaseActiveMedia().finally(() => {
      if (mountedRef.current && stopRequestId === requestIdRef.current) {
        setErrorMessage("");
        setState("idle");
      }
    });
  }, [onReadyChange, releaseActiveMedia]);

  const start = useCallback(() => requestGateRef.current.run(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      if (mountedRef.current) {
        setErrorMessage("이 브라우저는 카메라·마이크 점검을 지원하지 않습니다. 최신 브라우저를 사용해주세요.");
        setState("error");
      }
      onReadyChange?.(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    onReadyChange?.(false);

    if (mountedRef.current) {
      setState("releasing");
      setErrorMessage("");
    }

    const hadActiveMedia = await releaseActiveMedia();
    if (controller.signal.aborted || requestId !== requestIdRef.current) return;

    // Some mobile camera services need one paint after track.stop() before reacquisition.
    if (hadActiveMedia) await waitForMediaRelease(150, controller.signal);
    if (controller.signal.aborted || requestId !== requestIdRef.current) return;

    if (mountedRef.current) setState("requesting");

    try {
      const stream = await acquireMediaStreamWithRetry({
        getUserMedia: constraints => navigator.mediaDevices.getUserMedia(constraints),
        constraints: {
          audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
          video: video ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        },
        signal: controller.signal,
        maxBusyRetries: 1,
        retryDelayMs: 1_000,
      });

      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        stopMediaStream(stream);
        return;
      }
      streamRef.current = stream;

      if (videoRef.current && video) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        stopMediaStream(stream);
        return;
      }

      const cameraTrack = stream.getVideoTracks()[0];
      const microphoneTrack = stream.getAudioTracks()[0];
      if (mountedRef.current) {
        setDeviceNames({
          camera: cameraTrack?.label || "사용 중인 카메라",
          microphone: microphoneTrack?.label || "사용 중인 마이크",
        });
      }

      const handleUnexpectedEnd = () => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        requestIdRef.current += 1;
        controller.abort();
        requestAbortRef.current = null;
        onReadyChange?.(false);
        if (mountedRef.current) {
          setErrorMessage("카메라 또는 마이크 연결이 해제되었습니다. 장치를 확인한 뒤 다시 점검해주세요.");
          setState("error");
        }
        void releaseActiveMedia();
      };
      stream.getTracks().forEach(track => track.addEventListener("ended", handleUnexpectedEnd, { once: true }));

      if (audio && microphoneTrack) {
        const context = new window.AudioContext();
        audioContextRef.current = context;
        if (context.state === "suspended") {
          try {
            await context.resume();
          } catch {
            // The stream is still usable even if a browser delays the level meter.
          }
        }
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaStreamSource(new MediaStream([microphoneTrack])).connect(analyser);
        const values = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (controller.signal.aborted || requestId !== requestIdRef.current) return;
          analyser.getByteFrequencyData(values);
          const average = values.reduce((sum, value) => sum + value, 0) / values.length;
          if (mountedRef.current) setMicLevel(Math.min(100, Math.round(average * 2.2)));
          frameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }

      if (mountedRef.current) setState("ready");
      onReadyChange?.(true);
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      await releaseActiveMedia();
      if (mountedRef.current) {
        setErrorMessage(getMediaErrorMessage(error));
        setState("error");
      }
      onReadyChange?.(false);
    } finally {
      if (requestAbortRef.current === controller) requestAbortRef.current = null;
    }
  }), [audio, onReadyChange, releaseActiveMedia, video]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoStart) void start();
    return () => {
      mountedRef.current = false;
      dispose();
    };
  }, [autoStart, dispose, start]);

  const isBusy = state === "releasing" || state === "requesting";
  const busyLabel = state === "releasing" ? "장치 정리 중..." : "권한 확인 중...";

  return (
    <section className={`overflow-hidden rounded-xl border bg-card ${compact ? "p-3" : "p-4"}`} aria-label="카메라와 마이크 사전 점검" aria-busy={isBusy}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold"><Camera className="h-4 w-4 text-primary" /> 장치 사전 점검</h3>
          {!compact && <p className="mt-1 text-xs leading-5 text-muted-foreground">영상은 이 화면의 셀프뷰에만 사용합니다. 표정·감정·성격이나 합격 가능성을 추론하지 않습니다.</p>}
        </div>
        {state === "ready" && <span className="flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> 준비됨</span>}
      </div>

      {video && (
        <div className={`relative mt-3 overflow-hidden rounded-lg bg-slate-950 ${compact ? "aspect-video max-h-48" : "aspect-video"}`}>
          <video ref={videoRef} muted playsInline className="h-full w-full scale-x-[-1] object-cover" aria-label="카메라 셀프뷰" />
          {state !== "ready" && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300"><Camera className="mr-2 h-5 w-5" /> {isBusy ? busyLabel : "점검을 시작하면 셀프뷰가 표시됩니다"}</div>}
        </div>
      )}

      {audio && state === "ready" && (
        <div className="mt-3" aria-label={`마이크 입력 수준 ${micLevel}%`}>
          <div className="mb-1 flex items-center justify-between text-xs"><span className="flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> 마이크 입력</span><span>{micLevel > 8 ? "음성 감지됨" : "말씀해보세요"}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${micLevel}%` }} /></div>
        </div>
      )}

      {state === "ready" && !compact && (
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          {video && <div className="min-w-0 rounded-md bg-muted/50 p-2"><dt className="text-muted-foreground">카메라</dt><dd className="truncate font-medium">{deviceNames.camera}</dd></div>}
          {audio && <div className="min-w-0 rounded-md bg-muted/50 p-2"><dt className="text-muted-foreground">마이크</dt><dd className="truncate font-medium">{deviceNames.microphone}</dd></div>}
        </dl>
      )}

      {state === "error" && <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{errorMessage}</p></div>}

      {compact && state === "error" && (
        <Button type="button" variant="outline" className="mt-3 min-h-11 w-full gap-2" onClick={() => void start()}>
          <RotateCcw className="h-4 w-4" /> 다시 점검
        </Button>
      )}

      {!compact && (
        <div className="mt-3 flex gap-2">
          {state !== "ready" ? (
            <Button type="button" className="min-h-11 flex-1 gap-2" onClick={() => void start()} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {isBusy ? busyLabel : state === "error" ? "다시 점검" : "카메라·마이크 점검"}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" className="min-h-11 flex-1 gap-2" onClick={() => void start()}><RotateCcw className="h-4 w-4" /> 다시 점검</Button>
              <Button type="button" variant="ghost" className="min-h-11 gap-2" onClick={stop}><Square className="h-4 w-4" /> 끄기</Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
