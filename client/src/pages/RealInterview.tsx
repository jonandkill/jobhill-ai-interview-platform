import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { 
  ArrowRight, 
  Brain, 
  CheckCircle2, 
  Loader2, 
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Timer,
  Play,
  Pause,
  StopCircle,
  AlertCircle,
  Zap,
  Target,
  Shield,
  Flame,
  Clock,
  FileText,
  Building2,
  User,
  ChevronRight,
  ChevronLeft,
  Settings,
  RotateCcw
} from "lucide-react";
import { 
  InterviewerAvatarType, 
  INTERVIEWER_AVATARS, 
  AvatarSelector, 
  InterviewingAvatar,
  EmotionType,
  getEmotionByScore
} from "@/components/InterviewerAvatar";
import AnalyzingLoader from "@/components/AnalyzingLoader";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// 세션 상태 타입
type RealInterviewStatus = 
  | "setup"           // 설정 화면
  | "ready"           // 면접 준비 완료
  | "starting"        // 면접 시작 중
  | "question"        // 질문 재생 중
  | "listening"       // 답변 녹음 중 (자동)
  | "processing"      // 답변 처리 중
  | "completed";      // 면접 완료

// 면접관 스타일 타입
type InterviewerStyle = "friendly" | "neutral" | "pressure";

// 질문-답변 아이템
interface RealQAItem {
  id: number;
  question: string;
  questionType: string;
  userAnswer?: string | null;
  audioUrl?: string | null;
  score?: number | null;
  feedback?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  suggestedAnswer?: string | null;
  answerDuration?: number; // 답변 시간 (초)
}

// 면접 설정
interface InterviewSettings {
  targetCompany: string;
  targetPosition: string;
  resumeId?: number;
  coverLetterId?: number;
  interviewerStyle: InterviewerStyle;
  questionCount: number;
  prepTime: number; // 질문 후 생각할 시간 (초)
  timePerQuestion: number; // 답변 제한 시간 (초)
  silenceThreshold: number; // 침묵 감지 시간 (초)
}

type SetupStep = 1 | 2 | 3 | 4 | 5;
type InterviewStageId = "basic" | "personality" | "situational" | "strategy" | "deep";

const REAL_INTERVIEW_STAGES: Array<{
  id: InterviewStageId;
  step: string;
  title: string;
  description: string;
  detail: string;
}> = [
  {
    id: "basic",
    step: "1단계",
    title: "기본 면접",
    description: "자기소개·지원동기·장단점",
    detail: "질문을 읽고 30~60초 생각한 뒤 답변합니다. 음성 톤, 발음, 시선 처리 안내를 함께 제공합니다.",
  },
  {
    id: "personality",
    step: "2단계",
    title: "성향 파악",
    description: "가치관·성격·직무 적합도",
    detail: "짧은 척도형 문항에 빠르게 답하며 일관성과 솔직함을 중심으로 기록합니다.",
  },
  {
    id: "situational",
    step: "3단계",
    title: "상황 대처",
    description: "실제 대화형 롤플레잉",
    detail: "제3자 설명이 아니라 상대방에게 직접 말하는 것처럼 답변하는 연습입니다.",
  },
  {
    id: "strategy",
    step: "4단계",
    title: "전략 게임",
    description: "기억·추론·계획·유연성",
    detail: "마법약, N-Back, 도형 회전, 길 만들기, 고양이 술래잡기 게임을 단계적으로 제공합니다.",
  },
  {
    id: "deep",
    step: "5단계",
    title: "심층 면접",
    description: "답변 기반 꼬리 질문",
    detail: "앞선 답변과 성향 결과를 바탕으로 자연스러운 후속 질문을 생성합니다.",
  },
];

// 면접관 스타일 설명
const INTERVIEWER_STYLES: Record<InterviewerStyle, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  friendly: {
    label: "온화형",
    description: "친절하고 격려하는 분위기로 진행합니다",
    icon: <User className="w-5 h-5" />,
    color: "text-green-500"
  },
  neutral: {
    label: "중립형", 
    description: "객관적이고 전문적인 분위기로 진행합니다",
    icon: <Target className="w-5 h-5" />,
    color: "text-blue-500"
  },
  pressure: {
    label: "압박형",
    description: "날카로운 질문과 꼬리질문으로 진행합니다",
    icon: <Flame className="w-5 h-5" />,
    color: "text-red-500"
  }
};

export default function RealInterview() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // 상태 관리
  const [status, setStatus] = useState<RealInterviewStatus>("setup");
  const [setupStep, setSetupStep] = useState<SetupStep>(1);
  const [savedSetupSteps, setSavedSetupSteps] = useState<SetupStep[]>([]);
  const [selectedStages, setSelectedStages] = useState<InterviewStageId[]>([
    "basic",
    "personality",
    "situational",
    "strategy",
    "deep",
  ]);
  const [settings, setSettings] = useState<InterviewSettings>({
    targetCompany: "",
    targetPosition: "",
    interviewerStyle: "neutral",
    questionCount: 5,
    prepTime: 30,
    timePerQuestion: 120,
    silenceThreshold: 3
  });
  
  // 면접 진행 상태
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [qas, setQas] = useState<RealQAItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentQuestionType, setCurrentQuestionType] = useState<string>("");
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [nextQuestionReady, setNextQuestionReady] = useState(false);
  
  // 타이머 상태
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 녹음 상태
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  
  // 침묵 감지 상태
  const [silenceTimer, setSilenceTimer] = useState(0);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(Date.now());
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const silenceCheckRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // TTS 상태
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsAudio, setTtsAudio] = useState<HTMLAudioElement | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  
  // 아바타 상태
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("professional_female");
  const [avatarEmotion, setAvatarEmotion] = useState<EmotionType>("neutral");
  
  // 선택된 아바타 객체
  const selectedAvatar = INTERVIEWER_AVATARS.find(a => a.id === selectedAvatarId) || INTERVIEWER_AVATARS[0];
  
  // 프로필 데이터 조회
  const { data: profile } = trpc.profile.get.useQuery();
  // 이력서/자소서는 프로필에서 가져옴
  const { data: subscription } = trpc.subscription.current.useQuery();
  
  // API mutations
  const startSessionMutation = trpc.interview.start.useMutation();
  const generateQuestionMutation = trpc.interview.generateQuestion.useMutation();
  const submitAnswerMutation = trpc.interview.submitAnswer.useMutation();
  const completeSessionMutation = trpc.interview.complete.useMutation();
  const whisperTranscribeMutation = trpc.voice.transcribe.useMutation();
  
  // 프로필에서 기본값 설정
  useEffect(() => {
    if (profile) {
      setSettings(prev => ({
        ...prev,
        targetCompany: profile.targetCompany || "",
        targetPosition: profile.targetPosition || ""
      }));
    }
  }, [profile]);
  
  // 타이머 로직
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // 시간 초과 - 자동 제출
            handleTimeUp();
            return 0;
          }
          // 경고 알림
          if (prev === 60) toast.warning("1분 남았습니다!");
          if (prev === 30) toast.warning("30초 남았습니다!");
          if (prev === 10) toast.warning("10초 남았습니다!", { duration: 2000 });
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timeRemaining]);
  
  // 시간 초과 처리
  const handleTimeUp = useCallback(() => {
    setTimerActive(false);
    toast.info("답변 시간이 종료되었습니다.");
    if (isRecording) {
      stopRecordingAndSubmit();
    } else {
      // 답변 없이 다음으로
      handleSubmitAnswer("");
    }
  }, [isRecording]);
  
  // 침묵 감지 로직
  const startSilenceDetection = useCallback(() => {
    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    
    lastSpeechTimeRef.current = Date.now();
    setLastSpeechTime(lastSpeechTimeRef.current);
    setSilenceTimer(0);
    
    silenceCheckRef.current = setInterval(() => {
      const now = Date.now();
      const silenceDuration = (now - lastSpeechTimeRef.current) / 1000;
      setSilenceTimer(silenceDuration);
      
      if (silenceDuration >= settings.silenceThreshold) {
        // 침묵 감지 - 자동 제출
        toast.info("답변이 완료된 것 같습니다. 제출합니다.");
        stopRecordingAndSubmit();
      }
    }, 500);
  }, [settings.silenceThreshold]);
  
  // 음성 레벨 분석 (침묵 감지용)
  const analyzeAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // 평균 볼륨 계산
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    
    // 임계값 이상이면 음성으로 판단
    if (average > 20) {
      const now = Date.now();
      lastSpeechTimeRef.current = now;
      setLastSpeechTime(now);
      setSilenceTimer(0);
    }
  }, []);
  
  // TTS mutation
  const ttsMutation = trpc.tts.generate.useMutation();
  
  // 자동 녹음 시작
  const startAutoRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // AudioContext 설정 (침묵 감지용)
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      audioSource.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // MediaRecorder 설정
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setCurrentAudioBlob(blob);
        
        // Whisper API로 텍스트 변환
        await transcribeAndSubmit(blob);
      };
      
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      recorder.start(1000);
      setIsRecording(true);
      setStatus("listening");
      
      // 타이머 시작
      setTimeRemaining(settings.timePerQuestion);
      setTimerActive(true);
      
      // 침묵 감지 시작
      startSilenceDetection();
      
      // 음성 레벨 분석 시작
      const analyzeInterval = setInterval(analyzeAudioLevel, 100);
      
      // 녹음 중지 시 정리
      recorder.addEventListener('stop', () => {
        clearInterval(analyzeInterval);
        if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
      });
      
      toast.success("답변을 시작하세요!", { duration: 2000 });
      
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("마이크 접근 권한이 필요합니다.");
      // 마이크 권한 오류 시 상태를 listening으로 변경하고 수동 입력 모드로 전환
      setIsSpeaking(false);
      setStatus("listening");
      setTimeRemaining(settings.timePerQuestion);
      setTimerActive(true);
    }
  }, [settings.timePerQuestion, startSilenceDetection, analyzeAudioLevel]);
  
  // TTS로 질문 읽기
  const speakQuestion = useCallback(async (text: string) => {
    if (!text.trim()) return;

    console.log('[TTS] speakQuestion called with:', text.substring(0, 50));
    setIsSpeaking(true);
    setTtsError(null);
    setAvatarEmotion("neutral");

    // 같은 질문을 다시 재생할 때 기존 오디오를 정리한다.
    if (ttsAudio) {
      ttsAudio.pause();
      ttsAudio.currentTime = 0;
    }

    const finishSpeakingAndStartRecording = () => {
      setIsSpeaking(false);
      setAvatarEmotion("neutral");
      void startAutoRecording();
    };

    try {
      const voiceType = selectedAvatar.voiceType || 'female1';
      // 아바타별 voiceStyle의 rate, pitch를 Edge TTS 형식으로 변환 (+20%, -10Hz 등)
      const rateMultiplier = selectedAvatar.voiceStyle?.rate ?? 1.0;
      const ratePercent = Math.round((rateMultiplier - 1.0) * 100);
      const rateStr = `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;

      const pitchVal = selectedAvatar.voiceStyle?.pitch ?? 1.0;
      // pitch 0.85 -> -15Hz, 1.15 -> +15Hz 등 대략적인 변환
      const pitchHz = Math.round((pitchVal - 1.0) * 100);
      const pitchStr = `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`;

      const result = await ttsMutation.mutateAsync({
        text,
        voiceType: voiceType as 'female1' | 'female2' | 'male1' | 'male2' | 'natural',
        rate: rateStr,
        pitch: pitchStr,
      });

      if (!result.audioUrl) {
        throw new Error('음성 파일 주소가 비어 있습니다.');
      }

      const audio = new Audio();
      audio.preload = 'auto';
      // 단순 재생에는 crossOrigin이 필요하지 않으며, S3 CORS 설정이 없는 모바일에서
      // 오디오 로딩을 막을 수 있으므로 설정하지 않는다.
      audio.src = result.audioUrl;
      setTtsAudio(audio);

      audio.onended = () => {
        setIsSpeaking(false);
        setAvatarEmotion("neutral");
        setStatus("ready");
        // 자동 녹음 모드의 기존 동작은 유지하되, 모바일에서 사용자가
        // ‘답변 준비’ 단계를 인지할 수 있도록 짧은 안내 시간을 둔다.
        window.setTimeout(() => void startAutoRecording(), 600);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setStatus("ready");
        setTtsError('질문 음성을 재생하지 못했습니다. 다시 시도하거나 텍스트를 보고 답변을 시작하세요.');
        toast.error('질문 음성 재생에 실패했습니다.');
      };

      try {
        await audio.play();
      } catch (playError) {
        console.warn('[TTS] 모바일 자동재생 차단:', playError);
        // 자동재생 실패 후 녹음으로 바로 넘어가면 사용자가 질문을 듣지 못하므로
        // 질문 화면을 유지하고 명시적인 버튼 클릭을 기다린다.
        setIsSpeaking(false);
        setStatus("ready");
        setTtsError('휴대폰 브라우저가 자동 재생을 차단했습니다. 아래 버튼을 눌러 질문을 다시 들으세요.');
        toast.info('자동 재생이 차단되었습니다. “질문 다시 듣기”를 눌러주세요.');
      }
    } catch (error) {
      console.error('[TTS] 음성 생성 실패:', error);
      setIsSpeaking(false);
      setStatus("ready");
      setTtsError('질문 음성을 준비하지 못했습니다. 텍스트 질문을 확인하고 답변을 시작할 수 있습니다.');
      toast.error('음성을 준비하지 못했습니다. 텍스트로 계속할 수 있습니다.');
    }
  }, [selectedAvatar, ttsAudio, ttsMutation, startAutoRecording]);

  const replayQuestion = useCallback(async () => {
    if (!currentQuestion) return;
    setTtsError(null);

    if (ttsAudio) {
      try {
        ttsAudio.currentTime = 0;
        await ttsAudio.play();
        return;
      } catch (error) {
        console.warn('[TTS] 기존 오디오 재생 실패, 음성을 다시 생성합니다.', error);
      }
    }

    await speakQuestion(currentQuestion);
  }, [currentQuestion, speakQuestion, ttsAudio]);

  const startAnswerManually = useCallback(async () => {
    if (isSpeaking || isRecording) return;
    setTtsError(null);
    await startAutoRecording();
  }, [isSpeaking, isRecording, startAutoRecording]);

  const returnToSetup = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (ttsAudio) {
      ttsAudio.pause();
      ttsAudio.currentTime = 0;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    setTimerActive(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setTtsError(null);
    setSessionId(null);
    setQas([]);
    setCurrentQuestionIndex(0);
    setCurrentQuestion("");
    setCurrentQuestionType("");
    setNextQuestionReady(false);
    setStatus("setup");
    toast.info("면접 설정 화면으로 돌아왔습니다.");
  }, [mediaRecorder, ttsAudio]);
  
  // 녹음 중지 및 제출
  const stopRecordingAndSubmit = useCallback(() => {
    setTimerActive(false);
    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder]);
  
  // Whisper 변환 및 제출
  const transcribeAndSubmit = useCallback(async (audioBlob: Blob) => {
    setStatus("processing");
    setAvatarEmotion("thinking");
    
    try {
      // Base64 변환
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      // Whisper API 호출
      const result = await whisperTranscribeMutation.mutateAsync({
        audioBase64: base64,
        mimeType: 'audio/webm',
        language: 'ko'
      });
      
      if (result.text) {
        await handleSubmitAnswer(result.text);
      } else {
        toast.error("음성을 인식하지 못했습니다.");
        await handleSubmitAnswer("");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error("음성 변환에 실패했습니다.");
      await handleSubmitAnswer("");
    }
  }, [whisperTranscribeMutation]);
  
  // 답변 제출
  const handleSubmitAnswer = useCallback(async (answerText: string) => {
    if (!sessionId) return;
    
    try {
      // 현재 QA ID 가져오기
      const currentQA = qas[qas.length - 1];
      if (!currentQA) {
        // QA가 없으면 새로 생성해야 함
        toast.error("질문 정보를 찾을 수 없습니다.");
        return;
      }
      
      const result = await submitAnswerMutation.mutateAsync({
        qaId: currentQA.id,
        answer: answerText || "(답변 없음)",
        sessionId
      });
      
      // QA 업데이트 - 기존 QA 수정
      setQas(prev => prev.map(qa => 
        qa.id === currentQA.id 
          ? {
              ...qa,
              userAnswer: answerText,
              score: result.score,
              feedback: result.feedback,
              strengths: result.strengths,
              improvements: result.improvements,
              suggestedAnswer: result.suggestedAnswer,
              answerDuration: settings.timePerQuestion - timeRemaining
            }
          : qa
      ));
      
      // 점수에 따른 감정 표현
      if (result.score) {
        setAvatarEmotion(getEmotionByScore(result.score));
      }
      
      // 다음 질문 또는 완료
      if (currentQuestionIndex + 1 < settings.questionCount) {
        setCurrentQuestionIndex(prev => prev + 1);
        setNextQuestionReady(true);
        setStatus("processing");
      } else {
        await completeInterview();
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("답변 제출에 실패했습니다.");
    }
  }, [sessionId, currentQuestion, currentQuestionType, currentQuestionIndex, settings, timeRemaining]);
  
  // 다음 질문 생성 (sessionIdParam: 첫 질문 생성 시 직접 전달)
  const generateNextQuestion = useCallback(async (sessionIdParam?: number) => {
    const activeSessionId = sessionIdParam || sessionId;
    if (!activeSessionId) {
      console.error("generateNextQuestion: sessionId가 없습니다.");
      return;
    }
    
    setStatus("question");
    setNextQuestionReady(false);
    setAvatarEmotion("neutral");
    
    try {
      // 면접관 스타일에 따른 프롬프트 스타일 설정
      const avatarSpeechStyle = settings.interviewerStyle === "pressure" 
        ? {
            formality: 'formal' as const,
            questionStyle: 'probing' as const,
            feedbackStyle: 'strict' as const,
            promptStyle: '압박 면접 스타일로 날카롭고 도전적인 질문을 해주세요. 이전 답변의 약점을 파고드는 꼬리질문도 포함해주세요.'
          }
        : settings.interviewerStyle === "friendly"
        ? {
            formality: 'semi-formal' as const,
            questionStyle: 'friendly' as const,
            feedbackStyle: 'encouraging' as const,
            promptStyle: '친절하고 격려하는 분위기로 질문해주세요.'
          }
        : {
            formality: 'formal' as const,
            questionStyle: 'direct' as const,
            feedbackStyle: 'balanced' as const,
            promptStyle: '객관적이고 전문적인 분위기로 질문해주세요.'
          };
      
      const result = await generateQuestionMutation.mutateAsync({
        sessionId: activeSessionId,
        questionOrder: currentQuestionIndex,
        avatarSpeechStyle
      });
      
      const question = result.question || '';
      const questionType = result.questionType || '';
      
      setCurrentQuestion(question);
      setCurrentQuestionType(questionType);
      setCurrentAnswer("");
      
      // QA 배열에 새 질문 추가 (id 포함)
      if (result.id) {
        setQas(prev => [...prev, {
          id: result.id,
          question,
          questionType,
          userAnswer: null,
          audioUrl: null,
          score: null,
          feedback: null,
          strengths: null,
          improvements: null,
          suggestedAnswer: null
        }]);
      }
      
      // 면접관 추임새 (압박형일 경우)
      if (settings.interviewerStyle === "pressure" && currentQuestionIndex > 0) {
        const interjections = ["음...", "그렇군요.", "네, 알겠습니다."];
        const randomInterjection = interjections[Math.floor(Math.random() * interjections.length)];
        await speakQuestion(randomInterjection + " " + result.question);
      } else {
        await speakQuestion(result.question);
      }
    } catch (error) {
      console.error("Question generation error:", error);
      toast.error("질문 생성에 실패했습니다.");
    }
  }, [sessionId, settings.interviewerStyle, currentQuestionIndex, generateQuestionMutation, speakQuestion]);

  const proceedToNextQuestion = useCallback(async () => {
    setNextQuestionReady(false);
    await generateNextQuestion();
  }, [generateNextQuestion]);
  
  // 면접 시작
  const startInterview = useCallback(async () => {
    if (!settings.targetCompany || !settings.targetPosition) {
      toast.error("회사명과 직무를 입력해주세요.");
      return;
    }
    
    // 사용자 인터랙션 시점에 AudioContext 초기화 (autoplay 정책 우회)
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      // 무음 재생으로 오디오 권한 활성화
      const silentBuffer = audioCtx.createBuffer(1, 1, 22050);
      const source = audioCtx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioCtx.destination);
      source.start();
      console.log('[TTS] AudioContext initialized for autoplay');
    } catch (e) {
      console.log('[TTS] AudioContext init failed:', e);
    }
    
    setStatus("starting");
    
    try {
      // 세션 생성
      const session = await startSessionMutation.mutateAsync({
        sessionType: "voice_interview",
        totalQuestions: settings.questionCount,
        isVoiceMode: true,
        interviewStages: selectedStages
      });
      
      setSessionId(session.id);
      
      // 첫 질문 생성 (session.id를 직접 전달 - state 업데이트 전에 호출되므로)
      await generateNextQuestion(session.id);
    } catch (error) {
      console.error("Start error:", error);
      toast.error("면접 시작에 실패했습니다.");
      setStatus("setup");
    }
  }, [settings, selectedStages, startSessionMutation, generateNextQuestion]);
  
  // 면접 완료
  const completeInterview = useCallback(async () => {
    if (!sessionId) return;
    
    setStatus("completed");
    setAvatarEmotion("pleased");
    
    try {
      await completeSessionMutation.mutateAsync({ sessionId });
      
      toast.success("면접이 완료되었습니다!");
      
      // 결과 페이지로 이동
      setTimeout(() => {
        setLocation(`/result/${sessionId}`);
      }, 2000);
    } catch (error) {
      console.error("Complete error:", error);
    }
  }, [sessionId, completeSessionMutation, setLocation]);
  
  // 수동 제출 버튼
  const handleManualSubmit = useCallback(() => {
    stopRecordingAndSubmit();
  }, [stopRecordingAndSubmit]);
  
  // 타이머 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleNextSetup = () => {
    setSavedSetupSteps(prev => Array.from(new Set([...prev, setupStep])) as SetupStep[]);
    setSetupStep(prev => (prev + 1) as SetupStep);
    window.scrollTo(0, 0);
  };

  const handlePrevSetup = () => {
    setSetupStep(prev => (prev - 1) as SetupStep);
    window.scrollTo(0, 0);
  };

  const toggleStage = (id: InterviewStageId) => {
    setSelectedStages(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // 설정 화면 렌더링
  const renderSetupScreen = () => {
    const setupSteps = ["기본 정보", "면접 단계", "면접관 선택", "상세 설정", "준비 완료"];
    
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">리얼 면접 설정</h1>
          </div>
          <p className="text-muted-foreground">
            실제 면접과 동일한 환경을 단계별로 구성합니다
          </p>
        </div>

        {/* 단계 표시 */}
        <div className="bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex justify-between mb-2">
            {setupSteps.map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  setupStep === i + 1 ? "bg-primary text-primary-foreground" : 
                  savedSetupSteps.includes((i + 1) as SetupStep) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {savedSetupSteps.includes((i + 1) as SetupStep) ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] sm:text-xs hidden sm:block ${setupStep === i + 1 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <Progress value={(setupStep / setupSteps.length) * 100} className="h-1.5" />
        </div>

        {/* 단계별 카드 */}
        <div className="min-h-[400px]">
          {setupStep === 1 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  1. 기본 정보 입력
                </CardTitle>
                <CardDescription>지원하시는 회사와 직무를 입력해주세요. 이 정보를 바탕으로 AI가 맞춤형 질문을 생성합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company">지원 회사</Label>
                  <input
                    id="company"
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="예: 삼성전자"
                    value={settings.targetCompany}
                    onChange={(e) => setSettings(prev => ({ ...prev, targetCompany: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">지원 직무</Label>
                  <input
                    id="position"
                    type="text"
                    className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="예: 소프트웨어 개발자"
                    value={settings.targetPosition}
                    onChange={(e) => setSettings(prev => ({ ...prev, targetPosition: e.target.value }))}
                  />
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {profile?.resume || profile?.coverLetter ? "등록된 이력서와 자기소개서가 분석에 포함됩니다." : "프로필에 이력서를 등록하면 더 정확한 질문이 생성됩니다."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {setupStep === 2 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  2. 면접 단계 구성
                </CardTitle>
                <CardDescription>실제 AI 면접의 흐름을 선택하세요. 각 단계는 실제 기업의 평가 방식과 동일하게 진행됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {REAL_INTERVIEW_STAGES.map((stage) => (
                  <div
                    key={stage.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedStages.includes(stage.id) ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                    }`}
                    onClick={() => toggleStage(stage.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${selectedStages.includes(stage.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                        {selectedStages.includes(stage.id) && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">{stage.step}</Badge>
                          <h3 className="font-bold">{stage.title}</h3>
                        </div>
                        <p className="text-sm font-medium text-foreground/80 mb-1">{stage.description}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{stage.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {setupStep === 3 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  3. 면접관 스타일 및 아바타
                </CardTitle>
                <CardDescription>면접의 분위기를 결정할 면접관을 선택하세요. 각 면접관은 고유한 음성과 질문 스타일을 가집니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>면접 분위기</Label>
                  <RadioGroup
                    value={settings.interviewerStyle}
                    onValueChange={(v) => setSettings(prev => ({ ...prev, interviewerStyle: v as InterviewerStyle }))}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    {Object.entries(INTERVIEWER_STYLES).map(([key, style]) => (
                      <div
                        key={key}
                        className={`flex flex-col items-center text-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          settings.interviewerStyle === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                        onClick={() => setSettings(prev => ({ ...prev, interviewerStyle: key as InterviewerStyle }))}
                      >
                        <div className={`mb-2 p-2 rounded-full bg-background border ${style.color}`}>{style.icon}</div>
                        <Label className="font-bold mb-1 cursor-pointer">{style.label}</Label>
                        <p className="text-[10px] text-muted-foreground">{style.description}</p>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-3">
                  <Label>면접관 아바타 (자연스러운 음성)</Label>
                  <AvatarSelector
                    selectedAvatarId={selectedAvatarId}
                    onSelect={(avatar) => setSelectedAvatarId(avatar.id)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {setupStep === 4 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  4. 상세 시간 및 감지 설정
                </CardTitle>
                <CardDescription>면접 진행의 세부 규칙을 설정합니다. 실제 면접과 유사한 긴장감을 위해 기본값을 권장합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <Label className="text-base">질문당 생각할 시간</Label>
                      <p className="text-xs text-muted-foreground">질문이 나온 후 답변을 준비하는 시간입니다.</p>
                    </div>
                    <Badge variant="secondary" className="text-sm font-mono">{settings.prepTime}초</Badge>
                  </div>
                  <Slider
                    value={[settings.prepTime]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, prepTime: v }))}
                    min={10}
                    max={60}
                    step={10}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <Label className="text-base">답변 제한 시간</Label>
                      <p className="text-xs text-muted-foreground">한 질문에 대해 답변할 수 있는 최대 시간입니다.</p>
                    </div>
                    <Badge variant="secondary" className="text-sm font-mono">{formatTime(settings.timePerQuestion)}</Badge>
                  </div>
                  <Slider
                    value={[settings.timePerQuestion]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, timePerQuestion: v }))}
                    min={60}
                    max={180}
                    step={30}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <Label className="text-base">자동 제출 (침묵 감지)</Label>
                      <p className="text-xs text-muted-foreground">말을 멈추고 설정한 시간이 지나면 자동으로 제출됩니다.</p>
                    </div>
                    <Badge variant="secondary" className="text-sm font-mono">{settings.silenceThreshold}초</Badge>
                  </div>
                  <Slider
                    value={[settings.silenceThreshold]}
                    onValueChange={([v]) => setSettings(prev => ({ ...prev, silenceThreshold: v }))}
                    min={2}
                    max={5}
                    step={0.5}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {setupStep === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">모든 준비가 끝났습니다!</CardTitle>
                  <CardDescription>설정하신 내용으로 실제와 같은 AI 면접을 시작합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="text-muted-foreground mb-1">지원 정보</p>
                      <p className="font-bold truncate">{settings.targetCompany} · {settings.targetPosition}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="text-muted-foreground mb-1">면접관</p>
                      <p className="font-bold">{selectedAvatar.name} ({INTERVIEWER_STYLES[settings.interviewerStyle].label})</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="text-muted-foreground mb-1">구성 단계</p>
                      <p className="font-bold">{selectedStages.length}개 단계</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="text-muted-foreground mb-1">답변 시간</p>
                      <p className="font-bold">질문당 {formatTime(settings.timePerQuestion)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full py-8 text-xl font-bold shadow-lg shadow-primary/20"
                  onClick={startInterview}
                >
                  <Zap className="w-6 h-6 mr-2 fill-current" />
                  리얼 면접 시작하기
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  시작 버튼을 누르면 첫 번째 단계인 ‘기본 면접’ 질문이 생성됩니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 바 */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handlePrevSetup}
            disabled={setupStep === 1}
            className="px-6"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            이전
          </Button>
          
          {setupStep < 5 && (
            <Button
              onClick={handleNextSetup}
              disabled={setupStep === 1 && (!settings.targetCompany || !settings.targetPosition)}
              className="px-8 font-bold"
            >
              저장 후 다음
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* 안내 */}
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">리얼 면접 유의사항</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 실제 면접처럼 질문이 음성으로 제공되며, 답변은 자동으로 녹음됩니다.</li>
                  <li>• 모든 단계가 종료될 때까지 중간 피드백은 제공되지 않습니다.</li>
                  <li>• 모바일 환경에서는 마이크 권한 허용이 반드시 필요합니다.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // 면접 진행 화면 렌더링
  const renderInterviewScreen = () => {
    const interviewStep = status === "question" ? 2 : status === "listening" ? 3 : status === "processing" ? 4 : 1;
    const interviewSteps = ["설정", "질문 듣기", "답변하기", "제출/분석"];

    return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 상단 정보 바 */}
      <div className="flex flex-col gap-3 p-4 bg-card rounded-lg border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={returnToSetup}
              aria-label="면접 설정으로 돌아가기"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              설정으로
            </Button>
            <Badge variant="outline" className="truncate max-w-[48vw]">
              {settings.targetCompany} · {settings.targetPosition}
            </Badge>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0 ${
            timeRemaining <= 30 ? "bg-red-500/20 text-red-500" :
            timeRemaining <= 60 ? "bg-yellow-500/20 text-yellow-500" :
            "bg-primary/20 text-primary"
          }`}>
            <Timer className="w-4 h-4" />
            <span className="font-mono text-sm font-bold">{formatTime(timeRemaining)}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1" aria-label="면접 진행 단계">
          {interviewSteps.map((step, index) => (
            <div key={step} className="space-y-1 text-center">
              <div className={`h-1.5 rounded-full ${index + 1 <= interviewStep ? "bg-primary" : "bg-muted"}`} />
              <span className={`text-[11px] sm:text-xs ${index + 1 === interviewStep ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 진행 바 */}
      <Progress value={(currentQuestionIndex / settings.questionCount) * 100} className="h-2" />
      
      {/* 메인 면접 영역 */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-0">
            {/* 면접관 아바타 */}
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 p-8 flex flex-col items-center justify-center min-h-[400px]">
              <InterviewingAvatar
                avatar={selectedAvatar}
                emotion={avatarEmotion}
                isSpeaking={isSpeaking}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {INTERVIEWER_STYLES[settings.interviewerStyle].label} 면접관
              </p>
            </div>
            
            {/* 질문 및 상태 */}
            <div className="p-8 flex flex-col">
              {/* 상태 표시 */}
              <div className="flex items-center gap-2 mb-4">
                {status === "question" && (
                  <Badge className="bg-blue-500">
                    <Volume2 className="w-3 h-3 mr-1" />
                    질문 중
                  </Badge>
                )}
                {status === "listening" && (
                  <Badge className="bg-red-500 animate-pulse">
                    <Mic className="w-3 h-3 mr-1" />
                    녹음 중
                  </Badge>
                )}
                {status === "processing" && (
                  <Badge className="bg-yellow-500">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    {nextQuestionReady ? "다음 질문 준비 완료" : "처리 중"}
                  </Badge>
                )}
              </div>
              
              {/* 질문 */}
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  {currentQuestionType}
                </p>
                <p className="text-xl font-medium leading-relaxed">
                  {currentQuestion}
                </p>

                        {(status === "question" || status === "ready") && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Volume2 className="h-4 w-4" />
                      {status === "question" ? "질문 음성을 준비하고 있습니다." : "질문을 확인한 뒤 답변을 시작하세요."}
                    </div>
                    {ttsError && (
                      <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-300" role="alert">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{ttsError}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 flex-1"
                        onClick={replayQuestion}
                        disabled={isSpeaking}
                        aria-label="질문 다시 듣기 및 음성 재시도"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {ttsError ? "음성 재시도" : "질문 다시 듣기"}
                      </Button>
                      <Button
                        type="button"
                        className="min-h-11 flex-1"
                        onClick={startAnswerManually}
                        disabled={isSpeaking}
                        aria-label="답변 녹음 시작"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        답변 시작
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 침묵 감지 표시 */}
              {status === "listening" && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">침묵 감지</span>
                    <span className={silenceTimer >= settings.silenceThreshold - 1 ? "text-red-500" : ""}>
                      {silenceTimer.toFixed(1)}초 / {settings.silenceThreshold}초
                    </span>
                  </div>
                  <Progress 
                    value={(silenceTimer / settings.silenceThreshold) * 100} 
                    className={`h-1 ${silenceTimer >= settings.silenceThreshold - 1 ? "[&>div]:bg-red-500" : ""}`}
                  />
                </div>
              )}
              
              {/* 다음 질문 확인 버튼 */}
              {status === "processing" && nextQuestionReady && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">답변 분석이 끝났습니다. 준비되면 다음 질문으로 이동하세요.</p>
                  <Button type="button" className="min-h-11 w-full" onClick={proceedToNextQuestion}>
                    다음 질문
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* 수동 제출 버튼 */}
              {status === "listening" && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleManualSubmit}
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  답변 완료
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 하단 안내 */}
      <div className="text-center text-sm text-muted-foreground" aria-live="polite">
        {status === "question" && (isSpeaking ? "질문을 듣는 중입니다..." : "질문 음성을 준비하고 있습니다.")}
        {status === "ready" && "질문을 확인했습니다. ‘답변 시작’을 눌러 녹음하세요."}
        {status === "listening" && "답변을 말씀해주세요. 말을 멈추면 자동으로 제출됩니다."}
        {status === "processing" && (nextQuestionReady ? "분석이 끝났습니다. 다음 질문을 눌러 계속하세요." : "답변을 분석하고 있습니다...")}
      </div>
    </div>
    );
  };
  
  // 시작 중 화면
  const renderStartingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <AnalyzingLoader />
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">면접을 준비하고 있습니다</h2>
        <p className="text-muted-foreground">잠시만 기다려주세요...</p>
      </div>
    </div>
  );
  
  // 완료 화면
  const renderCompletedScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">면접이 완료되었습니다!</h2>
        <p className="text-muted-foreground">결과 페이지로 이동합니다...</p>
      </div>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  
  return (
    <DashboardLayout>
      <div className="container py-6">
        {status === "setup" && renderSetupScreen()}
        {status === "starting" && renderStartingScreen()}
        {(status === "question" || status === "ready" || status === "listening" || status === "processing") && renderInterviewScreen()}
        {status === "completed" && renderCompletedScreen()}
      </div>
    </DashboardLayout>
  );
}
