import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

type MediaCheckState = "idle" | "requesting" | "ready" | "error";

interface InterviewMediaCheckProps {
  audio?: boolean;
  video?: boolean;
  autoStart?: boolean;
  compact?: boolean;
  onReadyChange?: (ready: boolean) => void;
}

function getMediaErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "브라우저 주소창의 카메라·마이크 권한을 허용해주세요.";
    if (error.name === "NotFoundError") return "사용할 수 있는 카메라 또는 마이크를 찾지 못했습니다.";
    if (error.name === "NotReadableError") return "다른 앱이 장치를 사용 중입니다. 해당 앱을 닫고 다시 시도해주세요.";
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
  const [state, setState] = useState<MediaCheckState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [deviceNames, setDeviceNames] = useState({ camera: "카메라", microphone: "마이크" });

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setMicLevel(0);
    setState("idle");
    onReadyChange?.(false);
  }, [onReadyChange]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("이 브라우저는 카메라·마이크 점검을 지원하지 않습니다. 최신 브라우저를 사용해주세요.");
      setState("error");
      onReadyChange?.(false);
      return;
    }

    stop();
    const requestId = ++requestIdRef.current;
    setState("requesting");
    setErrorMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
        video: video ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;

      if (videoRef.current && video) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const cameraTrack = stream.getVideoTracks()[0];
      const microphoneTrack = stream.getAudioTracks()[0];
      setDeviceNames({
        camera: cameraTrack?.label || "사용 중인 카메라",
        microphone: microphoneTrack?.label || "사용 중인 마이크",
      });

      if (audio && microphoneTrack) {
        const AudioContextClass = window.AudioContext;
        const context = new AudioContextClass();
        audioContextRef.current = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaStreamSource(new MediaStream([microphoneTrack])).connect(analyser);
        const values = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(values);
          const average = values.reduce((sum, value) => sum + value, 0) / values.length;
          setMicLevel(Math.min(100, Math.round(average * 2.2)));
          frameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }

      setState("ready");
      onReadyChange?.(true);
    } catch (error) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setErrorMessage(getMediaErrorMessage(error));
      setState("error");
      onReadyChange?.(false);
    }
  }, [audio, onReadyChange, stop, video]);

  useEffect(() => {
    if (autoStart) void start();
    return stop;
  }, [autoStart, start, stop]);

  return (
    <section className={`overflow-hidden rounded-xl border bg-card ${compact ? "p-3" : "p-4"}`} aria-label="카메라와 마이크 사전 점검">
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
          {state !== "ready" && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300"><Camera className="mr-2 h-5 w-5" /> 점검을 시작하면 셀프뷰가 표시됩니다</div>}
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

      {state === "error" && <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{errorMessage}</p></div>}

      {compact && state === "error" && (
        <Button type="button" variant="outline" className="mt-3 min-h-11 w-full gap-2" onClick={() => void start()}>
          <RotateCcw className="h-4 w-4" /> 다시 점검
        </Button>
      )}

      {!compact && (
        <div className="mt-3 flex gap-2">
          {state !== "ready" ? (
            <Button type="button" className="min-h-11 flex-1 gap-2" onClick={() => void start()} disabled={state === "requesting"}>
              {state === "requesting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {state === "requesting" ? "권한 확인 중..." : state === "error" ? "다시 점검" : "카메라·마이크 점검"}
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
