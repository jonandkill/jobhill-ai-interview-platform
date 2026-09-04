import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { canContinueInterviewWizard, getInterviewEntryDefaults, getQuestionRecoveryMessage, INTERVIEW_SETUP_LABELS, moveInterviewSetupStep, type InterviewSetupStep } from "@/lib/interviewWizard";
import { acquireMediaStreamWithRetry, stopMediaStream } from "@/lib/mediaDeviceLifecycle";
import { 
  ArrowRight, 
  Brain, 
  CheckCircle2, 
  Loader2, 
  MessageSquare,
  Send,
  Sparkles,
  Mic,
  TrendingUp,
  Target,
  Bookmark,
  Share2,
  FileText,
  Zap,
  Volume2,
  VolumeX,
  Download,
  Home,
  Settings,
  Shield,
  AlertCircle,
  Timer,
  Copy,
  Link2,
  CheckCircle
} from "lucide-react";
import SocialShare from "@/components/SocialShare";
import FreeLimitBanner from "@/components/FreeLimitBanner";
import PopularQuestions from "@/components/PopularQuestions";
import { ShareModal } from "@/components/ShareModal";
import { UsageLimitModal } from "@/components/UsageLimitModal";
import { QuestionShareModal } from "@/components/QuestionShareModal";
import CouponInputModal from "@/components/CouponInputModal";
import { ReviewIncentiveDialog } from "@/components/ReviewIncentiveDialog";
import InterviewMediaCheck from "@/components/InterviewMediaCheck";
import InstantAnswerCorrection from "@/components/InstantAnswerCorrection";
import InterviewCheckpoint from "@/components/InterviewCheckpoint";
import DocumentIntakePanel from "@/components/DocumentIntakePanel";

import AnalyzingLoader from "@/components/AnalyzingLoader";
import { 
  InterviewerAvatarType, 
  INTERVIEWER_AVATARS, 
  AvatarSelector, 
  InterviewingAvatar,
  EmotionType,
  getEmotionByScore
} from "@/components/InterviewerAvatar";
import { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { correctSpeechText, generateSpeechHintMessage } from "@/lib/speechDictionary";
import { cleanRecognizedTranscript, mergeRecognizedSpeech } from "@/lib/transcriptAnalysis";
import { normalizeTranscriptionAudioMimeType, selectInterviewAudioMimeType } from "@/lib/interviewAudioCapture";
import { escapeHtml, escapeHtmlWithBreaks } from "@/lib/safeHtml";
import {
  INTERVIEW_PHASES,
  type InterviewPhaseId,
  type InterviewRubricScores,
} from "@shared/interviewFramework";

type SessionStatus = "idle" | "starting" | "in_progress" | "answering" | "feedback" | "completed";

interface TimingInfo {
  timing: string;
  mood: string;
  answerStyle: string;
}

interface QAItem {
  id: number;
  question: string;
  questionType: string;
  userAnswer?: string | null;
  feedback?: string | null;
  score?: number | null;
  phaseId?: InterviewPhaseId | null;
  phaseLabel?: string | null;
  rubricScores?: InterviewRubricScores | null;
  strengths?: string | null;
  improvements?: string | null;
  suggestedAnswer?: string | null;
  suggestedAnswerShort?: string | null;
  suggestedAnswerLong?: string | null;
  improvementGuide?: string | null;
  feedbackPerspective?: string | null;
  timingInfo?: TimingInfo | null;
  followUpQuestions?: string[] | null;
  parentQaId?: number;
  keywords?: string[] | null;
  scoreDetails?: {
    logic: number;
    specificity: number;
    relevance: number;
    communication: number;
  } | null;
}

interface BalanceAnalysis {
  personality: number;
  experience: number;
  technical: number;
  situational: number;
  company: number;
}

// 저장 버튼 컴포넌트
function SavePracticeButton({ sessionId, qas, passRate, balanceAnalysis, profile }: {
  sessionId: number | null;
  qas: QAItem[];
  passRate: number | null;
  balanceAnalysis: BalanceAnalysis | null;
  profile: any;
}) {
  const [saved, setSaved] = useState(false);
  const saveMutation = trpc.savedPractices.create.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("면접 연습이 저장되었습니다!");
    },
    onError: (error) => {
      toast.error("저장 실패: " + error.message);
    },
  });

  const handleSave = () => {
    const content = JSON.stringify({
      qas: qas.map(qa => ({
        question: qa.question,
        questionType: qa.questionType,
        userAnswer: qa.userAnswer,
        feedback: qa.feedback,
        score: qa.score,
      })),
      passRate,
      balanceAnalysis,
    });

    saveMutation.mutate({
      sessionId: sessionId || undefined,
      title: `${profile?.targetCompany || '미지정'} - ${profile?.targetPosition || '미지정'} 면접`,
      companyName: profile?.targetCompany,
      positionName: profile?.targetPosition,
      practiceType: "mock_interview",
      content,
      overallScore: passRate || undefined,
    });
  };

  return (
    <Button
      variant="outline"
      className="gap-2 w-full sm:w-auto"
      onClick={handleSave}
      disabled={saved || saveMutation.isPending}
    >
      <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
      {saved ? '저장됨' : saveMutation.isPending ? '저장 중...' : '연습 저장'}
    </Button>
  );
}

export default function Interview() {
  const [location, setLocation] = useLocation();
  const entryDefaults = getInterviewEntryDefaults(location);
  const utils = trpc.useUtils();
  const { data: profile } = trpc.profile.get.useQuery();
  const { data: subscription } = trpc.subscription.current.useQuery();
  const profileUpsertMutation = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("지원 정보가 저장되었습니다");
    },
    onError: () => toast.error("지원 정보를 저장하지 못했습니다. 다시 시도해주세요."),
  });
  
  const [status, setStatus] = useState<SessionStatus>("idle");
  const statusRef = useRef<SessionStatus>("idle");
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // 모의면접 시작 전에는 한 화면에 모든 설정을 노출하지 않고 단계별로 진행합니다.
  const [setupStep, setSetupStep] = useState<InterviewSetupStep>(0);
  const [showInterviewGuide, setShowInterviewGuide] = useState(false);
  const [questionGenerationError, setQuestionGenerationError] = useState<string | null>(null);
  const [wizardCompany, setWizardCompany] = useState("");
  const [wizardPosition, setWizardPosition] = useState("");
  const [wizardResume, setWizardResume] = useState("");
  const [wizardCoverLetter, setWizardCoverLetter] = useState("");
  const [planMode, setPlanMode] = useState<"structured" | "selected_only">("structured");
  const [recordingMode, setRecordingMode] = useState<"manual" | "automatic">(entryDefaults.recordingMode);
  const silenceThreshold = 8;
  const questionGenerationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionGenerationRequestRef = useRef(0);
  const expectedQuestionOrderRef = useRef<number | null>(null);
  const expectedQuestionSessionRef = useRef<number | null>(null);
  const [currentQA, setCurrentQA] = useState<QAItem | null>(null);
  const [qas, setQas] = useState<QAItem[]>([]);
  const [answer, setAnswer] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(3);
  const [voiceMode, setVoiceMode] = useState(() => {
    if (entryDefaults.voiceMode) return true;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('interviewVoiceMode');
      return saved === 'true';
    }
    return false;
  });
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [mediaReady, setMediaReady] = useState(false);
  const [passRate, setPassRate] = useState<number | null>(null);
  const [balanceAnalysis, setBalanceAnalysis] = useState<BalanceAnalysis | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const [usageLimitReason, setUsageLimitReason] = useState<"voice_limit" | "usage_limit" | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const listeningRequestedRef = useRef(false);
  const recognitionRestartTimerRef = useRef<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsSpeed, setTtsSpeed] = useState(0.98); // 0.8 ~ 1.5, 기본값 1.15배속
  const [ttsTone, setTtsTone] = useState<'calm' | 'energetic' | 'professional'>('professional');
  const [ttsVoiceType, setTtsVoiceType] = useState<string>('natural'); // 음성 유형 선택
  const [customPitch, setCustomPitch] = useState(1.0); // 사용자 맞춤 음높이 (0.5 ~ 1.5, 기본값 1.0)
  
  // 음성 면접 흐름 개선을 위한 상태
  const [showTimerBar, setShowTimerBar] = useState(true); // 타이머 바 표시/숨기기
  const [interimTranscript, setInterimTranscript] = useState(''); // 음성 인식 중간 결과
  const [showQuitConfirmDialog, setShowQuitConfirmDialog] = useState(false); // 중도 포기 확인 다이얼로그
  const [micTestPassed, setMicTestPassed] = useState(false); // 마이크 테스트 통과 여부
  const [showMicTest, setShowMicTest] = useState(false); // 마이크 테스트 화면 표시
  const [micTestStatus, setMicTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle'); // 마이크 테스트 상태
  const [micTestVolume, setMicTestVolume] = useState(0); // 마이크 테스트 볼륨
  const [showMicPermissionGuide, setShowMicPermissionGuide] = useState(false); // 마이크 권한 안내 팝업
  const [micPermissionDenied, setMicPermissionDenied] = useState(false); // 마이크 권한 거부 상태
  const [isChromeBrowser, setIsChromeBrowser] = useState(true); // Chrome 브라우저 여부
  const [showBrowserWarning, setShowBrowserWarning] = useState(false); // 브라우저 경고 표시
  
  // 실시간 피드백 관련 상태
  const [silenceTimer, setSilenceTimer] = useState(0); // 침묵 시간 (초)
  const [showSilenceWarning, setShowSilenceWarning] = useState(false); // 침묵 경고 표시
  const [lastSpeechTime, setLastSpeechTime] = useState<number | null>(null); // 마지막 음성 감지 시간
  
  // Whisper API 음성 인식 관련 상태는 아래 녹음 관련 상태에서 정의됨
  
  // 면접관 아바타 관련 상태
  const [selectedAvatar, setSelectedAvatar] = useState<InterviewerAvatarType>(INTERVIEWER_AVATARS[0]);
  const [avatarEmotion, setAvatarEmotion] = useState<EmotionType>('neutral');
  
  // 사용자가 선택한 질문 목록
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  
  // 직군별 추천 답변 시간 데이터
  const jobCategoryTimers: Record<string, { label: string; seconds: number; description: string }> = {
    tech: { label: '기술직', seconds: 120, description: '논리적이고 구조화된 답변 권장' },
    sales: { label: '영업직', seconds: 90, description: '간결하고 설득력 있는 답변 권장' },
    marketing: { label: '마케팅', seconds: 90, description: '창의적이고 핵심적인 답변 권장' },
    management: { label: '관리직', seconds: 180, description: '포괄적이고 전략적인 답변 권장' },
    finance: { label: '금융/재무', seconds: 120, description: '정확하고 분석적인 답변 권장' },
    hr: { label: '인사/총무', seconds: 90, description: '공감적이고 명확한 답변 권장' },
    design: { label: '디자인', seconds: 120, description: '창의성과 과정 설명 중심 답변 권장' },
    research: { label: '연구/개발', seconds: 150, description: '심층적이고 체계적인 답변 권장' },
    service: { label: '서비스/CS', seconds: 60, description: '친절하고 빠른 대응 중심 답변 권장' },
    custom: { label: '직접 설정', seconds: 120, description: '원하는 시간으로 직접 설정' },
  };

  // 질문 유형별 추천 답변 시간 (초 단위) - 실제 면접 기준 최적화
  // 7~10개 질문 기준 10분 면접 시 질문당 평균 60~90초
  const questionTypeTimers: Record<string, { seconds: number; description: string }> = {
    '자기소개': { seconds: 60, description: '간결하게 1분 내외' },
    '지원동기': { seconds: 40, description: '핵심 이유 간결히' },
    '장단점': { seconds: 30, description: '핵심만 간결히' },
    '경험/역량': { seconds: 40, description: '경험담 30~40초' },
    '인성/성격': { seconds: 30, description: '간결한 예시 포함' },
    '기술/전문': { seconds: 20, description: '직무/전공 20초 내외' },
    '상황/문제해결': { seconds: 40, description: '경험담 30~40초' },
    '회사/직무이해': { seconds: 20, description: '직무 이해도 20초' },
    '입사 후 계획': { seconds: 30, description: '간결한 목표 제시' },
    '팝워크/협업': { seconds: 40, description: '협업 경험 30~40초' },
    '리더십': { seconds: 40, description: '리더십 경험 30~40초' },
    '스트레스/위기관리': { seconds: 30, description: '간결한 대응 방식' },
    '창의성/혁신': { seconds: 40, description: '경험담 30~40초' },
    '업계동향': { seconds: 20, description: '직무 관련 20초' },
    '연봉/조건': { seconds: 10, description: '인적사항 10초 내외' },
    '인적사항': { seconds: 10, description: '이력서 기반 10초 내외' },
    '자격증': { seconds: 20, description: '전공/자격 20초 내외' },
    '학과/전공': { seconds: 20, description: '전공 관련 20초 내외' },
    '기타': { seconds: 30, description: '일반적 30초' },
  };

  // 자동 타이머 설정 여부
  const [autoTimerEnabled, setAutoTimerEnabled] = useState(true);

  // 타이머 관련 상태 - 음성 모드일 때 기본 활성화
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerDuration, setTimerDuration] = useState(120); // 기본 2분
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedJobCategory, setSelectedJobCategory] = useState<string>('custom');

  useEffect(() => {
    if (!profile) return;
    setWizardCompany(profile.targetCompany || "");
    setWizardPosition(profile.targetPosition || "");
    setWizardResume(profile.resume || "");
    setWizardCoverLetter(profile.coverLetter || "");
  }, [profile?.targetCompany, profile?.targetPosition, profile?.resume, profile?.coverLetter]);
  const [timerOvertime, setTimerOvertime] = useState(false); // 시간 초과 여부
  const [overtimeSeconds, setOvertimeSeconds] = useState(0); // 초과 시간
  
  // 답변 시간 측정 관련 상태
  const [answerStartTime, setAnswerStartTime] = useState<number | null>(null);
  const [qaAnswerDurations, setQaAnswerDurations] = useState<Record<number, number>>({}); // qaId -> 답변 시간
  
  // 답변 수정 관련 상태
  const [isRevising, setIsRevising] = useState(false);
  const [revisedAnswer, setRevisedAnswer] = useState("");
  const [showRevisionResult, setShowRevisionResult] = useState(false);
  const [revisionResult, setRevisionResult] = useState<{
    score: number;
    feedback: string;
    improvements: string;
    remainingIssues: string;
    originalScore: number;
  } | null>(null);
  
  // 질문 공유 관련 상태
  const [showQuestionShareModal, setShowQuestionShareModal] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  
  // 녹음 다시 듣기 관련 상태
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingSilenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartPendingRef = useRef(false);
  const autoRecordTimeoutRef = useRef<number | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false); // Whisper API 변환 중
  const [useWhisperApi, setUseWhisperApi] = useState(true); // Whisper API 사용 여부

  useEffect(() => () => {
    audioPlayerRef.current?.pause();
    audioPlayerRef.current = null;
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
  }, [recordedAudioUrl]);
  
  // 후속 질문 관련 상태
  const [followUpDifficulty, setFollowUpDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium'); // 후속 질문 난이도
  const [followUpCount, setFollowUpCount] = useState(0); // 현재 세션에서 후속 질문 횟수

  // Whisper API 음성 인식 mutation
  const whisperTranscribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      if (data.text) {
        // 한 답변의 전체 녹음을 다시 판독한 결과이므로 기존 초안에 덧붙이지 않습니다.
        // 모바일 누적 가설에서 생긴 비정상 반복만 보수적으로 정리합니다.
        setAnswer(cleanRecognizedTranscript(data.text));
        setInterimTranscript("");
        toast.success("답변을 글로 옮겼습니다. 제출 전에 확인해주세요.");
      }
      setIsTranscribing(false);
    },
    onError: (error) => {
      console.error('[Whisper API] 음성 인식 실패:', error);
      // 사용자 친화적 에러 메시지
      let errorMessage = '음성 인식에 실패했습니다.';
      if (error.message.includes('FILE_TOO_LARGE')) {
        errorMessage = '녹음 파일이 너무 큽니다. 더 짧게 녹음해주세요.';
      } else if (error.message.includes('INVALID_FORMAT')) {
        errorMessage = '지원하지 않는 오디오 형식입니다.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
      setIsTranscribing(false);
      setInterimTranscript('');
    },
  });

  const releaseRecordingResources = useCallback((cancelRecorder = false) => {
    if (recordingSilenceIntervalRef.current) {
      clearInterval(recordingSilenceIntervalRef.current);
      recordingSilenceIntervalRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (cancelRecorder && recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.stop();
    }
    stopMediaStream(recordingStreamRef.current);
    recordingStreamRef.current = null;
    void recordingAudioContextRef.current?.close().catch(() => undefined);
    recordingAudioContextRef.current = null;
    mediaRecorderRef.current = null;
    recordingStartPendingRef.current = false;
  }, []);

  const submitRecordedAudioForTranscription = async (blob: Blob, mimeType: string) => {
    if (!sessionId) {
      toast.error("음성 면접 세션을 확인할 수 없습니다. 질문을 다시 불러와주세요.");
      return;
    }
    if (blob.size === 0) {
      toast.error("녹음된 오디오가 없습니다.");
      return;
    }
    if (blob.size > 12 * 1024 * 1024) {
      toast.error("오디오 파일이 너무 큽니다. 12MB보다 짧게 녹음해주세요.");
      return;
    }

    setIsTranscribing(true);
    setInterimTranscript("음성을 텍스트로 변환 중...");
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }
      whisperTranscribeMutation.mutate({
        sessionId,
        audioBase64: btoa(binary),
        mimeType: normalizeTranscriptionAudioMimeType(mimeType),
        language: "ko",
      });
    } catch (error) {
      console.error("[Whisper API] 오디오 인코딩 실패:", error);
      setIsTranscribing(false);
      setInterimTranscript("");
      toast.error("음성 변환을 준비하지 못했습니다.");
    }
  };

  // TTS 종료 뒤 자동으로 시작하는 녹음과 수동 녹음이 같은 생애주기를 사용합니다.
  const startRecording = async () => {
    if (recordingStartPendingRef.current || mediaRecorderRef.current?.state === "recording" || isTranscribing) return;
    recordingStartPendingRef.current = true;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저는 마이크를 지원하지 않습니다.");
      }
      stream = await acquireMediaStreamWithRetry({
        getUserMedia: constraints => navigator.mediaDevices.getUserMedia(constraints),
        constraints: { audio: true },
        maxBusyRetries: 1,
      });
      if (statusRef.current !== "answering") {
        stopMediaStream(stream);
        return;
      }

      const selectedMimeType = selectInterviewAudioMimeType(type => MediaRecorder.isTypeSupported(type));
      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);
      const actualMimeType = recorder.mimeType || selectedMimeType || "audio/webm";
      const chunks: Blob[] = [];

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setMediaRecorder(recorder);

      audioContext = new AudioContext();
      recordingAudioContextRef.current = audioContext;
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      audioSource.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let hasSpeech = false;
      let lastSoundAt = Date.now();

      const finishResources = () => {
        if (recordingSilenceIntervalRef.current) {
          clearInterval(recordingSilenceIntervalRef.current);
          recordingSilenceIntervalRef.current = null;
        }
        stopMediaStream(stream);
        if (recordingStreamRef.current === stream) recordingStreamRef.current = null;
        void audioContext?.close().catch(() => undefined);
        if (recordingAudioContextRef.current === audioContext) recordingAudioContextRef.current = null;
        if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;
        setMediaRecorder(null);
        setIsRecording(false);
        setIsListening(false);
      };

      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        finishResources();
        const blob = new Blob(chunks, { type: actualMimeType });
        setRecordedAudioUrl(previous => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(blob);
        });
        setAudioChunks([]);
        if (useWhisperApi) void submitRecordedAudioForTranscription(blob, actualMimeType);
      };
      recorder.onerror = event => {
        console.error("[Whisper API] 녹음 오류:", event);
        finishResources();
        toast.error("녹음 중 오류가 발생했습니다.");
      };

      recorder.start(1000);
      setAnswerStartTime(Date.now());
      setAudioChunks(chunks);
      setIsRecording(true);
      setIsListening(true);
      setLastSpeechTime(Date.now());
      setInterimTranscript("녹음 중... 종료하면 답변을 바로 글로 바꿉니다.");

      if (recordingMode === "automatic") {
        recordingSilenceIntervalRef.current = setInterval(() => {
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let index = 0; index < dataArray.length; index += 1) {
            const normalized = (dataArray[index] - 128) / 128;
            sum += normalized * normalized;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          if (rms > 0.035) {
            hasSpeech = true;
            lastSoundAt = Date.now();
            setLastSpeechTime(lastSoundAt);
            setShowSilenceWarning(false);
          } else if (
            hasSpeech &&
            (Date.now() - lastSoundAt) / 1000 >= silenceThreshold &&
            recorder.state !== "inactive"
          ) {
            // 침묵은 생각하는 시간일 수 있으므로 답변을 자동 종료하지 않습니다.
            setShowSilenceWarning(true);
          }
        }, 250);
      }
    } catch (error) {
      stopMediaStream(stream);
      void audioContext?.close().catch(() => undefined);
      if (recordingStreamRef.current === stream) recordingStreamRef.current = null;
      if (recordingAudioContextRef.current === audioContext) recordingAudioContextRef.current = null;
      mediaRecorderRef.current = null;
      setMediaRecorder(null);
      setIsRecording(false);
      setIsListening(false);
      toast.error(error instanceof Error ? error.message : "마이크 접근 권한이 필요합니다.");
    } finally {
      recordingStartPendingRef.current = false;
    }
  };

  // 음성 녹음 중지
  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      setIsRecording(false);
      setIsListening(false);
    }
  };

  // 녹음 재생
  const playRecording = () => {
    if (recordedAudioUrl) {
      audioPlayerRef.current?.pause();
      const audio = new Audio(recordedAudioUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => {
        if (audioPlayerRef.current === audio) audioPlayerRef.current = null;
        setIsPlayingRecording(false);
      };
      void audio.play().catch(() => {
        if (audioPlayerRef.current === audio) audioPlayerRef.current = null;
        setIsPlayingRecording(false);
        toast.error("녹음 답변을 재생하지 못했습니다.");
      });
      setIsPlayingRecording(true);
    }
  };

  // 세션 ID 생성 (비로그인 사용자도 추적 가능)
  const [sessionTrackingId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('session_tracking_id');
      if (!id) {
        id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('session_tracking_id', id);
      }
      return id;
    }
    return 'server_session';
  });

  // 사용 횟수 추적 및 가입 유도 체크
  const usageCheckQuery = trpc.usage.shouldPromptSignup.useQuery(
    { sessionId: sessionTrackingId },
    { enabled: !subscription }
  );

  const incrementUsageMutation = trpc.usage.increment.useMutation();

  // 쿠폰으로 받은 무료 시간 조회
  const { data: couponFreeTime } = trpc.coupon.myFreeTime.useQuery();
  const hasCouponFreeTime = (couponFreeTime?.remainingMinutes || 0) > 0;

  // 음성 모드 사용 가능 여부 체크 (미가입자도 1회 무료 사용 가능 + 쿠폰 무료 시간 있으면 활성화)
  const voiceUsageCount = usageCheckQuery.data?.voiceCount || 0;
  const canUseVoiceMode = subscription?.planType === "premium" || 
    (subscription as any)?.plan === "premium_plus" || 
    (!subscription && voiceUsageCount < 1) || // 미가입자 1회 무료
    hasCouponFreeTime; // 쿠폰으로 받은 무료 시간이 있으면 활성화

  // 브라우저 감지 및 마이크 권한 체크
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Chrome 브라우저 감지
      const userAgent = navigator.userAgent.toLowerCase();
      const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge') && !userAgent.includes('opr');
      setIsChromeBrowser(isChrome);
      
      // Chrome이 아니면 경고 표시
      if (!isChrome && voiceMode) {
        setShowBrowserWarning(true);
      }

      // '이 질문 다시 답변하기' 단일 질문 재연습 확인
      const retryDataStr = localStorage.getItem("retry_single_question");
      if (retryDataStr) {
        try {
          const retryData = JSON.parse(retryDataStr);
          localStorage.removeItem("retry_single_question");
          if (retryData && retryData.question) {
            setSelectedQuestions([retryData.question]);
            setTotalQuestions(1);
            setPlanMode("selected_only");
            setSetupStep(6); // 바로 준비 완료 단계로 이동
            toast.success(`"${retryData.question.slice(0, 20)}..." 재연습을 시작합니다!`);
          }
        } catch (e) {
          console.error("Failed to parse retry_single_question", e);
        }
      }
    }
  }, [voiceMode]);

  // 서버 전사를 사용할 수 없을 때의 브라우저 음성 인식 보조 경로
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    recognition.lang = "ko-KR";
    recognition.continuous = !isMobile;
    recognition.interimResults = !isIOS;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || "";
        if (result.isFinal || isIOS) finalTranscript += transcript;
        else interim += transcript;
      }

      setInterimTranscript(cleanRecognizedTranscript(interim));
      if (finalTranscript) {
        const corrected = correctSpeechText(finalTranscript);
        setAnswer(previous => mergeRecognizedSpeech(previous, corrected));
        setInterimTranscript("");
        setLastSpeechTime(Date.now());
        setShowSilenceWarning(false);
      }
    };

    recognition.onerror = (event: any) => {
      const recoverable = event.error === "no-speech" || event.error === "aborted";
      if (recoverable && listeningRequestedRef.current) return;

      listeningRequestedRef.current = false;
      setIsListening(false);
      switch (event.error) {
        case "not-allowed":
          toast.error("마이크 권한을 허용한 뒤 다시 눌러주세요.");
          break;
        case "audio-capture":
          toast.error("마이크를 사용할 수 없습니다. 다른 앱의 통화를 종료한 뒤 다시 시도해주세요.");
          break;
        case "network":
          toast.error("연결이 불안정합니다. 말로 답변 입력을 다시 눌러주세요.");
          break;
        default:
          toast.error("말씀을 이어받지 못했습니다. 버튼을 눌러 다시 연결해주세요.");
      }
    };

    recognition.onend = () => {
      if (!listeningRequestedRef.current) {
        setIsListening(false);
        return;
      }

      // 모바일 브라우저의 짧은 세션 종료는 답변 완료가 아닙니다.
      recognitionRestartTimerRef.current = window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          listeningRequestedRef.current = false;
          setIsListening(false);
          toast.error("마이크 연결이 끊겼습니다. 말로 답변 입력을 다시 눌러주세요.");
        }
      }, isIOS ? 500 : 320);
    };

    setSpeechRecognition(recognition);
    return () => {
      listeningRequestedRef.current = false;
      if (recognitionRestartTimerRef.current) {
        window.clearTimeout(recognitionRestartTimerRef.current);
        recognitionRestartTimerRef.current = null;
      }
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // 이미 종료된 인식기는 별도 정리가 필요하지 않습니다.
      }
    };
  }, []);

  // 말로 답변 시작/종료
  const toggleListening = async () => {
    if (useWhisperApi) {
      if (mediaRecorderRef.current?.state === "recording" || isRecording) {
        stopRecording();
      } else {
        await startRecording();
      }
      return;
    }

    if (!speechRecognition) {
      toast.error("이 브라우저에서는 말로 답변을 받을 수 없습니다. 직접 입력해주세요.");
      return;
    }

    try {
      if (isListening) {
        listeningRequestedRef.current = false;
        if (recognitionRestartTimerRef.current) {
          window.clearTimeout(recognitionRestartTimerRef.current);
          recognitionRestartTimerRef.current = null;
        }
        speechRecognition.stop();
        setIsListening(false);
      } else {
        listeningRequestedRef.current = true;
        speechRecognition.start();
        setIsListening(true);
        toast.success("말씀해주세요. 답변이 끝나면 답변 종료를 눌러주세요.");
      }
    } catch {
      listeningRequestedRef.current = false;
      setIsListening(false);
      toast.error("마이크를 시작하지 못했습니다. 권한을 확인해주세요.");
    }
  };

  // PDF 다운로드 함수 - HTML 기반 인쇄용 페이지 생성
  const downloadPDF = () => {
    const avgScore = qas.length > 0 
      ? Math.round(qas.reduce((sum, qa) => sum + (qa.score || 0), 0) / qas.length)
      : 0;
    
    const getScoreGrade = (score: number): string => {
      if (score >= 90) return "우수";
      if (score >= 70) return "양호";
      if (score >= 50) return "보통";
      return "개선 필요";
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>면접 연습 결과 - ${escapeHtml(profile?.targetCompany || '미지정')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; 
      line-height: 1.6; 
      color: #333;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { 
      text-align: center; 
      margin-bottom: 40px; 
      padding-bottom: 20px;
      border-bottom: 2px solid #1a365d;
    }
    .header h1 { color: #1a365d; font-size: 24px; margin-bottom: 10px; }
    .header .subtitle { color: #666; font-size: 14px; }
    .summary { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      margin-bottom: 30px;
    }
    .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .summary-label { font-size: 12px; color: #666; margin-bottom: 4px; }
    .summary-value { font-size: 16px; font-weight: bold; color: #1a365d; }
    .score-box { 
      text-align: center; 
      background: #1a365d; 
      color: white; 
      padding: 20px; 
      border-radius: 8px; 
      margin-bottom: 30px;
    }
    .score-box .score { font-size: 48px; font-weight: bold; }
    .score-box .grade { font-size: 18px; opacity: 0.9; }
    .qa-section { margin-bottom: 30px; page-break-inside: avoid; }
    .qa-header { background: #e2e8f0; padding: 12px 15px; border-radius: 8px 8px 0 0; }
    .qa-header .q-number { font-weight: bold; color: #1a365d; }
    .qa-header .q-type { font-size: 12px; color: #666; margin-left: 10px; }
    .qa-content { border: 1px solid #e2e8f0; border-top: none; padding: 15px; border-radius: 0 0 8px 8px; }
    .question { font-weight: bold; color: #1a365d; margin-bottom: 15px; font-size: 16px; }
    .answer-section { margin-bottom: 15px; }
    .section-title { font-size: 12px; color: #666; margin-bottom: 5px; font-weight: bold; }
    .answer-text { background: #f1f5f9; padding: 10px; border-radius: 4px; font-size: 14px; }
    .feedback-box { background: #f0fdf4; border: 1px solid #86efac; padding: 10px; border-radius: 4px; margin-bottom: 10px; }
    .strengths { background: #f0fdf4; border-left: 3px solid #22c55e; }
    .improvements { background: #fef2f2; border-left: 3px solid #ef4444; }
    .suggested { background: #eff6ff; border-left: 3px solid #3b82f6; }
    .score-badge { display: inline-block; background: #1a365d; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #666; font-size: 12px; }
    @media print { body { padding: 20px; } .qa-section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 AI 면접 연습 결과</h1>
    <p class="subtitle">${escapeHtml(profile?.targetCompany || '미지정')} | ${escapeHtml(profile?.targetPosition || '미지정')}</p>
    <p class="subtitle">${formatDate(new Date())}</p>
  </div>

  <div class="summary">
    <div class="summary-grid">
      <div><div class="summary-label">지원 회사</div><div class="summary-value">${escapeHtml(profile?.targetCompany || '미지정')}</div></div>
      <div><div class="summary-label">지원 직무</div><div class="summary-value">${escapeHtml(profile?.targetPosition || '미지정')}</div></div>
      <div><div class="summary-label">총 질문 수</div><div class="summary-value">${qas.length}개</div></div>
      <div><div class="summary-label">답변 준비도</div><div class="summary-value">${passRate !== null ? passRate + '점' : '-'}</div></div>
    </div>
  </div>

  <div class="score-box">
    <div class="score">${avgScore}점</div>
    <div class="grade">${getScoreGrade(avgScore)}</div>
  </div>

  ${balanceAnalysis ? `
  <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 30px;">
    <h3 style="color: #92400e; margin-bottom: 10px;">📊 답변 밸런스 분석</h3>
    <p>인성/가치관: ${balanceAnalysis.personality}점 | 경험/성과: ${balanceAnalysis.experience}점 | 기술/전문성: ${balanceAnalysis.technical}점 | 상황 대처: ${balanceAnalysis.situational}점 | 기업 이해도: ${balanceAnalysis.company}점</p>
  </div>
  ` : ''}

  <h2 style="margin-bottom: 20px; color: #1a365d;">📋 질문별 상세 결과</h2>

  ${qas.map((qa, index) => `
  <div class="qa-section">
    <div class="qa-header">
      <span class="q-number">Q${index + 1}</span>
      <span class="q-type">${getQuestionTypeLabel(qa.questionType)}</span>
      ${qa.score !== null ? `<span class="score-badge" style="float: right;">${qa.score}점</span>` : ''}
    </div>
    <div class="qa-content">
      <div class="question">${escapeHtmlWithBreaks(qa.question)}</div>
      
      ${qa.userAnswer ? `
      <div class="answer-section">
        <div class="section-title">💬 내 답변</div>
        <div class="answer-text">${escapeHtmlWithBreaks(qa.userAnswer)}</div>
      </div>
      ` : ''}
      
      ${qa.feedback ? `
      <div class="answer-section feedback-box">
        <div class="section-title">🤖 AI 피드백</div>
        <p>${escapeHtmlWithBreaks(qa.feedback)}</p>
      </div>
      ` : ''}
      
      ${qa.strengths ? `
      <div class="answer-section feedback-box strengths">
        <div class="section-title">✅ 강점</div>
        <p>${escapeHtmlWithBreaks(qa.strengths)}</p>
      </div>
      ` : ''}
      
      ${qa.improvements ? `
      <div class="answer-section feedback-box improvements">
        <div class="section-title">⚠️ 개선점</div>
        <p>${escapeHtmlWithBreaks(qa.improvements)}</p>
      </div>
      ` : ''}
      
      ${qa.suggestedAnswer ? `
      <div class="answer-section feedback-box suggested">
        <div class="section-title">💡 내 답변을 고친 예시</div>
        <p>${escapeHtmlWithBreaks(qa.suggestedAnswer)}</p>
      </div>
      ` : ''}
      
      ${qa.followUpQuestions && qa.followUpQuestions.length > 0 ? `
      <div class="answer-section" style="background: #faf5ff; border-left: 3px solid #a855f7; padding: 10px; border-radius: 4px;">
        <div class="section-title">🔗 후속 질문 (예상 꼬리 질문)</div>
        <ul style="margin: 5px 0 0 15px; font-size: 13px;">
          ${qa.followUpQuestions.map((fq: string) => `<li>${escapeHtmlWithBreaks(fq)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${qa.keywords && qa.keywords.length > 0 ? `
      <div class="answer-section" style="background: #f0fdfa; border-left: 3px solid #14b8a6; padding: 10px; border-radius: 4px;">
        <div class="section-title">🎯 핵심 키워드</div>
        <p style="font-size: 13px;">${escapeHtml(qa.keywords.join(', '))}</p>
      </div>
      ` : ''}
      
      ${qa.scoreDetails ? `
      <div class="answer-section" style="background: #fef3c7; border-left: 3px solid #f59e0b; padding: 10px; border-radius: 4px;">
        <div class="section-title">📊 점수 세부 분석</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px; margin-top: 5px;">
          <div>논리성: ${qa.scoreDetails.logic || 0}점</div>
          <div>구체성: ${qa.scoreDetails.specificity || 0}점</div>
          <div>직무 관련성: ${qa.scoreDetails.relevance || 0}점</div>
          <div>전달력: ${qa.scoreDetails.communication || 0}점</div>
        </div>
      </div>
      ` : ''}
    </div>
  </div>
  `).join('')}

  <div class="footer">
    <p>이 문서는 다음 면접 코치에서 생성되었습니다.</p>
    <p>생성일: ${formatDate(new Date())}</p>
  </div>
</body>
</html>
    `;

    // HTML을 Blob으로 변환하여 다운로드
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // 새 창에서 HTML 열기
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      // 페이지 로드 완료 후 인쇄 다이얼로그 열기
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };
    } else {
      // 팝업 차단 시 HTML 파일로 다운로드
      const a = document.createElement('a');
      a.href = url;
      a.download = `면접결과_${profile?.targetCompany || '미지정'}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.info('HTML 파일이 다운로드되었습니다. 브라우저에서 열어 PDF로 저장하세요.');
      URL.revokeObjectURL(url);
      return;
    }
    
    toast.success('인쇄 다이얼로그에서 "PDF로 저장"을 선택하세요!');
  };

  // 사설 자연 음성 서버에서 면접 질문을 일회성으로 생성합니다.
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [ttsProviderStatus, setTtsProviderStatus] = useState<'idle' | 'loading' | 'supertonic2' | 'text'>('idle');
  const [audioContextActivated, setAudioContextActivated] = useState(false);
  const [showVoiceTestDialog, setShowVoiceTestDialog] = useState(false);
  const [voiceTestPassed, setVoiceTestPassed] = useState(false);

  const generateTTSMutation = trpc.tts.generate.useMutation();
  

  

  
  // 오디오 컨텍스트 활성화 함수 (사용자 인터랙션 필요)
  const activateAudioContext = async () => {
    if (audioContextActivated) return true;
    
    try {
      // 더미 오디오 재생으로 autoplay 정책 우회
      const dummyAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      await dummyAudio.play();
      dummyAudio.pause();
      setAudioContextActivated(true);
      console.log('[AudioContext] 활성화 성공');
      return true;
    } catch (error) {
      console.error('[AudioContext] 활성화 실패:', error);
      return false;
    }
  };
  
  function startAnswerTimer(question: string) {
    if (!timerEnabled || statusRef.current !== "answering") return;
    const duration = autoTimerEnabled ? getAutoTimerDuration(question) : timerDuration;
    setTimeRemaining(duration);
    setTimerActive(true);
    setTimerOvertime(false);
    setOvertimeSeconds(0);
  }

  const speakQuestion = async (text: string, startAnswerAfterPlayback = false) => {
    if (!ttsEnabled || !voiceMode) return;
    
    // 이전 오디오 중지
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    setIsTTSLoading(true);
    setTtsProviderStatus('loading');
    setIsSpeaking(true);
    
    // 사설 자연 음성 생성 시도
    try {
      // 아바타별 voiceStyle 반영
      const avatarVoiceStyle = selectedAvatar.voiceStyle;
      
      // 속도 계산: 아바타 설정 * 사용자 설정 배율
      const rate = avatarVoiceStyle.rate * ttsSpeed;
      // 자연 음성 속도 형식으로 변환 (0.5 ~ 2.0 → -50% ~ +100%)
      const ratePercent = Math.round((rate - 1.0) * 100);
      const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
      
      // 음높이 계산: 아바타 설정 반영
      const pitch = Math.max(0.5, Math.min(2.0, avatarVoiceStyle.pitch));
      // 자연 음성 높이 형식으로 변환 (0.5 ~ 2.0 → -50Hz ~ +50Hz)
      const pitchHz = Math.round((pitch - 1.0) * 50);
      const pitchStr = pitchHz >= 0 ? `+${pitchHz}Hz` : `${pitchHz}Hz`;
      
      console.log('[TTS] 아바타 음성 설정:', {
        avatar: selectedAvatar.name,
        voiceType: selectedAvatar.voiceType,
        rate: rateStr,
        pitch: pitchStr,
        volume: avatarVoiceStyle.volume,
        tone: avatarVoiceStyle.tone
      });
      
      // 서버 TTS API 호출
      const result = await generateTTSMutation.mutateAsync({
        text,
        voiceType: selectedAvatar.voiceType,
        rate: rateStr,
        pitch: pitchStr,
      });
      
      setTtsProviderStatus('supertonic2');

      // 오디오 재생
      const audio = new Audio(result.audioUrl);
      audio.volume = avatarVoiceStyle.volume;
      setCurrentAudio(audio);
      
      audio.onended = async () => {
        console.log('[TTS] 자연 음성 재생 완료');
        setIsSpeaking(false);
        
        // AI 음성 완료 후 타이머 시작
        if (startAnswerAfterPlayback) startAnswerTimer(text);
        
        // 음성 면접 안내 메시지
        if (voiceMode) {
          if (recordingMode === "automatic") {
            toast.info('질문 읽기 완료! 자동으로 녹음을 시작합니다.', { duration: 2000 });
            if (autoRecordTimeoutRef.current) clearTimeout(autoRecordTimeoutRef.current);
            autoRecordTimeoutRef.current = window.setTimeout(() => {
              autoRecordTimeoutRef.current = null;
              if (statusRef.current === "answering") void startRecording();
            }, 500);
          } else {
            toast.info('질문 읽기 완료! 마이크 버튼을 눌러 답변해주세요.', { duration: 3000 });
          }
        }
      };
      
      audio.onerror = (event) => {
        console.error('[TTS] 음성 재생 오류:', event);
        toast.error('음성 재생 중 오류가 발생했습니다.');
        setIsSpeaking(false);
        setIsTTSLoading(false);
        if (startAnswerAfterPlayback) startAnswerTimer(text);
      };
      
      // autoplay 정책 대응: 오디오 컨텍스트 활성화 확인
      if (!audioContextActivated) {
        const activated = await activateAudioContext();
        if (!activated) {
          throw new Error('오디오 컨텍스트 활성화 실패');
        }
      }
      
      await audio.play();
      setIsTTSLoading(false);
    } catch (error: any) {
      console.error("[TTS] NATURAL_VOICE_UNAVAILABLE", {
        message: error?.message || "TTS_UNAVAILABLE",
      });

      logTTSErrorMutation.mutate({
        errorMessage: error?.message || "TTS_UNAVAILABLE",
        errorType: "natural_tts_failure",
        voiceType: selectedAvatar.voiceType,
        sessionId: sessionId || undefined,
      });

      // 기기 합성음은 음질 편차가 커서 사용하지 않습니다. 질문은 화면에 유지합니다.
      setTtsProviderStatus("text");
      setIsSpeaking(false);
      setIsTTSLoading(false);
      toast.info("질문을 화면에서 확인해주세요. 기기 합성음은 재생하지 않습니다.", {
        duration: 3000,
      });

      if (startAnswerAfterPlayback) startAnswerTimer(text);

      if (voiceMode && recordingMode === "automatic") {
        const readingDelay = Math.max(2500, Math.min(9000, text.length * 110));
        if (autoRecordTimeoutRef.current) clearTimeout(autoRecordTimeoutRef.current);
        autoRecordTimeoutRef.current = window.setTimeout(() => {
          autoRecordTimeoutRef.current = null;
          if (statusRef.current === "answering") void startRecording();
        }, readingDelay);
      }
    }
  };

  // TTS 중지 함수
  const stopSpeaking = () => {
    if (autoRecordTimeoutRef.current) {
      clearTimeout(autoRecordTimeoutRef.current);
      autoRecordTimeoutRef.current = null;
    }
    if (currentAudio) {
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  // voiceMode 변경 시 localStorage에 저장
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("interviewVoiceMode", String(voiceMode));
    }
  }, [voiceMode]);

  // 음성 설정 저장 (TTS 속도, 톤, 음성 유형, 음높이)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const voiceSettings = {
        enabled: voiceMode,
        ttsSpeed,
        ttsTone,
        ttsVoiceType,
        customPitch,
      };
      localStorage.setItem("interviewVoiceSettings", JSON.stringify(voiceSettings));
    }
  }, [voiceMode, ttsSpeed, ttsTone, ttsVoiceType, customPitch]);

  // 페이지 이탈 시 면접 중단 처리
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status !== 'idle' && status !== 'completed') {
        listeningRequestedRef.current = false;
        if (recognitionRestartTimerRef.current) {
          window.clearTimeout(recognitionRestartTimerRef.current);
          recognitionRestartTimerRef.current = null;
        }
        if (speechRecognition) {
          speechRecognition.stop();
        }
        // 확인 다이얼로그 표시
        e.preventDefault();
        e.returnValue = '면접이 진행 중입니다. 정말 나가시겠습니까?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 컴포넌트 언마운트 시 마이크 생애주기를 완전히 정리합니다.
      listeningRequestedRef.current = false;
      if (recognitionRestartTimerRef.current) {
        window.clearTimeout(recognitionRestartTimerRef.current);
        recognitionRestartTimerRef.current = null;
      }
      if (speechRecognition) {
        speechRecognition.stop();
      }
      if (autoRecordTimeoutRef.current) {
        clearTimeout(autoRecordTimeoutRef.current);
        autoRecordTimeoutRef.current = null;
      }
      releaseRecordingResources(true);
    };
  }, [status, speechRecognition, releaseRecordingResources]);  // 타이머 카운트다운
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // 시간 초과 모드로 전환 - 답변은 계속 가능
            setTimerOvertime(true);
            toast.warning("권장 시간이 종료되었습니다", {
              description: "답변을 계속할 수 있지만, 간결하게 마무리하세요."
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }    
    // 초과 시간 카운트
    if (timerOvertime && status === 'answering') {
      interval = setInterval(() => {
        setOvertimeSeconds(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeRemaining, isRecording, voiceMode, status]);

  // 실시간 피드백: 침묵 감지 (음성 면접 모드에서만)
  useEffect(() => {
    let silenceInterval: NodeJS.Timeout | null = null;
    
    if (voiceMode && isListening && status === 'answering') {
      silenceInterval = setInterval(() => {
        if (lastSpeechTime) {
          const silenceDuration = Math.floor((Date.now() - lastSpeechTime) / 1000);
          setSilenceTimer(silenceDuration);
          
          // 5초 이상 침묵 시 경고
          if (silenceDuration >= 5 && !showSilenceWarning) {
            setShowSilenceWarning(true);
            toast.warning('음성이 감지되지 않습니다', {
              description: '마이크에 대고 답변을 계속해주세요.',
              duration: 3000
            });
          }
          
          // 10초 이상 침묵 시 추가 경고
          if (silenceDuration >= 10 && silenceDuration % 5 === 0) {
            toast.error('장시간 침묵 중입니다', {
              description: '답변을 이어가시거나 다음 질문으로 넘어가세요.',
              duration: 3000
            });
          }
        }
      }, 1000);
    } else {
      // 음성 인식 중지 시 초기화
      setSilenceTimer(0);
      setShowSilenceWarning(false);
    }
    
    return () => {
      if (silenceInterval) clearInterval(silenceInterval);
    };
  }, [voiceMode, isListening, status, lastSpeechTime, showSilenceWarning]);

  // 질문 유형에 따른 자동 타이머 설정 함수
  function getAutoTimerDuration(question: string): number {
    // 질문 내용을 분석하여 유형 파악 - 실제 면접 기준 최적화
    const questionLower = question.toLowerCase();
    
    // 인적사항/이력서 기반 질문 (10초 내외)
    if (questionLower.includes('이름') || questionLower.includes('나이') || questionLower.includes('연령') ||
        questionLower.includes('주소') || questionLower.includes('거주') || questionLower.includes('출신') ||
        questionLower.includes('연봉') || questionLower.includes('급여') || questionLower.includes('희망연봉') ||
        questionLower.includes('결혼') || questionLower.includes('병역') || questionLower.includes('가족')) {
      return questionTypeTimers['인적사항'].seconds;
    }
    
    // 자기소개 (60초)
    if (questionLower.includes('자기소개') || questionLower.includes('소개해')) {
      return questionTypeTimers['자기소개'].seconds;
    }
    
    // 지원동기 (40초)
    if (questionLower.includes('지원') && (questionLower.includes('동기') || questionLower.includes('이유'))) {
      return questionTypeTimers['지원동기'].seconds;
    }
    
    // 장단점 (30초)
    if (questionLower.includes('장점') || questionLower.includes('단점')) {
      return questionTypeTimers['장단점'].seconds;
    }
    
    // 전공/자격증/학과 관련 (20초 내외)
    if (questionLower.includes('전공') || questionLower.includes('학과') || questionLower.includes('자격증') ||
        questionLower.includes('자격') || questionLower.includes('학위') || questionLower.includes('전문성')) {
      return questionTypeTimers['학과/전공'].seconds;
    }
    
    // 기술/직무 관련 (20초 내외)
    if (questionLower.includes('기술') || questionLower.includes('설계') || questionLower.includes('개발') ||
        questionLower.includes('프로그래밍') || questionLower.includes('언어') || questionLower.includes('툴')) {
      return questionTypeTimers['기술/전문'].seconds;
    }
    
    // 회사/직무 이해 (20초)
    if (questionLower.includes('회사') || questionLower.includes('직무') || questionLower.includes('업무') ||
        questionLower.includes('업계') || questionLower.includes('동향') || questionLower.includes('트렌드')) {
      return questionTypeTimers['회사/직무이해'].seconds;
    }
    
    // 경험담/성과 관련 (30~40초)
    if (questionLower.includes('경험') || questionLower.includes('역량') || questionLower.includes('성과') ||
        questionLower.includes('프로젝트') || questionLower.includes('성공') || questionLower.includes('실패')) {
      return questionTypeTimers['경험/역량'].seconds;
    }
    
    // 상황/문제해결 (40초)
    if (questionLower.includes('상황') || questionLower.includes('문제') || questionLower.includes('해결') || questionLower.includes('대처')) {
      return questionTypeTimers['상황/문제해결'].seconds;
    }
    
    // 인성/성격 (30초)
    if (questionLower.includes('성격') || questionLower.includes('인성') || questionLower.includes('가치관')) {
      return questionTypeTimers['인성/성격'].seconds;
    }
    
    // 입사 후 계획 (30초)
    if (questionLower.includes('입사') && questionLower.includes('후')) {
      return questionTypeTimers['입사 후 계획'].seconds;
    }
    
    // 팀워크/협업 (40초)
    if (questionLower.includes('팀') || questionLower.includes('협업') || questionLower.includes('협력')) {
      return questionTypeTimers['팝워크/협업'].seconds;
    }
    
    // 리더십 (40초)
    if (questionLower.includes('리더') || questionLower.includes('이끌')) {
      return questionTypeTimers['리더십'].seconds;
    }
    
    // 스트레스/위기관리 (30초)
    if (questionLower.includes('스트레스') || questionLower.includes('위기') || questionLower.includes('압박')) {
      return questionTypeTimers['스트레스/위기관리'].seconds;
    }
    
    // 창의성/혁신 (40초)
    if (questionLower.includes('창의') || questionLower.includes('혁신') || questionLower.includes('아이디어')) {
      return questionTypeTimers['창의성/혁신'].seconds;
    }
    
    // 기본값 (30초)
    return questionTypeTimers['기타'].seconds;
  }

  const startMutation = trpc.interview.start.useMutation({
    onSuccess: (data) => {
      incrementUsageMutation.mutate({
        sessionId: sessionTrackingId,
        featureType: voiceMode ? "voice_interview" : "text_interview",
      });
      setSessionId(data.id);
      setTotalQuestions(data.totalQuestions || totalQuestions);
      setStatus("in_progress");
      generateQuestion(data.id, 0);
    },
    onError: (error) => {
      console.error("[startInterview] 면접 시작 실패:", error);
      toast.error("면접을 시작하지 못했습니다. 설정을 확인하고 다시 시도해주세요.");
      setStatus("idle");
      setSetupStep(6);
    },
  });

  const generateMutation = trpc.interview.generateQuestion.useMutation({
    onSuccess: (data, variables) => {
      if (
        expectedQuestionOrderRef.current !== data.questionOrder ||
        expectedQuestionSessionRef.current !== variables.sessionId
      ) return;
      expectedQuestionOrderRef.current = null;
      expectedQuestionSessionRef.current = null;
      if (questionGenerationTimeoutRef.current) {
        clearTimeout(questionGenerationTimeoutRef.current);
        questionGenerationTimeoutRef.current = null;
      }
      setQuestionGenerationError(null);
      const qa: QAItem = {
        id: data.id,
        question: data.question,
        questionType: data.questionType || "personality",
        phaseId: data.phaseId,
        phaseLabel: data.phaseLabel,
        timingInfo: data.timingInfo,
      };
      setCurrentQA(qa);
      statusRef.current = "answering";
      setStatus("answering");
      
      // 실제 답변 시간은 녹음 시작 또는 첫 텍스트 입력부터 측정합니다.
      setAnswerStartTime(null);
      
      // 음성 모드: 바로 TTS 재생
      if (voiceMode && ttsEnabled) {
        void speakQuestion(data.question, true);
      } else {
        startAnswerTimer(data.question);
      }
    },
    onError: (error, variables) => {
      if (
        expectedQuestionOrderRef.current !== variables.questionOrder ||
        expectedQuestionSessionRef.current !== variables.sessionId
      ) return;
      expectedQuestionOrderRef.current = null;
      expectedQuestionSessionRef.current = null;
      if (questionGenerationTimeoutRef.current) {
        clearTimeout(questionGenerationTimeoutRef.current);
        questionGenerationTimeoutRef.current = null;
      }
      console.error("[generateQuestion] 질문 생성 실패:", error);
      setQuestionGenerationError(getQuestionRecoveryMessage(false));
      setStatus(currentQA ? "feedback" : "in_progress");
    },
  });

  const logTTSErrorMutation = trpc.ttsMonitoring.logError.useMutation();
  
  const submitMutation = trpc.interview.submitAnswer.useMutation({
    onSuccess: (data) => {
      const updatedQA: QAItem = {
        ...currentQA!,
        userAnswer: data.userAnswer,
        feedback: data.feedback,
        score: data.score,
        rubricScores: data.rubricScores,
        strengths: data.strengths,
        improvements: data.improvements,
        suggestedAnswer: data.suggestedAnswer,
        suggestedAnswerShort: data.suggestedAnswerShort,
        suggestedAnswerLong: data.suggestedAnswerLong,
        improvementGuide: data.improvementGuide,
        feedbackPerspective: data.feedbackPerspective,
        followUpQuestions: data.followUpQuestions || [],
      };
      setCurrentQA(updatedQA);
      setQas(prev => [...prev, updatedQA]);
      // 성공적으로 피드백을 받은 뒤에만 입력 내용을 비워 오류 재시도를 안전하게 합니다.
      setAnswer("");
      setInterimTranscript("");
      setAnswerStartTime(null);
      setStatus("feedback");
      // 아바타 감정 업데이트 (점수에 따라)
      if (data.score) {
        setAvatarEmotion(getEmotionByScore(data.score));
      }
      
      // 교정 답변은 사용자가 읽고 직접 다음 질문 또는 후속 질문을 선택할 때까지 유지합니다.
    },
    onError: (error) => {
      console.error('[submitAnswer] 오류 발생:', error);
      toast.error("답변 제출 실패: " + error.message);
      setStatus("answering");
    },
  });

  const completeMutation = trpc.interview.complete.useMutation({
    onSuccess: (data) => {
      setStatus("completed");
      setPassRate(data.session?.passRate ?? null);
      
      // balanceAnalysis 안전하게 파싱
      let parsedBalanceAnalysis: BalanceAnalysis | null = null;
      if (data.session?.balanceAnalysis) {
        if (typeof data.session.balanceAnalysis === 'string') {
          try {
            parsedBalanceAnalysis = JSON.parse(data.session.balanceAnalysis);
          } catch (e) {
            console.error('balanceAnalysis 파싱 실패:', e);
          }
        } else {
          parsedBalanceAnalysis = data.session.balanceAnalysis as BalanceAnalysis;
        }
      }
      setBalanceAnalysis(parsedBalanceAnalysis);
      
      toast.success("면접이 완료되었습니다!");
      
      // 후기 작성 유도 팝업 표시 (로컬 스토리지로 오늘 하루 보지 않기 처리)
      const today = new Date().toDateString();
      const lastShown = localStorage.getItem('reviewIncentiveLastShown');
      if (lastShown !== today) {
        setTimeout(() => {
          setShowReviewIncentive(true);
          localStorage.setItem('reviewIncentiveLastShown', today);
        }, 2000); // 2초 후 표시
      }
    },
    onError: (error) => {
      toast.error("면접 완료 처리 실패: " + error.message);
    },
  });

  // 공유 링크 상태
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  
  // 후기 작성 유도 팝업 상태
  const [showReviewIncentive, setShowReviewIncentive] = useState(false);

  // 질문 공유 mutation
  const shareQuestionsMutation = trpc.sharedQuestions.create.useMutation({
    onSuccess: (data) => {
      console.log('[shareQuestionsMutation] onSuccess 호출됨, data:', data);
      const shareUrl = `${window.location.origin}/shared/${data.shareCode}`;
      console.log('[shareQuestionsMutation] shareUrl:', shareUrl);
      
      // 클립보드에 복사
      navigator.clipboard.writeText(shareUrl).then(() => {
        console.log('[shareQuestionsMutation] 클립보드 복사 성공');
      }).catch((err) => {
        console.log('[shareQuestionsMutation] 클립보드 복사 실패:', err);
      });
      
      // 모달 상태 업데이트
      setGeneratedShareUrl(shareUrl);
      setShowShareLinkModal(true);
      setShowQuestionShareModal(false);
      
      // 인라인 알림으로 대체됨 - generatedShareUrl 상태가 설정되면 UI에 표시됨
      toast.success('공유 링크가 생성되었습니다!');
    },
    onError: (error) => {
      console.error('[shareQuestionsMutation] onError 호출됨:', error);
      toast.error("공유 링크 생성 실패: " + error.message);
    },
  });

  // 답변 수정 평가 mutation
  const reviseAnswerMutation = trpc.interview.reviseAnswer.useMutation({
    onSuccess: (data) => {
      setRevisionResult({
        score: data.score,
        feedback: data.feedback,
        improvements: data.improvements,
        remainingIssues: data.remainingIssues,
        originalScore: currentQA?.score || 0,
      });
      setShowRevisionResult(true);
      setIsRevising(false);
      toast.success("수정된 답변 평가가 완료되었습니다!");
    },
    onError: (error) => {
      toast.error("답변 평가 실패: " + error.message);
    },
  });

  const generateQuestion = (sid: number, index: number) => {
    if (questionGenerationTimeoutRef.current) {
      clearTimeout(questionGenerationTimeoutRef.current);
    }
    const requestId = ++questionGenerationRequestRef.current;
    expectedQuestionOrderRef.current = index;
    expectedQuestionSessionRef.current = sid;
    setQuestionGenerationError(null);
    if (!currentQA) setStatus("in_progress");
    questionGenerationTimeoutRef.current = setTimeout(() => {
      if (requestId !== questionGenerationRequestRef.current) return;
      generateMutation.reset();
      expectedQuestionOrderRef.current = null;
      expectedQuestionSessionRef.current = null;
      setQuestionGenerationError(getQuestionRecoveryMessage(true));
      setStatus(currentQA ? "feedback" : "in_progress");
    }, 15000);

    generateMutation.mutate({
      sessionId: sid,
      questionOrder: index,
      avatarSpeechStyle: {
        formality: selectedAvatar.speechStyle.formality,
        questionStyle: selectedAvatar.speechStyle.questionStyle,
        feedbackStyle: selectedAvatar.speechStyle.feedbackStyle,
        promptStyle: selectedAvatar.speechStyle.promptStyle,
      },
    });
  };

  const moveSetupStep = (direction: 1 | -1) => {
    setSetupStep((previous) => moveInterviewSetupStep(previous, direction));
  };

  const saveSupportInfoAndContinue = async () => {
    const company = wizardCompany.trim();
    const position = wizardPosition.trim();
    const resume = wizardResume.trim();
    const coverLetter = wizardCoverLetter.trim();
    const hasCompleteTarget = Boolean(company && position);
    const hasDocuments = Boolean(resume || coverLetter);

    if ((company || position) && !hasCompleteTarget) {
      toast.error("회사와 직무는 둘 다 입력하거나 둘 다 비워주세요.");
      return;
    }
    if (!hasDocuments && !hasCompleteTarget) {
      toast.error("이력서·자기소개서를 붙여넣거나 회사와 직무를 입력해주세요.");
      return;
    }

    await profileUpsertMutation.mutateAsync({
      targetCompany: company || undefined,
      targetPosition: position || undefined,
      resume: resume || undefined,
      coverLetter: coverLetter || undefined,
      experience: profile?.experience || undefined,
      education: profile?.education || undefined,
      skills: profile?.skills || undefined,
    });
    moveSetupStep(1);
  };

  const handleStart = async () => {
    const canStart = canContinueInterviewWizard({
      company: wizardCompany,
      position: wizardPosition,
      hasProfileMaterial: Boolean(wizardResume.trim() || wizardCoverLetter.trim()),
    });
    if (!canStart) {
      toast.error("이력서·자기소개서를 붙여넣거나 회사와 직무를 모두 입력해주세요.");
      setSetupStep(1);
      return;
    }

    setQuestionGenerationError(null);
    setQuestionIndex(0);
    setFollowUpCount(0);
    setCurrentQA(null);
    setQas([]);
    setAnswer("");
    setRecordedAudioUrl(null);
    startInterview();
  };
  
  // 실제 면접 시작 함수
  const startInterview = async () => {
    // 음성 모드일 때 오디오 컨텍스트 활성화 (autoplay 정책 대응)
    if (voiceMode) {
      const activated = await activateAudioContext();
      if (!activated) {
        toast.warning('자동 음성 재생이 제한되었습니다. 질문 화면에서 다시 듣기를 눌러주세요.', { duration: 3500 });
      } else {
        toast.success('음성 시스템 준비 완료!', { duration: 2000 });
      }
    }

    // 사용 횟수 체크 및 가입 유도 (구독이 없고 쿠폰 무료 시간도 없는 경우만)
    if (!subscription && !hasCouponFreeTime && usageCheckQuery.data) {
      const { shouldPrompt, reason, voiceCount } = usageCheckQuery.data;
      // 음성 모드일 때: 음성 사용 횟수 체크 (1회 무료)
      if (voiceMode && voiceCount >= 1) {
        setUsageLimitReason("voice_limit");
        setShowUsageLimitModal(true);
        return;
      }
      // 텍스트 모드일 때: 일반 사용 횟수 체크
      if (!voiceMode && reason === "usage_limit" && shouldPrompt) {
        setUsageLimitReason("usage_limit");
        setShowUsageLimitModal(true);
        return;
      }
    }

    setStatus("starting");
    startMutation.mutate({
      sessionType: voiceMode ? "voice_interview" : "mock_interview",
      totalQuestions,
      isVoiceMode: voiceMode,
      selectedQuestions: selectedQuestions.length > 0 ? selectedQuestions : undefined,
      planMode,
    });
  };

  const handleSubmitAnswer = () => {
    if (!answer.trim()) {
      toast.error("답변을 입력해주세요");
      return;
    }
    if (!currentQA) return;
    setTimerActive(false);
    setTimerOvertime(false);
    
    // 답변 시간 계산
    let duration = 0;
    if (answerStartTime) {
      duration = Math.round((Date.now() - answerStartTime) / 1000);
      setQaAnswerDurations(prev => ({ ...prev, [currentQA.id]: duration }));
    }
    
    // 피드백 생성 중에도 카메라 스트림을 유지해 모바일 장치 재획득 경합을 막습니다.
    
    // 후속 질문인지 확인
    const isFollowUp = currentQA.questionType === 'follow_up';
    
    submitMutation.mutate({
      qaId: isFollowUp ? currentQA.parentQaId ?? currentQA.id : currentQA.id,
      answer: answer.trim(),
      avatarSpeechStyle: {
        formality: selectedAvatar.speechStyle.formality,
        questionStyle: selectedAvatar.speechStyle.questionStyle,
        feedbackStyle: selectedAvatar.speechStyle.feedbackStyle,
        promptStyle: selectedAvatar.speechStyle.promptStyle,
      },
      followUpDifficulty: followUpDifficulty,
      // 후속 질문용 추가 필드
      isFollowUp: isFollowUp,
      followUpQuestion: isFollowUp ? currentQA.question : undefined,
      sessionId: sessionId || undefined,
      answerDuration: duration,
    });
  };

  const handleNextQuestion = () => {
    const nextIndex = questionIndex + 1;
    if (nextIndex >= totalQuestions) {
      if (sessionId) {
        completeMutation.mutate({ sessionId });
      }
    } else {
      setQuestionIndex(nextIndex);
      setAnswer("");
      setRecordedAudioUrl(null);
      setQuestionGenerationError(null);
      if (sessionId) {
        generateQuestion(sessionId, nextIndex);
      }
    }
  };

  const handleStartFollowUp = () => {
    const followUpQuestion = currentQA?.followUpQuestions?.[0];
    if (!currentQA || currentQA.questionType === "follow_up" || followUpCount > 0 || !followUpQuestion) return;

    setCurrentQA({
      id: Date.now(),
      question: followUpQuestion,
      questionType: "follow_up",
      parentQaId: currentQA.id,
    });
    setAnswer("");
    setRecordedAudioUrl(null);
    setAnswerStartTime(null);
    setFollowUpCount(1);
    statusRef.current = "answering";
    setStatus("answering");
    if (voiceMode && ttsEnabled) void speakQuestion(followUpQuestion, true);
    else startAnswerTimer(followUpQuestion);
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      personality: "인성/성격",
      experience: "경험/역량",
      technical: "기술/전문성",
      situational: "상황대처",
      company: "회사/직무 이해",
    };
    return labels[type] || type;
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // 시작 전 화면
  if (status === "idle") {
    const setupLabels = INTERVIEW_SETUP_LABELS;
    const hasProfileMaterial = Boolean(wizardResume.trim() || wizardCoverLetter.trim());
    const canMoveFromProfile = canContinueInterviewWizard({ company: wizardCompany, position: wizardPosition, hasProfileMaterial });
    const stepTitle = setupLabels[setupStep];

    if (setupStep >= 0) {
      return (
        <DashboardLayout>
          <div className={`${setupStep === 1 ? "max-w-5xl" : "max-w-xl"} mx-auto px-4 py-6 sm:py-10`}>
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">AI Mock Interview</p>
                <h1 className="mt-1 text-2xl font-bold">{stepTitle}</h1>
              </div>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setShowInterviewGuide(true)}>
                <AlertCircle className="w-4 h-4" /> 안내사항
              </Button>
            </div>

            <div className="mb-8 flex items-center gap-1.5" aria-label="면접 설정 진행률">
              {setupLabels.map((label, index) => (
                <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
                  <div className={`h-2 flex-1 rounded-full ${index <= setupStep ? "bg-primary" : "bg-muted"}`} />
                  {index === setupStep && <span className="hidden text-[11px] text-muted-foreground sm:inline">{index + 1}/{setupLabels.length}</span>}
                </div>
              ))}
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-5 sm:p-7">
                {setupStep === 0 && (
                  <div className="space-y-6 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                      <Brain className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">실제 면접처럼 차근차근 시작해볼까요?</h2>
                      <p className="text-sm leading-6 text-muted-foreground">한 번에 하나씩만 선택합니다. 입력한 내용은 다음 단계로 넘어갈 때 자동으로 유지됩니다.</p>
                    </div>
                    <div className="grid gap-3 text-left sm:grid-cols-3">
                      {[
                        ["01", "지원 정보", "이력서·자소서 기반"],
                        ["02", "면접관", "말투·음성 선택"],
                        ["03", "실전 진행", "질문·답변·피드백"],
                      ].map(([number, title, description]) => (
                        <div key={number} className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs font-semibold text-primary">{number}</p>
                          <p className="mt-1 text-sm font-medium">{title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                        </div>
                      ))}
                    </div>
                    <Button size="lg" className="w-full gap-2" onClick={() => moveSetupStep(1)}>
                      모의면접 시작 <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {setupStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-semibold">면접 질문의 기준을 입력해주세요</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">아래 두 방법 중 하나만 완료해도 시작할 수 있습니다: 이력서·자기소개서 붙여넣기 또는 회사+직무 입력.</p>
                    </div>
                    <div className="rounded-xl border p-4 space-y-4">
                      <div>
                        <p className="font-medium">방법 1. 지원 회사와 직무</p>
                        <p className="mt-1 text-xs text-muted-foreground">문서가 없어도 직무 핵심역량 중심 질문을 만듭니다.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="wizard-company">지원 회사</Label>
                          <Input id="wizard-company" value={wizardCompany} onChange={(event: ChangeEvent<HTMLInputElement>) => setWizardCompany(event.target.value)} placeholder="예: 삼성전자" autoComplete="organization" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wizard-position">지원 직무</Label>
                          <Input id="wizard-position" value={wizardPosition} onChange={(event: ChangeEvent<HTMLInputElement>) => setWizardPosition(event.target.value)} placeholder="예: 생산관리" autoComplete="organization-title" />
                        </div>
                      </div>
                    </div>
                    <DocumentIntakePanel
                      onResumeApply={setWizardResume}
                      onCoverLetterApply={setWizardCoverLetter}
                    />
                    <details className="rounded-xl border p-4">
                      <summary className="cursor-pointer font-medium">파일이 없으면 텍스트 직접 붙여넣기</summary>
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="wizard-resume">이력서 내용</Label>
                          <Textarea id="wizard-resume" value={wizardResume} onChange={(event) => setWizardResume(event.target.value)} placeholder="경력, 프로젝트, 역할, 성과를 붙여넣어 주세요." className="min-h-28" maxLength={12_000} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wizard-cover-letter">자기소개서 내용</Label>
                          <Textarea id="wizard-cover-letter" value={wizardCoverLetter} onChange={(event) => setWizardCoverLetter(event.target.value)} placeholder="지원 동기와 주요 경험을 붙여넣어 주세요." className="min-h-28" maxLength={12_000} />
                        </div>
                      </div>
                    </details>
                    <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                      {canMoveFromProfile ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                      {canMoveFromProfile ? "면접 질문을 만들 준비가 되었습니다." : "문서 하나를 붙여넣거나 회사와 직무를 모두 입력해주세요."}
                    </div>
                    <Button className="w-full" onClick={saveSupportInfoAndContinue} disabled={!canMoveFromProfile || profileUpsertMutation.isPending}>{profileUpsertMutation.isPending ? "저장 중..." : "지원 정보 저장 후 다음"}</Button>
                  </div>
                )}

                {setupStep === 2 && (
                  <div className="space-y-5">
                    <div><h2 className="text-xl font-semibold">면접 질문 순서</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">실제 구조화 면접 흐름을 따라 아래 순서로 진행합니다. 질문 수가 적으면 핵심 파트로 축약됩니다.</p></div>
                    <div className="grid gap-3">
                      {INTERVIEW_PHASES.map((phase, index) => (
                        <div key={phase.id} className="rounded-xl border bg-muted/20 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</div>
                            <div><p className="font-medium">{phase.label}</p><p className="mt-1 text-sm text-muted-foreground">{phase.purpose}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">사전 질문을 선택한 경우에도 전체 면접을 대체하지 않고 ‘사전 질문지’ 파트에 삽입됩니다.</p>
                    <Button className="w-full" onClick={() => moveSetupStep(1)}>질문 순서 확인 후 다음</Button>
                  </div>
                )}

                {setupStep === 3 && (
                  <div className="space-y-5">
                    <div><h2 className="text-xl font-semibold">어떤 방식으로 답변할까요?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">처음이라면 텍스트로 흐름을 익힌 뒤 음성 면접으로 전환해도 좋습니다.</p></div>
                    <div className="grid gap-3">
                      <button type="button" className={`rounded-xl border p-4 text-left ${!voiceMode ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => setVoiceMode(false)}><div className="flex items-center gap-3"><MessageSquare className="h-5 w-5 text-primary" /><div><p className="font-medium">텍스트 면접</p><p className="text-sm text-muted-foreground">질문을 읽고 답변을 입력합니다.</p></div></div></button>
                      <button type="button" className={`rounded-xl border p-4 text-left ${voiceMode ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => canUseVoiceMode && setVoiceMode(true)} disabled={!canUseVoiceMode}><div className="flex items-center gap-3"><Mic className="h-5 w-5 text-primary" /><div><p className="font-medium">음성 면접</p><p className="text-sm text-muted-foreground">면접관 음성을 듣고 녹음으로 답변합니다.</p></div></div></button>
                    </div>
                    {!canUseVoiceMode && <p className="text-xs text-muted-foreground">현재 음성 무료 이용이 끝났습니다. 텍스트 면접으로 계속 진행할 수 있습니다.</p>}
                    <Button className="w-full" onClick={() => moveSetupStep(1)}>면접 방식 저장 후 다음</Button>
                  </div>
                )}

                {setupStep === 4 && (
                  <div className="space-y-5">
                    <div><h2 className="text-xl font-semibold">면접관을 선택해주세요</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">말투와 음성이 선택한 면접관에 맞춰집니다. 음성은 시작 전 미리 들어볼 수 있습니다.</p></div>
                    <div className="flex justify-center"><AvatarSelector selectedAvatarId={selectedAvatar.id} onSelect={(avatar) => { setSelectedAvatar(avatar); setTtsVoiceType(avatar.voiceType); }} disabled={false} /></div>
                    <div className="rounded-lg bg-muted/40 p-4 text-sm"><p className="font-medium">현재 선택: {selectedAvatar.name}</p><p className="mt-1 text-muted-foreground">{selectedAvatar.speechStyle.promptStyle}</p></div>
                    <Button className="w-full" onClick={() => moveSetupStep(1)}>면접관 저장 후 다음</Button>
                  </div>
                )}

                {setupStep === 5 && (
                  <div className="space-y-5">
                    <div><h2 className="text-xl font-semibold">면접 분량과 녹음 방식을 정해주세요</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">질문 수와 답변 시간을 정합니다. 이력서·자소서 맞춤 질문은 면접 시작 후 한 개씩 생성됩니다.</p></div>
                    <div><p className="mb-2 text-sm font-medium">질문 수</p><div className="grid grid-cols-4 gap-2">{[3, 5, 8, 10].map((count) => <Button key={count} type="button" variant={totalQuestions === count ? "default" : "outline"} onClick={() => setTotalQuestions(count)}>{count}개</Button>)}</div><p className="mt-2 text-xs text-muted-foreground">3문항은 기본 크레딧으로 완주할 수 있고, 8문항은 전체 8개 파트를 한 번씩 연습합니다.</p></div>
                    <div><p className="mb-2 text-sm font-medium">질문당 답변 시간</p><div className="grid grid-cols-3 gap-2">{[60, 90, 120].map((seconds) => <Button key={seconds} type="button" variant={timerDuration === seconds ? "default" : "outline"} onClick={() => setTimerDuration(seconds)}>{seconds / 60}분</Button>)}</div></div>
                    {voiceMode && <>
                      <div><p className="mb-2 text-sm font-medium">녹음 방식</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" className={`rounded-lg border p-3 text-left ${recordingMode === "manual" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => setRecordingMode("manual")}><p className="font-medium">수동 녹음</p><p className="mt-1 text-xs text-muted-foreground">마이크 버튼을 눌러 시작·종료</p></button><button type="button" className={`rounded-lg border p-3 text-left ${recordingMode === "automatic" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => setRecordingMode("automatic")}><p className="font-medium">자동 녹음</p><p className="mt-1 text-xs text-muted-foreground">질문 뒤 자동 시작 · 답변 종료는 직접 선택</p></button></div></div>
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"><p className="text-sm font-medium">답변이 끝날 때까지 계속 듣습니다</p><p className="mt-1 text-xs text-muted-foreground">생각하는 동안 잠시 멈춰도 종료되지 않습니다. 답변 종료 버튼을 눌렀을 때만 글로 옮깁니다.</p></div>
                      <div>
                        <p className="mb-2 text-sm font-medium">면접관 음성 배속 선택</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[0.8, 1.0, 1.15, 1.3].map((speed) => (
                            <Button
                              key={speed}
                              type="button"
                              variant={ttsSpeed === speed ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTtsSpeed(speed)}
                            >
                              {speed}x
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>}
                    <Button className="w-full" onClick={() => moveSetupStep(1)}>시간·녹음 설정 저장 후 다음</Button>
                  </div>
                )}

                {setupStep === 6 && (
                  <div className="space-y-5">
                    <div><h2 className="text-xl font-semibold">준비가 끝났습니다</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">시작하기를 누르면 질문을 한 개씩 준비합니다. 질문이 늦어져도 재시도하거나 설정으로 돌아갈 수 있습니다.</p></div>
                    <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm"><p>지원 정보: <span className="font-medium">{wizardCompany} · {wizardPosition}</span></p><p>질문 흐름: <span className="font-medium">{planMode === "selected_only" ? "선택 질문 1개 재연습" : "구조화 면접 8단계"}</span></p><p>사전 질문: <span className="font-medium">{selectedQuestions.length}개</span></p><p>면접 방식: <span className="font-medium">{voiceMode ? "음성" : "텍스트"}</span></p><p>면접관: <span className="font-medium">{selectedAvatar.name}</span></p><p>기본 분량: <span className="font-medium">{totalQuestions}문항 · {timerDuration / 60}분</span></p>{voiceMode && <p>녹음: <span className="font-medium">{recordingMode === "automatic" ? "질문 뒤 자동 시작 · 직접 종료" : "직접 시작 · 직접 종료"}</span></p>}</div>
                    {voiceMode && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                          <div>
                            <Label htmlFor="camera-enabled" className="font-medium">카메라 셀프뷰</Label>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">프레이밍을 직접 확인하는 선택 기능입니다. 영상으로 감정이나 합격 가능성을 판단하지 않습니다.</p>
                          </div>
                          <Switch id="camera-enabled" checked={cameraEnabled} onCheckedChange={(checked) => { setCameraEnabled(checked); if (!checked) setMediaReady(false); }} />
                        </div>
                        {cameraEnabled && <InterviewMediaCheck onReadyChange={setMediaReady} />}
                      </div>
                    )}
                    <Button size="lg" className="min-h-12 w-full gap-2" onClick={handleStart} disabled={startMutation.isPending || (voiceMode && cameraEnabled && !mediaReady)}><Sparkles className="h-4 w-4" />{startMutation.isPending ? "면접을 준비하는 중..." : voiceMode && cameraEnabled && !mediaReady ? "장치 점검 후 시작" : "면접 시작하기"}</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-5 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setupStep === 0 ? setShowInterviewGuide(true) : (setSetupStep(0), setQuestionGenerationError(null))}>{setupStep === 0 ? "안내사항 보기" : "취소"}</Button>
              <div className="flex items-center gap-2">
                {setupStep > 0 && <Button variant="outline" onClick={() => moveSetupStep(-1)}>뒤로</Button>}
                {setupStep > 0 && <span className="hidden text-xs text-muted-foreground sm:inline">입력은 자동으로 유지됩니다</span>}
              </div>
            </div>

            <Dialog open={showInterviewGuide} onOpenChange={setShowInterviewGuide}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>모의면접 안내</DialogTitle><DialogDescription>실제 면접처럼 질문을 듣고 준비한 뒤 답변하는 흐름입니다.</DialogDescription></DialogHeader>
                <div className="space-y-3 text-sm leading-6"><p>이력서와 자기소개서가 있으면 회사·직무·경험을 반영한 질문을 생성합니다.</p><p>질문 생성이 지연되면 화면의 재시도 버튼을 사용하고, 계속 문제가 있으면 텍스트 질문으로 전환할 수 있습니다.</p><p>음성 모드에서는 질문 재생이 끝난 뒤에만 마이크가 답변을 받습니다.</p></div>
              </DialogContent>
            </Dialog>
          </div>
        </DashboardLayout>
      );
    }
  }

  // 질문 생성이 지연되거나 실패했을 때는 무한 로딩 대신 사용자가 다음 행동을 선택합니다.
  if (questionGenerationError) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-[400px] max-w-lg flex-col items-center justify-center px-4 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold">질문 준비가 잠시 지연되고 있습니다</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{questionGenerationError}</p>
          <div className="mt-6 grid w-full gap-2 sm:grid-cols-3">
            <Button
              onClick={() => sessionId ? generateQuestion(sessionId, questionIndex) : (setQuestionGenerationError(null), setStatus("idle"), setSetupStep(0))}
              disabled={generateMutation.isPending}
            >
              다시 시도
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setVoiceMode(false);
                if (sessionId) generateQuestion(sessionId, questionIndex);
              }}
              disabled={!sessionId || generateMutation.isPending}
            >
              텍스트로 진행
            </Button>
            <Button variant="ghost" onClick={() => { setQuestionGenerationError(null); setStatus("idle"); setSetupStep(0); }}>
              설정으로 돌아가기
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 로딩 화면은 제한된 시간 동안만 표시합니다. 지연 시 위의 복구 화면으로 전환됩니다.
  if (status === "starting" || (status === "in_progress" && !currentQA)) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 px-4 text-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-gold to-orange-500 animate-spin" style={{ animationDuration: "3s" }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white"><span className="text-2xl font-bold text-gold">AI</span></div>
            </div>
            <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-green-500"><Mic className="h-4 w-4 text-white" /></div>
          </div>
          <div><h2 className="text-xl font-bold">{status === "starting" ? "면접을 준비하고 있습니다" : "맞춤 질문을 준비하고 있습니다"}</h2><p className="mt-2 text-sm text-muted-foreground">이력서·자소서와 지원 직무를 확인하고 있습니다. 최대 15초 동안 기다립니다.</p></div>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-gold to-orange-500" /></div>
        </div>
      </DashboardLayout>
    );
  }

  // 답변 제출 후 사용자가 요청한 피드백을 생성하는 동안 현재 진행 상태를 순차 안내합니다.
  if (status === "in_progress" && submitMutation.isPending && currentQA) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">피드백을 준비하고 있습니다</CardTitle>
              <CardDescription className="leading-6">
                답변을 제출했습니다. 분석이 끝나면 점수와 개선 가이드를 바로 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-4 text-sm leading-6">
                <span className="font-semibold">질문:</span> {currentQA.question}
              </div>
              <AnalyzingLoader
                stepLabels={voiceMode
                  ? ["음성 분석 중", "답변 내용 분석 중", "내 답변을 고친 예시 생성 중", "피드백 정리 완료"]
                  : ["답변 분석 중", "핵심 내용 정리 중", "내 답변을 고친 예시 생성 중", "피드백 정리 완료"]}
                message="답변의 핵심 내용과 전달 방식을 분석하고 있습니다."
              />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // 완료 화면
  if (status === "completed") {
    const avgScore = qas.length > 0 
      ? Math.round(qas.reduce((sum, qa) => sum + (qa.score || 0), 0) / qas.length)
      : 0;

    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">면접 완료!</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              수고하셨습니다. 면접 결과를 확인해보세요.
            </p>
          </div>

          {/* 결과 요약 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  평균 점수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl sm:text-5xl font-bold text-primary">{avgScore}점</p>
              </CardContent>
            </Card>

            {passRate !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    답변 준비도
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-4xl sm:text-5xl font-bold ${getPassRateColor(passRate)}`}>
                    {passRate}점
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 후속 질문 통계 */}
          {followUpCount > 0 && (
            <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  꼬리 질문 응답 통계
                </CardTitle>
                <CardDescription>실전 면접처럼 후속 질문에 답변한 결과입니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg border border-orange-100">
                    <p className="text-3xl font-bold text-orange-600">{followUpCount}회</p>
                    <p className="text-xs text-muted-foreground mt-1">후속 질문 응답</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-orange-100">
                    <p className="text-3xl font-bold text-amber-600">
                      {followUpDifficulty === 'easy' ? '쉬움' : followUpDifficulty === 'hard' ? '어려움' : '보통'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">난이도 설정</p>
                  </div>
                </div>
                <p className="text-xs text-orange-600 mt-3 text-center">
                  후속 질문 연습은 실제 면접에서 당황하지 않게 도와줍니다
                </p>
              </CardContent>
            </Card>
          )}

          {/* 밸런스 분석 - 레이더 차트 */}
          {balanceAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  대기업 채용 평가 분석
                </CardTitle>
                <CardDescription>삼성, LG, SK, 현대 등 대기업 채용 평가 기준 5가지 영역별 점수</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 레이더 차트 */}
                <div className="w-full h-[300px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={[
                        { subject: '인성/가치관', value: balanceAnalysis.personality || 0, fullMark: 100 },
                        { subject: '경험/성과', value: balanceAnalysis.experience || 0, fullMark: 100 },
                        { subject: '직무역량', value: balanceAnalysis.technical || 0, fullMark: 100 },
                        { subject: '상황대처', value: balanceAnalysis.situational || 0, fullMark: 100 },
                        { subject: '조직이해도', value: balanceAnalysis.company || 0, fullMark: 100 },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                    >
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                      />
                      <Radar
                        name="점수"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value}점`, '점수']}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* 점수 상세 목록 - 대기업 평가 기준 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'personality', label: '인성/가치관', desc: '성실성, 책임감, 협업, 조직적합성' },
                    { key: 'experience', label: '경험/성과', desc: '과거성과, 문제해결, 리더십' },
                    { key: 'technical', label: '직무역량', desc: '전문지식, 업무이해, 기술역량' },
                    { key: 'situational', label: '상황대처', desc: '위기관리, 갈등해결, 의사결정' },
                    { key: 'company', label: '조직이해도', desc: '회사이해, 직무이해, 성장의지' },
                  ].map(({ key, label, desc }) => {
                    const value = (balanceAnalysis as any)[key] || 0;
                    const getScoreColor = (score: number) => {
                      if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
                      if (score >= 60) return 'bg-blue-100 text-blue-700 border-blue-200';
                      if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
                      return 'bg-red-100 text-red-700 border-red-200';
                    };
                    const getScoreEmoji = (score: number) => {
                      if (score >= 80) return '🌟';
                      if (score >= 60) return '👍';
                      if (score >= 40) return '💪';
                      return '📝';
                    };
                    return (
                      <div 
                        key={key} 
                        className={`flex flex-col p-3 rounded-lg border ${getScoreColor(value)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{getScoreEmoji(value)}</span>
                            <span className="font-medium text-sm">{label}</span>
                          </div>
                          <span className="font-bold text-lg">{value}점</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* 평균 점수 */}
                <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">종합 평가 점수</span>
                    <span className="text-2xl font-bold text-primary">
                      {Math.round(
                        ((balanceAnalysis.personality || 0) + 
                         (balanceAnalysis.experience || 0) + 
                         (balanceAnalysis.technical || 0) + 
                         (balanceAnalysis.situational || 0) + 
                         (balanceAnalysis.company || 0)) / 5
                      )}점
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">제출한 답변에서 관찰 가능한 5가지 연습 영역의 평균</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 평가 결과 해석 안내 */}
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                평가 결과 읽는 법
              </CardTitle>
              <CardDescription>아래 내용은 제출한 답변 텍스트의 연습 지표이며 실제 채용 판단이 아닙니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 평가 범위 */}
                <div className="p-4 bg-white rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔎</span>
                    <h3 className="font-semibold text-sm">평가 범위</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    답변에 포함된 관련성·구체적 근거·구조·직무 연관성·명료성만 검토했습니다. 성격, 감정, 자신감, 조직 적합성이나 실제 합격 여부는 판단하지 않습니다.
                  </p>
                </div>

                {/* 강점 */}
                <div className="p-4 bg-white rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">✨</span>
                    <h3 className="font-semibold text-sm text-green-700">답변에서 관찰된 강점</h3>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {balanceAnalysis && (
                      <>
                        {balanceAnalysis.personality >= 70 && <li>• 진정성 있는 가치관과 인성을 잘 표현했습니다.</li>}
                        {balanceAnalysis.experience >= 70 && <li>• 구체적인 경험과 성과를 명확히 설명했습니다.</li>}
                        {balanceAnalysis.technical >= 70 && <li>• 직무 역량과 전문성이 돋보입니다.</li>}
                        {balanceAnalysis.situational >= 70 && <li>• 상황 대처 능력이 뛰어납니다.</li>}
                        {balanceAnalysis.company >= 70 && <li>• 회사와 직무에 대한 이해도가 높습니다.</li>}
                      </>
                    )}
                    {(!balanceAnalysis || Object.values(balanceAnalysis).filter(v => v >= 70).length === 0) && (
                      <li>• 현재 점수만으로 두드러진 강점을 특정하기 어렵습니다. 질문별 근거 문장을 확인하세요.</li>
                    )}
                  </ul>
                </div>

                {/* 개선점 */}
                <div className="p-4 bg-white rounded-lg border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💡</span>
                    <h3 className="font-semibold text-sm text-orange-700">다음 연습에서 보완할 부분</h3>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {balanceAnalysis && (
                      <>
                        {balanceAnalysis.personality < 70 && <li>• 인성/가치관 답변에서 구체적인 경험을 더 포함해보세요.</li>}
                        {balanceAnalysis.experience < 70 && <li>• 경험/성과 답변에서 수치화된 성과를 강조해보세요.</li>}
                        {balanceAnalysis.technical < 70 && <li>• 직무 역량 답변에서 전문 용어와 기술적 세부사항을 추가해보세요.</li>}
                        {balanceAnalysis.situational < 70 && <li>• 상황 대처 답변에서 STAR 기법을 활용해보세요.</li>}
                        {balanceAnalysis.company < 70 && <li>• 회사/직무 이해도를 높이기 위해 기업 분석을 더 해보세요.</li>}
                      </>
                    )}
                    {(!balanceAnalysis || Object.values(balanceAnalysis).filter(v => v < 70).length === 0) && (
                      <li>• 전반적으로 우수한 답변입니다. 계속 유지하세요!</li>
                    )}
                  </ul>
                </div>

                {/* 다음 행동 */}
                <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎯</span>
                    <h3 className="font-semibold text-sm text-blue-900">권장하는 다음 행동</h3>
                  </div>
                  <p className="text-sm text-blue-900 font-medium">
                    질문별 피드백에서 가장 낮은 평가 기준 하나를 고르고, 근거 문장이나 STAR 구조를 보완해 같은 질문에 다시 답해보세요.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 프리미엄 AI 면접 기능 안내 */}
          {!subscription && (
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  프리미엄 AI 면접 기능
                  <Badge className="bg-purple-600 text-white text-xs">Coming Soon</Badge>
                </CardTitle>
                <CardDescription>더욱 정밀한 면접 분석을 경험하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-lg">😊</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">카메라 프레이밍 점검</p>
                      <p className="text-xs text-muted-foreground">얼굴 위치와 밝기를 사용자가 직접 확인</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-lg">👁️</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">시선 위치 참고</p>
                      <p className="text-xs text-muted-foreground">화면·카메라 방향 이탈을 연습용으로 표시</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-lg">🎤</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">음량·속도 점검</p>
                      <p className="text-xs text-muted-foreground">감정 추론 없이 소리 크기와 말하기 속도만 표시</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">종합 비언어 점수</p>
                      <p className="text-xs text-muted-foreground">표정+시선+음성 통합 평가</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <Link href="/pricing">
                    <Button className="gap-2">
                      <Zap className="w-4 h-4" />
                      프리미엄으로 업그레이드
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">질문별 결과</h2>
            {qas.map((qa, index) => (
              <Card key={qa.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Q{index + 1}. {getQuestionTypeLabel(qa.questionType)}
                    </CardTitle>
                    <span className="text-lg font-bold text-primary">{qa.score}점</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">질문</p>
                    <p className="text-sm sm:text-base">{qa.question}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">내 답변</p>
                    <p className="text-sm bg-secondary/30 p-3 rounded-lg">{qa.userAnswer}</p>
                  </div>
                  {qa.feedback && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">피드백</p>
                      {/* 무료 사용자: 첫 번째 질문만 전체 피드백, 나머지는 블러 처리 */}
                      {!subscription && index > 0 ? (
                        <div className="relative">
                          <div className="text-sm bg-primary/5 p-3 rounded-lg">
                            <div className="line-clamp-3">
                              <Streamdown>{`${qa.feedback.slice(0, 100)}...`}</Streamdown>
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background rounded-lg flex flex-col items-center justify-end pb-4">
                            <div className="text-center space-y-3 p-4">
                              <div className="flex items-center justify-center gap-2 text-primary">
                                <Sparkles className="w-5 h-5" />
                                <span className="font-semibold">전체 피드백 보기</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                프리미엄 회원이 되면 모든 질문의 상세 피드백과<br/>
                                모범 답변을 확인할 수 있습니다.
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <Link href="/pricing">
                                  <Button size="sm" className="gap-2">
                                    <Zap className="w-4 h-4" />
                                    요금제 확인
                                  </Button>
                                </Link>
                                <Link href="/pricing">
                                  <Button size="sm" variant="outline">
                                    요금제 보기
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm bg-primary/5 p-3 rounded-lg">
                          <Streamdown>{qa.feedback}</Streamdown>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pb-6">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto gap-2"
              onClick={downloadPDF}
            >
              <Download className="w-4 h-4" />
              결과 다운로드 (PDF)
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto gap-2"
              onClick={() => {
                const avgScore = qas.length > 0 
                  ? Math.round(qas.reduce((sum, qa) => sum + (qa.score || 0), 0) / qas.length)
                  : 0;
                
                let markdown = `# 🎯 AI 면접 연습 결과\n\n`;
                markdown += `**지원 회사:** ${profile?.targetCompany || '미지정'}\n`;
                markdown += `**지원 직무:** ${profile?.targetPosition || '미지정'}\n`;
                markdown += `**연습 일시:** ${new Date().toLocaleDateString('ko-KR')}\n`;
                markdown += `**총 질문 수:** ${qas.length}개\n`;
                markdown += `**평균 점수:** ${avgScore}점\n`;
                if (passRate !== null) markdown += `**답변 준비도:** ${passRate}점 (실제 합격 확률이 아닌 연습 지표)\n`;
                markdown += `\n---\n\n`;
                
                qas.forEach((qa, index) => {
                  markdown += `## Q${index + 1}. ${qa.question}\n\n`;
                  if (qa.score !== null) markdown += `**점수:** ${qa.score}점\n\n`;
                  
                  if (qa.userAnswer) {
                    markdown += `### 💬 내 답변\n${qa.userAnswer}\n\n`;
                  }
                  
                  if (qa.feedback) {
                    markdown += `### 🤖 AI 피드백\n${qa.feedback}\n\n`;
                  }
                  
                  if (qa.strengths) {
                    markdown += `### ✅ 강점\n${qa.strengths}\n\n`;
                  }
                  
                  if (qa.improvements) {
                    markdown += `### ⚠️ 개선점\n${qa.improvements}\n\n`;
                  }
                  
                  if (qa.suggestedAnswer) {
                    markdown += `### 💡 내 답변을 고친 예시\n${qa.suggestedAnswer}\n\n`;
                  }
                  
                  markdown += `---\n\n`;
                });
                
                // 다운로드
                const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `면접연습_${profile?.targetCompany || '미지정'}_${new Date().toISOString().split('T')[0]}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                toast.success('면접 결과가 마크다운 파일로 다운로드되었습니다!');
              }}
            >
              <FileText className="w-4 h-4" />
              피드백 모아보기 (MD)
            </Button>
            <SavePracticeButton 
              sessionId={sessionId}
              qas={qas}
              passRate={passRate}
              balanceAnalysis={balanceAnalysis}
              profile={profile}
            />
            <SocialShare 
              title="AI 면접 코치로 면접 연습 완료!"
              description={`답변 준비도: ${passRate}점`}
            />
            <Link href="/dashboard">
              <Button variant="outline" className="w-full sm:w-auto">대시보드로</Button>
            </Link>
            <Button 
              className="w-full sm:w-auto"
              onClick={() => {
                setStatus("idle");
                setSessionId(null);
                setCurrentQA(null);
                setQas([]);
                setQuestionIndex(0);
                setPassRate(null);
                setBalanceAnalysis(null);
              }}
            >
              새 면접 시작
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 면접 진행 화면 (answering, feedback)
  return (
    <DashboardLayout immersive={voiceMode}>
      <div className={voiceMode ? "mx-auto min-h-dvh max-w-6xl space-y-4 px-3 py-3 sm:px-6 sm:py-5" : "mx-auto max-w-3xl space-y-6 px-4 sm:px-0"}>
        {/* 홈 버튼 및 Progress */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className={voiceMode ? "min-h-11 gap-1 text-slate-300 hover:bg-white/10 hover:text-white" : "gap-1 text-muted-foreground hover:text-foreground"}
            onClick={() => setShowQuitConfirmDialog(true)}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">면접 종료</span>
          </Button>
          <div className={voiceMode ? "text-xs text-slate-400" : "text-xs text-muted-foreground"}>
            답변 완료 {qas.filter(item => item.questionType !== "follow_up").length}개
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className={voiceMode ? "text-sm text-slate-300" : "text-sm text-muted-foreground"}>
            질문 {questionIndex + 1} / {totalQuestions}
          </p>
          <div className="flex gap-1" aria-label={`전체 ${totalQuestions}문항 중 ${questionIndex + 1}번째`}>
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-6 rounded-full sm:w-8 ${
                  i < questionIndex ? "bg-green-500" 
                  : i === questionIndex ? (voiceMode ? "bg-cyan-400" : "bg-primary")
                  : (voiceMode ? "bg-slate-700" : "bg-secondary")
                }`}
              />
            ))}
          </div>
        </div>

        {voiceMode ? (
          <section className="relative min-h-[52vh] overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_#164e63_0%,_#0f172a_45%,_#020617_100%)] shadow-2xl" aria-label="실전 화상 면접실">
            <div className="flex min-h-[52vh] items-center justify-center px-4 pb-40 pt-14 sm:pb-36">
              <div className="[&_.text-foreground]:text-white [&_.text-muted-foreground]:text-slate-300">
                <InterviewingAvatar
                  avatar={selectedAvatar}
                  isSpeaking={isSpeaking}
                  emotion={avatarEmotion}
                  message={isSpeaking || isTTSLoading ? "질문 중" : status === "feedback" ? "답변 확인 중" : "지원자 답변 대기"}
                />
              </div>
            </div>

            {cameraEnabled && (
              <div className="absolute right-3 top-3 z-10 w-24 sm:w-36">
                <InterviewMediaCheck audio={false} video autoStart selfView />
              </div>
            )}

            <div className="absolute left-3 top-3 z-10 flex min-h-11 items-center rounded-full border border-white/10 bg-black/45 px-3 text-xs font-medium text-white backdrop-blur">
              {isSpeaking || isTTSLoading
                ? "면접관 질문 중"
                : isRecording || isListening
                  ? "답변 녹음 중"
                  : isTranscribing || submitMutation.isPending
                    ? "답변 분석 중"
                    : status === "feedback"
                      ? "즉시 교정 완료"
                      : "답변 준비"}
            </div>

            <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-slate-950/85 p-4 text-white backdrop-blur-md sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-200">
                <span>{getQuestionTypeLabel(currentQA?.questionType || "")}</span>
                {currentQA?.phaseLabel && <span aria-hidden="true">·</span>}
                {currentQA?.phaseLabel && <span>{currentQA.phaseLabel}</span>}
                {timerEnabled && (timerActive || timerOvertime) && (
                  <span className={timerOvertime || timeRemaining <= 30 ? "ml-auto font-mono font-bold text-amber-300" : "ml-auto font-mono font-bold text-white"} aria-live="polite">
                    {timerOvertime ? `+${Math.floor(overtimeSeconds / 60)}:${(overtimeSeconds % 60).toString().padStart(2, "0")}` : `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, "0")}`}
                  </span>
                )}
              </div>
              <h1 className="mt-2 max-w-4xl text-lg font-semibold leading-relaxed sm:text-2xl" aria-live="polite">{currentQA?.question}</h1>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => isSpeaking ? stopSpeaking() : void speakQuestion(currentQA?.question || "")}
                  disabled={isTTSLoading || isRecording || isListening}
                >
                  {isSpeaking ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                  {isSpeaking ? "질문 음성 중지" : "질문 다시 듣기"}
                </Button>
                {ttsProviderStatus !== "idle" && <span className="text-xs text-slate-400" aria-live="polite">{ttsProviderStatus === "loading" ? "음성 준비 중" : ttsProviderStatus === "supertonic2" ? "면접관 음성" : "화면 질문"}</span>}
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* 면접관 아바타 표시 */}
            <InterviewingAvatar
              avatar={selectedAvatar}
              isSpeaking={isSpeaking}
              emotion={avatarEmotion}
              message={isSpeaking ? "질문을 읽고 있습니다..." : status === 'feedback' ? "답변을 분석하고 있습니다..." : undefined}
            />

            {/* Question Card */}
            <Card>
          <CardHeader className="pb-3">
            {/* 모바일 반응형 레이아웃 */}
            <div className="flex flex-col gap-3">
              {/* 질문 유형 */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span>{getQuestionTypeLabel(currentQA?.questionType || "")}</span>
                {currentQA?.phaseLabel && <Badge variant="outline">{currentQA.phaseLabel}</Badge>}
              </div>
              
              {/* 타이머 설정 - 모바일에서 줄바꿈 */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={timerEnabled ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setTimerEnabled(!timerEnabled)}
                >
                  ⏱️ {timerEnabled ? '타이머 ON' : '타이머'}
                </Button>
                {timerEnabled && (
                  <div className="flex items-center gap-1">
                    {/* 직군별 추천 시간 선택 */}
                    <select 
                      value={selectedJobCategory} 
                      onChange={(e) => {
                        const category = e.target.value;
                        setSelectedJobCategory(category);
                        if (category !== 'custom') {
                          setTimerDuration(jobCategoryTimers[category].seconds);
                        }
                      }}
                      className="h-7 text-xs bg-background border rounded px-1"
                      title="직군별 추천 시간"
                    >
                      {Object.entries(jobCategoryTimers).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value.label} ({Math.floor(value.seconds / 60)}분{value.seconds % 60 > 0 ? ` ${value.seconds % 60}초` : ''})
                        </option>
                      ))}
                    </select>
                    {/* 직접 설정 시 시간 선택 */}
                    {selectedJobCategory === 'custom' && (
                      <select 
                        value={timerDuration} 
                        onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                        className="h-7 text-xs bg-background border rounded px-1"
                      >
                        <option value="30">30초</option>
                        <option value="60">1분</option>
                        <option value="90">1분 30초</option>
                        <option value="120">2분</option>
                        <option value="150">2분 30초</option>
                        <option value="180">3분</option>
                      </select>
                    )}
                  </div>
                )}
              </div>
              {/* TTS 컨트롤 버튼 - 음성 모드일 때만 표시 (모바일에서 줄바꿈) */}
              {voiceMode && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border sm:pt-0 sm:border-t-0 sm:ml-2 sm:pl-2 sm:border-l">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isSpeaking) {
                        stopSpeaking();
                      } else {
                        speakQuestion(currentQA?.question || '');
                      }
                    }}
                    className="gap-1 text-gold hover:text-gold/80"
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span className="text-xs">중지</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span className="text-xs">다시 듣기</span>
                      </>
                    )}
                  </Button>
                  {ttsProviderStatus !== 'idle' && (
                    <span className="text-[11px] text-muted-foreground" aria-live="polite">
                      {ttsProviderStatus === 'loading' ? '면접관 음성 준비 중' : ttsProviderStatus === 'supertonic2' ? '자연 음성' : '화면 질문'}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setTtsEnabled(!ttsEnabled); if (ttsEnabled) setTtsProviderStatus('text'); }}
                    className={`gap-1 ${ttsEnabled ? 'text-gold' : 'text-muted-foreground'}`}
                  >
                    {ttsEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                    <span className="text-xs">{ttsEnabled ? 'TTS 켜짐' : 'TTS 꺼짐'}</span>
                  </Button>
                  {/* TTS 설정 */}
                  {ttsEnabled && (
                    <div className="flex items-center gap-2">
                      <Select value={ttsTone} onValueChange={(v) => setTtsTone(v as 'calm' | 'energetic' | 'professional')}>
                        <SelectTrigger className="w-24 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="calm">차분한</SelectItem>
                          <SelectItem value="professional">전문적</SelectItem>
                          <SelectItem value="energetic">활기찬</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">속도</span>
                        <select 
                          value={ttsSpeed} 
                          onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                          className="h-7 text-xs bg-background border rounded px-1"
                        >
                          <option value="0.8">0.8x (느림)</option>
                          <option value="1.0">1.0x (기본)</option>
                          <option value="1.2">1.2x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2.0">2.0x (빠름)</option>
                          <option value="2.5">2.5x</option>
                          <option value="3.0">3.0x (최대)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 타이머 표시 */}
            {timerEnabled && (timerActive || timerOvertime) && (
              <div className="mb-3 space-y-2">
                {!timerOvertime ? (
                  // 정상 타이머 표시
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${
                    timeRemaining <= 30 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <span className={`text-lg font-mono font-bold ${
                      timeRemaining <= 30 ? 'text-red-600 animate-pulse' : 'text-blue-600'
                    }`}>
                      ⏱️ {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                    <Progress 
                      value={(timeRemaining / timerDuration) * 100} 
                      className={`flex-1 h-2 ${timeRemaining <= 30 ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-500'}`}
                    />
                    {timeRemaining <= 30 && (
                      <span className="text-xs text-red-600 font-medium">시간이 얼마 안 남았습니다!</span>
                    )}
                  </div>
                ) : (
                  // 시간 초과 표시 - 답변이 길어지고 있음 안내
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-300">
                    <span className="text-lg font-mono font-bold text-orange-600 animate-pulse">
                      ⚠️ +{Math.floor(overtimeSeconds / 60)}:{(overtimeSeconds % 60).toString().padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-orange-700">답변이 길어지고 있습니다</div>
                      <div className="text-xs text-orange-600">간결하게 마무리하세요. 답변은 계속 가능합니다.</div>
                    </div>
                    <Progress 
                      value={Math.max(0, 100 - (overtimeSeconds / 60) * 20)} 
                      className="w-20 h-2 [&>div]:bg-orange-500"
                    />
                  </div>
                )}
                {/* 직군별 추천 설명 */}
                {selectedJobCategory !== 'custom' && !timerOvertime && (
                  <div className="text-xs text-muted-foreground bg-slate-50 px-2 py-1 rounded flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span className="font-medium">{jobCategoryTimers[selectedJobCategory]?.label}:</span>
                    <span>{jobCategoryTimers[selectedJobCategory]?.description}</span>
                  </div>
                )}
              </div>
            )}
            
            <CardTitle className="text-lg sm:text-xl leading-relaxed">
              {currentQA?.question}
            </CardTitle>
            {/* 질문 타이밍 정보 */}
            {currentQA?.timingInfo && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  면접 {currentQA.timingInfo.timing}
                </Badge>
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  {currentQA.timingInfo.mood}
                </Badge>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  팁: {currentQA.timingInfo.answerStyle}
                </Badge>
              </div>
            )}
            {/* 음성 재생 중 표시 */}
            {voiceMode && isSpeaking && (
              <div className="flex items-center gap-2 mt-3 text-gold">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="text-sm animate-pulse">질문을 읽고 있습니다...</span>
              </div>
            )}
          </CardHeader>
            </Card>
          </>
        )}

        {/* Answer Input or Feedback */}
        {status === "answering" && (
          <Card className={voiceMode ? "border-white/10 bg-slate-900 text-white" : undefined}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {voiceMode ? (
                  <>
                    <Mic className="w-5 h-5 text-gold" />
                    음성으로 답변하기
                  </>
                ) : (
                  <>답변 작성</>
                )}
              </CardTitle>
              <CardDescription>
                {voiceMode 
                  ? '마이크 버튼을 누르고 말씀해주세요' 
                  : '실제 면접처럼 답변을 작성해주세요'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 음성 모드일 때 음성 입력 UI - 모바일 최적화 */}
              {voiceMode && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:p-6">
                  <div className="flex flex-col items-center gap-3">
                    {/* 통합 마이크 버튼 (음성 인식 + 녹음 동시 시작) - 모바일에서 더 크게 */}
                    <button
                      type="button"
                      aria-label={isListening || isRecording ? "음성 답변 녹음 종료" : "음성 답변 녹음 시작"}
                      aria-pressed={isListening || isRecording}
                      disabled={isSpeaking || isTTSLoading || isTranscribing}
                      onClick={async () => {
                        // Whisper API 사용 시 toggleListening만 호출 (녹음 + 변환 통합)
                        await toggleListening();
                      }}
                      className={`flex h-28 w-28 flex-col items-center justify-center rounded-full shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:h-24 sm:w-24 ${
                        isListening || isRecording
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                          : 'bg-gradient-to-r from-gold to-orange-500 hover:from-gold/90 hover:to-orange-500/90'
                      }`}
                    >
                      <Mic className={`w-12 h-12 sm:w-10 sm:h-10 text-white ${isListening ? 'animate-bounce' : ''}`} />
                      <span className="text-xs text-white mt-1 font-medium">
                        {isListening || isRecording ? '답변 종료' : '답변 시작'}
                      </span>
                    </button>
                    
                    {/* 녹음 다시 듣기 */}
                    {recordedAudioUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={playRecording}
                        disabled={isPlayingRecording}
                      >
                        {isPlayingRecording ? (
                          <>
                            <Volume2 className="w-4 h-4 animate-pulse" />
                            재생 중...
                          </>
                        ) : (
                          <>
                            🔊 내 답변 다시 듣기
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                    {/* 음성 인식 상태 안내 */}
                    <div className="w-full text-center">
                      {isTranscribing ? (
                        <div className="space-y-3" role="status" aria-live="polite" aria-label="음성 변환 중">
                          <p className="text-sm font-medium text-blue-600 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            답변 음성을 분석하고 있습니다...
                          </p>
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg mt-3 min-h-[116px] shadow-md space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-sm font-bold text-blue-700">STT 스크립트 준비 중</span>
                              </div>
                              <span className="text-xs text-blue-600">1/2</span>
                            </div>
                            <Skeleton className="h-3 w-[92%] bg-blue-200/80" />
                            <Skeleton className="h-3 w-[72%] bg-blue-200/80" />
                            <div className="flex items-center gap-2 pt-1">
                              <Skeleton className="h-2 w-16 bg-indigo-200/80" />
                              <span className="text-xs text-blue-700">음성 내용을 정확한 텍스트로 옮기는 중입니다.</span>
                            </div>
                          </div>
                        </div>
                      ) : isListening ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-red-600 flex items-center justify-center gap-2">
                          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          마이크 활성화 중 - 말씀해주세요!
                        </p>
                        <p className="text-xs text-muted-foreground">
                          답변이 끝나면 마이크 버튼을 다시 눌러주세요
                        </p>
                        {/* 실시간 인식 중간 결과 표시 */}
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg mt-3 min-h-[80px] shadow-md">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm font-bold text-red-600">음성 인식 중...</span>
                          </div>
                          {interimTranscript ? (
                            <div className="space-y-2">
                              <p className="text-lg text-orange-800 font-bold animate-pulse">
                                🎤 "{interimTranscript}"
                              </p>
                              {answer && (
                                <p className="text-sm text-gray-600 border-t pt-2 mt-2">
                                  이전 입력: {answer.slice(-100)}{answer.length > 100 ? '...' : ''}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-base text-yellow-700">
                              🗣️ 말씀하시면 여기에 실시간으로 표시됩니다...
                            </p>
                          )}
                        </div>
                      </div>
                    ) : isRecording ? (
                      <p className="text-sm font-medium text-red-600 flex items-center justify-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        목소리가 들어오고 있습니다 · 끝나면 답변 종료를 눌러주세요
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gold">
                          🎤 마이크 버튼을 눌러 음성 입력을 시작하세요
                        </p>
                        <p className="text-xs text-muted-foreground">
                          말씀하신 내용이 실시간으로 텍스트로 변환됩니다
                        </p>
                      </div>
                    )}
                  </div>
                  {recordedAudioUrl && (
                    <p className="text-xs text-muted-foreground">
                      💡 녹음된 답변을 다시 들어보며 발음과 전달력을 확인해보세요
                    </p>
                  )}
                </div>
              )}

              {/* 답변 길이 가이드 */}
              {!voiceMode && answer.length > 0 && (
                <div className="mb-2 p-3 rounded-lg border" style={{
                  backgroundColor: answer.length < 50 ? '#fef3c7' : answer.length < 300 ? '#d1fae5' : '#fed7aa',
                  borderColor: answer.length < 50 ? '#fbbf24' : answer.length < 300 ? '#10b981' : '#f97316'
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{
                        color: answer.length < 50 ? '#92400e' : answer.length < 300 ? '#065f46' : '#9a3412'
                      }}>
                        {answer.length < 50 && '📊 답변이 짧습니다'}
                        {answer.length >= 50 && answer.length < 300 && '✅ 적절한 길이입니다'}
                        {answer.length >= 300 && '⚠️ 답변이 깁니다'}
                      </span>
                      <span className="text-xs" style={{
                        color: answer.length < 50 ? '#92400e' : answer.length < 300 ? '#065f46' : '#9a3412'
                      }}>
                        {answer.length}글자
                      </span>
                    </div>
                    <span className="text-xs" style={{
                      color: answer.length < 50 ? '#92400e' : answer.length < 300 ? '#065f46' : '#9a3412'
                    }}>
                      {answer.length < 50 && '권장: 50-300글자'}
                      {answer.length >= 50 && answer.length < 300 && '계속 작성하세요'}
                      {answer.length >= 300 && '간결하게 마무리하세요'}
                    </span>
                  </div>
                </div>
              )}
              
              {(!voiceMode || Boolean(answer) || Boolean(recordedAudioUrl) || isTranscribing) && (
                <Textarea
                  aria-label="면접 답변"
                  placeholder={voiceMode ? "음성으로 옮긴 답변을 확인하고 필요한 부분만 수정하세요." : "답변을 입력하세요..."}
                  rows={voiceMode ? 5 : 8}
                  value={answer}
                  className={voiceMode ? "border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500" : undefined}
                  onChange={(e) => {
                    if (!answerStartTime && e.target.value.trim()) setAnswerStartTime(Date.now());
                    setAnswer(e.target.value);
                  }}
                />
              )}
              
              {/* 이력서/자소서 맞춤 안내 */}
              {!voiceMode && ((!profile?.resume && !profile?.coverLetter) ? (
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-indigo-900 mb-1">
                        이력서/자소서를 등록하면 더 정확한 피드백을 받을 수 있어요!
                      </p>
                      <p className="text-sm text-indigo-700 mb-2">
                        귀하의 경험과 역량을 바탕으로 맞춤형 질문과 구체적인 개선점을 제안합니다.
                      </p>
                      <Link href="/profile">
                        <Button size="sm" variant="outline" className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-100">
                          <FileText className="w-4 h-4" />
                          지금 등록하기
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-700">
                      <span className="font-medium">맞춤 피드백 활성화!</span> 귀하의 이력서/자소서를 바탕으로 구체적인 피드백을 제공합니다.
                    </p>
                  </div>
                </div>
              ))}
              
              {/* 개인정보 보호 안내 */}
              {!voiceMode && <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  <span className="font-medium">데이터 처리 안내:</span> 음성은 텍스트 변환을 위해 연결된 AI 서비스에서 처리되며, 앱에는 변환된 답변과 피드백이 저장됩니다. 주민등록번호·계좌번호 등 불필요한 민감정보는 입력하지 마세요.
                </p>
              </div>}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                {voiceMode && (
                  <p className="text-xs text-muted-foreground">
                    팁: 음성 입력 후 텍스트를 직접 수정할 수 있습니다
                  </p>
                )}
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {voiceMode && answer.trim() && (
                    <>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setAnswer('');
                          setInterimTranscript('');
                          toast.info('답변을 삭제했습니다. 다시 녹음해주세요.');
                        }}
                        className="gap-2"
                      >
                        🔄 다시 답변하기
                      </Button>
                    </>
                  )}
                  <Button 
                    onClick={handleSubmitAnswer}
                    disabled={submitMutation.isPending || isTranscribing || isSpeaking || isRecording || isListening || !answer.trim()}
                    className={`gap-2 flex-1 sm:flex-none ${voiceMode ? 'bg-gradient-to-r from-gold to-orange-500 hover:from-gold/90 hover:to-orange-500/90' : ''}`}
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        피드백 생성 중...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {voiceMode ? "답변 분석하고 바로 교정받기" : "피드백 받기"}
                      </>
                    )}
                  </Button>
                  
                  {/* 피드백 생성 중 안내 메시지 */}
                  {submitMutation.isPending && (
                    <div className="w-full mt-3 space-y-3" role="status" aria-live="polite" aria-label="AI 피드백 생성 중">
                      <AnalyzingLoader
                        stepLabels={voiceMode
                  ? ["음성 분석 중", "답변 내용 분석 중", "내 답변을 고친 예시 생성 중", "피드백 정리 완료"]
                  : ["답변 분석 중", "핵심 내용 정리 중", "내 답변을 고친 예시 생성 중", "피드백 정리 완료"]}
                        message="답변의 핵심 내용과 전달 방식을 분석하고 있습니다."
                      />
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary">AI 내 답변을 고친 예시 생성 중</span>
                          <span className="text-xs text-muted-foreground">2/2</span>
                        </div>
                        <Skeleton className="h-3 w-[88%]" />
                        <Skeleton className="h-3 w-[96%]" />
                        <Skeleton className="h-3 w-[64%]" />
                        <p className="text-xs text-muted-foreground">강점과 개선점을 반영해 답변 구조를 정리하고 있습니다.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "feedback" && currentQA && voiceMode && (
          <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-4 text-white sm:p-6" aria-labelledby="voice-correction-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Answer coaching</p>
                <h2 id="voice-correction-title" className="mt-1 text-xl font-bold">방금 답변을 바로 고쳤습니다</h2>
                <p className="mt-1 text-sm text-slate-400">원문에 없던 경험이나 수치는 만들지 않고, 말의 구조와 표현만 정리합니다.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-right">
                {qaAnswerDurations[currentQA.id] !== undefined && <p className="text-xs text-slate-400">답변 {qaAnswerDurations[currentQA.id]}초</p>}
                <p className="text-2xl font-bold text-cyan-300">{currentQA.score ?? 0}<span className="ml-1 text-xs font-normal text-slate-400">/ 100</span></p>
              </div>
            </div>

            <div className="rounded-xl bg-white text-slate-950">
              <InstantAnswerCorrection
                question={currentQA.question}
                originalAnswer={currentQA.userAnswer || ""}
                correctedAnswer={currentQA.suggestedAnswer}
                correctedAnswerShort={currentQA.suggestedAnswerShort}
                correctedAnswerLong={currentQA.suggestedAnswerLong}
                improvements={currentQA.improvements}
              />
            </div>

            {currentQA.feedback && (
              <details className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <summary className="min-h-11 cursor-pointer font-medium">상세 피드백 보기</summary>
                <div className="mt-3 text-sm leading-6 text-slate-300"><Streamdown>{currentQA.feedback}</Streamdown></div>
              </details>
            )}

            {currentQA.questionType !== "follow_up" && followUpCount === 0 && currentQA.followUpQuestions?.[0] && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-amber-200">면접관이 답변을 더 확인하려 합니다</p>
                    <p className="mt-1 text-sm text-slate-400">꼬리질문은 이 면접에서 한 번만 진행되며 추가 크레딧을 사용하지 않습니다.</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-300" htmlFor="voice-follow-up-difficulty">
                    난이도
                    <select id="voice-follow-up-difficulty" value={followUpDifficulty} onChange={(event) => setFollowUpDifficulty(event.target.value as 'easy' | 'medium' | 'hard')} className="min-h-11 rounded-md border border-white/15 bg-slate-950 px-3 text-white">
                      <option value="easy">쉬움</option>
                      <option value="medium">보통</option>
                      <option value="hard">어려움</option>
                    </select>
                  </label>
                </div>
                <Button type="button" variant="outline" className="mt-3 min-h-11 w-full border-amber-300/30 bg-transparent text-amber-100 hover:bg-amber-300/10 hover:text-white" onClick={handleStartFollowUp}>
                  꼬리질문에 답하기
                </Button>
              </div>
            )}

            <Button onClick={handleNextQuestion} className="min-h-12 w-full gap-2" disabled={completeMutation.isPending || generateMutation.isPending}>
              {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> 다음 질문 준비 중</> : completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : questionIndex + 1 >= totalQuestions ? <>면접 완료 <CheckCircle2 className="h-4 w-4" /></> : <>다음 질문 <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </section>
        )}

        {status === "feedback" && currentQA && !voiceMode && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">내 답변</CardTitle>
                  <div className="text-right">
                    {/* 답변 시간 표시 */}
                    {qaAnswerDurations[currentQA.id] && (
                      <div className="text-xs text-muted-foreground mb-1">
                        답변 시간: {Math.floor(qaAnswerDurations[currentQA.id] / 60)}분 {qaAnswerDurations[currentQA.id] % 60}초
                      </div>
                    )}
                    <span className="text-2xl font-bold text-primary">{currentQA.score}점</span>
                    <span className="text-xs text-muted-foreground ml-1">/ 100점</span>
                    <div className="text-xs mt-1">
                      {(currentQA.score || 0) >= 90 ? (
                        <Badge className="bg-green-500 text-white">우수</Badge>
                      ) : (currentQA.score || 0) >= 70 ? (
                        <Badge className="bg-blue-500 text-white">양호</Badge>
                      ) : (currentQA.score || 0) >= 50 ? (
                        <Badge className="bg-yellow-500 text-white">보통</Badge>
                      ) : (
                        <Badge className="bg-red-500 text-white">개선 필요</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* 점수 기준 안내 */}
                <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs text-slate-300">
                  <p className="font-medium mb-1">점수 기준 (100점 만점)</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span>• 90점 이상: 우수</span>
                    <span>• 70-89점: 양호</span>
                    <span>• 50-69점: 보통</span>
                    <span>• 50점 미만: 개선 필요</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <InstantAnswerCorrection
                  question={currentQA.question}
                  originalAnswer={currentQA.userAnswer || ""}
                  correctedAnswer={currentQA.suggestedAnswer}
                  correctedAnswerShort={currentQA.suggestedAnswerShort}
                  correctedAnswerLong={currentQA.suggestedAnswerLong}
                  improvements={currentQA.improvements}
                />
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="text-sm">{currentQA.userAnswer}</p>
                  
                  {/* 답변 수정 버튼 */}
                  {!isRevising && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={() => {
                        setIsRevising(true);
                        setRevisedAnswer(currentQA.userAnswer || "");
                        setShowRevisionResult(false);
                        setRevisionResult(null);
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      답변 수정하기
                    </Button>
                  )}
                  
                  {/* 답변 수정 입력 영역 */}
                  {isRevising && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <p className="text-sm font-medium">수정된 답변</p>
                      <Textarea
                        value={revisedAnswer}
                        onChange={(e) => setRevisedAnswer(e.target.value)}
                        placeholder="답변을 수정해보세요..."
                        className="min-h-[150px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!revisedAnswer.trim()) {
                              toast.error("수정된 답변을 입력해주세요");
                              return;
                            }
                            reviseAnswerMutation.mutate({
                              qaId: currentQA.id,
                              revisedAnswer: revisedAnswer.trim(),
                            });
                          }}
                          disabled={reviseAnswerMutation.isPending}
                        >
                          {reviseAnswerMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" />평가 중...</>
                          ) : (
                            <>수정된 답변 평가받기</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsRevising(false);
                            setRevisedAnswer("");
                          }}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* 수정된 답변 평가 결과 */}
                  {showRevisionResult && revisionResult && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-600">수정된 답변 평가 결과</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">기존: {revisionResult.originalScore}점</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-sm font-bold text-primary">{revisionResult.score}점</span>
                          {revisionResult.score > revisionResult.originalScore && (
                            <Badge className="bg-green-500 text-white text-xs">+{revisionResult.score - revisionResult.originalScore}점</Badge>
                          )}
                        </div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-sm">
                        <Streamdown>{revisionResult.feedback}</Streamdown>
                      </div>
                      {revisionResult.improvements && (
                        <div className="bg-green-50 p-3 rounded-lg text-sm">
                          <p className="text-xs font-medium text-green-600 mb-1">개선된 점</p>
                          <Streamdown>{revisionResult.improvements}</Streamdown>
                        </div>
                      )}
                      {revisionResult.remainingIssues && (
                        <div className="bg-orange-50 p-3 rounded-lg text-sm">
                          <p className="text-xs font-medium text-orange-600 mb-1">추가 개선 필요</p>
                          <Streamdown>{revisionResult.remainingIssues}</Streamdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* 발화 분석 - 버벅임 포인트 */}
                {voiceMode && currentQA.userAnswer && (() => {
                  const answer = currentQA.userAnswer || '';
                  const fillerWords = ['\uc5b4', '\uc74c', '\uadf8', '\uc800', '\uc544', '\uc74c...', '\uc5b4...', '\uadf8\ub7f0\ub370', '\uc774\uc81c'];
                  const fillerMatches: {word: string, count: number}[] = [];
                  fillerWords.forEach(word => {
                    const regex = new RegExp(word, 'gi');
                    const matches = answer.match(regex);
                    if (matches && matches.length > 0) {
                      fillerMatches.push({ word, count: matches.length });
                    }
                  });
                  const totalFillers = fillerMatches.reduce((sum, m) => sum + m.count, 0);
                  const wordCount = answer.split(/\s+/).length;
                  const fillerRatio = wordCount > 0 ? (totalFillers / wordCount * 100).toFixed(1) : 0;
                  
                  return totalFillers > 0 ? (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-800">발화 패턴 분석</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-amber-700">
                          버벅임 비율: <span className="font-bold">{fillerRatio}%</span> ({totalFillers}회 / {wordCount}단어)
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {fillerMatches.map((m, i) => (
                            <Badge key={i} variant="outline" className="bg-amber-100 text-amber-800 text-xs">
                              "{m.word}" {m.count}회
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 p-3 bg-white rounded border border-amber-100">
                          <p className="text-xs font-medium text-amber-800 mb-1">훈련 방법</p>
                          <ul className="text-xs text-amber-700 space-y-1">
                            <li>• 말하기 전 2초 정도 생각하는 시간을 가져보세요</li>
                            <li>• "어...", "음..." 대신 짧은 침묵을 사용해보세요</li>
                            <li>• 핵심 키워드를 먼저 말하고 설명을 덧붙이세요</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-700">버벅임 없이 유창하게 답변하셨습니다!</p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI 피드백</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">전반적인 피드백 {currentQA.feedbackPerspective ? `(${currentQA.feedbackPerspective})` : ''}</p>
                  <div className="bg-primary/5 p-4 rounded-lg text-sm">
                    <Streamdown>{currentQA.feedback || "답변이 성공적으로 제출되었습니다. 역량 분석 및 피드백을 검토 중입니다."}</Streamdown>
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {currentQA.strengths && (
                    <div>
                      <p className="text-sm font-medium text-green-400 mb-2">✅ 강점</p>
                      <div className="bg-green-800 border border-green-700 p-4 rounded-lg text-sm text-green-50">
                        <Streamdown>{currentQA.strengths}</Streamdown>
                      </div>
                    </div>
                  )}
                  {currentQA.improvements && (
                    <div>
                      <p className="text-sm font-medium text-orange-400 mb-2">⚠️ 개선점</p>
                      <div className="bg-orange-800 border border-orange-700 p-4 rounded-lg text-sm text-orange-50">
                        <Streamdown>{currentQA.improvements}</Streamdown>
                      </div>
                    </div>
                  )}
                </div>

                {/* 구체적인 개선 가이드 */}
                {currentQA.improvementGuide && (
                  <div>
                    <p className="text-sm font-medium text-purple-600 mb-2">개선 가이드</p>
                    <div className="bg-purple-50 p-4 rounded-lg text-sm border border-purple-100">
                      <Streamdown>{currentQA.improvementGuide}</Streamdown>
                    </div>
                  </div>
                )}

                {/* 피드백 관점 표시 */}
                {currentQA.feedbackPerspective && (
                  <div className="text-xs text-muted-foreground text-right">
                    피드백 관점: {currentQA.feedbackPerspective}
                  </div>
                )}
                
                {currentQA.questionType !== "follow_up" && followUpCount === 0 && currentQA.followUpQuestions?.[0] && (
                  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-amber-500" /> 실전 꼬리질문</p>
                        <p className="mt-1 text-xs text-muted-foreground">현재 답변을 더 구체적으로 확인하는 질문을 한 번 이어서 받습니다.</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs" htmlFor="follow-up-difficulty">
                        난이도
                        <select id="follow-up-difficulty" value={followUpDifficulty} onChange={(event) => setFollowUpDifficulty(event.target.value as 'easy' | 'medium' | 'hard')} className="min-h-11 rounded-md border bg-background px-3">
                          <option value="easy">쉬움</option>
                          <option value="medium">보통</option>
                          <option value="hard">어려움</option>
                        </select>
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 min-h-11 w-full"
                      onClick={handleStartFollowUp}
                    >
                      면접관 꼬리질문 이어서 받기
                    </Button>
                  </div>
                )}

                {/* 피드백 평가 버튼 */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">이 피드백이 도움이 되었나요?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 hover:bg-green-50 hover:border-green-300"
                      onClick={() => {
                        toast.success("피드백 평가가 저장되었습니다!");
                      }}
                    >
                      👍 도움이 되었어요
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 hover:bg-orange-50 hover:border-orange-300"
                      onClick={() => {
                        toast.info("피드백을 개선하겠습니다.", {
                          description: "더 나은 피드백을 위해 노력하겠습니다."
                        });
                      }}
                    >
                      👎 개선이 필요해요
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <InterviewCheckpoint answers={qas.filter(item => item.questionType !== "follow_up")} />

            {/* 추가 기능 버튼 */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {questionIndex > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prevQA = qas[questionIndex - 1];
                    if (prevQA) {
                      toast.info(`이전 질문: ${prevQA.question}`, {
                        description: `내 답변: ${prevQA.userAnswer?.substring(0, 100)}...`,
                        duration: 5000,
                      });
                    }
                  }}
                  className="gap-2"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  이전 질문 보기
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentQA = qas[questionIndex];
                  if (currentQA?.feedback) {
                    toast.info("추천 후속 질문", {
                      description: `피드백 기반: "${currentQA.improvements?.[0] || '답변 내용'}"에 대해 더 자세히 설명해주세요.`,
                      duration: 5000,
                    });
                  }
                }}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                추천 후속 질문
              </Button>
            </div>

            <div className="flex justify-center pb-6">
              <Button 
                onClick={handleNextQuestion}
                className="gap-2 w-full sm:w-auto"
                disabled={completeMutation.isPending || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    다음 질문 준비 중...
                  </>
                ) : completeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : questionIndex + 1 >= totalQuestions ? (
                  <>
                    면접 완료
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    다음 질문
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* 공유 모달 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`${profile?.targetCompany || ''} ${profile?.targetPosition || ''} 면접 연습 결과`}
        content={qas.map((qa, i) => `Q${i+1}. ${qa.question}\nA. ${qa.userAnswer || ''}\n피드백: ${qa.feedback || ''}\n점수: ${qa.score || 0}점`).join('\n\n')}
        type="interview_result"
      />

      {/* 사용 제한 모달 */}
      <UsageLimitModal
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        reason={usageLimitReason || "usage_limit"}
      />

      {/* 질문 공유 모달 */}
      {showQuestionShareModal && (
        <QuestionShareModal
          isOpen={showQuestionShareModal}
          onClose={() => setShowQuestionShareModal(false)}
          questions={selectedQuestions}
          targetCompany={profile?.targetCompany || undefined}
          targetPosition={profile?.targetPosition || undefined}
        />
      )}

      {/* 공유 링크 모달 - shadcn Dialog 컴포넌트 사용 */}
      <Dialog open={showShareLinkModal} onOpenChange={setShowShareLinkModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <DialogTitle>공유 링크 생성 완료!</DialogTitle>
                <DialogDescription>링크가 클립보드에 복사되었습니다</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="bg-slate-800 rounded-lg p-3 my-4">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                readOnly
                value={generatedShareUrl || ''}
                className="flex-1 bg-transparent text-sm border-none outline-none"
              />
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => {
                  if (generatedShareUrl) {
                    navigator.clipboard.writeText(generatedShareUrl);
                    toast.success('링크가 복사되었습니다!');
                  }
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowShareLinkModal(false)}
            >
              닫기
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (generatedShareUrl) {
                  window.open(generatedShareUrl, '_blank');
                }
              }}
            >
              링크 열기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 마이크 테스트 다이얼로그 */}
      <Dialog open={showMicTest} onOpenChange={setShowMicTest}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎤 마이크 테스트
            </DialogTitle>
            <DialogDescription>
              음성 면접을 위해 마이크가 정상적으로 작동하는지 확인합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 마이크 상태 표시 */}
            <div className="flex flex-col items-center gap-4">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                micTestStatus === 'idle' ? 'bg-gray-100' :
                micTestStatus === 'testing' ? 'bg-gold/20 animate-pulse' :
                micTestStatus === 'success' ? 'bg-green-100' :
                'bg-red-100'
              }`}>
                <Mic className={`w-12 h-12 ${
                  micTestStatus === 'idle' ? 'text-gray-400' :
                  micTestStatus === 'testing' ? 'text-gold' :
                  micTestStatus === 'success' ? 'text-green-600' :
                  'text-red-600'
                }`} />
              </div>
              
              {/* 볼륨 바 */}
              {micTestStatus === 'testing' && (
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gold to-orange-500 transition-all duration-100"
                    style={{ width: `${Math.min(micTestVolume * 100, 100)}%` }}
                  />
                </div>
              )}
              
              <p className="text-center text-sm">
                {micTestStatus === 'idle' && '아래 버튼을 눌러 마이크를 테스트하세요'}
                {micTestStatus === 'testing' && '말씀해보세요... "안녕하세요, 면접 준비가 되었습니다"'}
                {micTestStatus === 'success' && <span className="text-green-600 font-medium">✅ 마이크가 정상적으로 작동합니다!</span>}
                {micTestStatus === 'failed' && <span className="text-red-600">❌ 마이크를 찾을 수 없습니다. 권한을 확인해주세요.</span>}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {micTestStatus === 'idle' && (
              <Button
                onClick={async () => {
                  setMicTestStatus('testing');
                  setMicTestVolume(0);
                  try {
                    // 마이크 권한 요청
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                      audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                      } 
                    });
                    
                    // AudioContext 생성 및 resume (브라우저 정책 대응)
                    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                    
                    // AudioContext가 suspended 상태일 수 있으므로 resume 호출
                    if (audioContext.state === 'suspended') {
                      await audioContext.resume();
                    }
                    
                    const analyser = audioContext.createAnalyser();
                    const microphone = audioContext.createMediaStreamSource(stream);
                    microphone.connect(analyser);
                    analyser.fftSize = 256;
                    analyser.smoothingTimeConstant = 0.3;
                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    
                    let maxVolume = 0;
                    let volumeSum = 0;
                    let volumeCount = 0;
                    
                    const checkVolume = setInterval(() => {
                      analyser.getByteFrequencyData(dataArray);
                      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                      const volume = Math.min(average / 128, 1);
                      setMicTestVolume(volume);
                      volumeSum += volume;
                      volumeCount++;
                      if (volume > maxVolume) maxVolume = volume;
                    }, 100);
                    
                    setTimeout(() => {
                      clearInterval(checkVolume);
                      stream.getTracks().forEach(track => track.stop());
                      audioContext.close();
                      
                      const avgVolume = volumeCount > 0 ? volumeSum / volumeCount : 0;
                      console.log('Mic test result - max:', maxVolume, 'avg:', avgVolume);
                      
                      // 최대 볼륨이 0.05 이상이거나 평균 볼륨이 0.02 이상이면 성공
                      if (maxVolume > 0.05 || avgVolume > 0.02) {
                        setMicTestStatus('success');
                        setMicTestPassed(true);
                      } else {
                        setMicTestStatus('failed');
                        toast.error('마이크에서 음성이 감지되지 않았습니다. 마이크를 확인해주세요.');
                      }
                    }, 3000);
                  } catch (error: unknown) {
                    console.error('Microphone access error:', error);
                    setMicTestStatus('failed');
                    
                    // 에러 유형별 메시지
                    if (error instanceof Error) {
                      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                        toast.error('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
                      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                        toast.error('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
                      } else {
                        toast.error('마이크 접근 중 오류가 발생했습니다: ' + error.message);
                      }
                    } else {
                      toast.error('마이크 접근 중 오류가 발생했습니다.');
                    }
                  }
                }}
                className="w-full bg-gradient-to-r from-gold to-orange-500 hover:from-gold/90 hover:to-orange-500/90"
              >
                <Mic className="w-4 h-4 mr-2" />
                마이크 테스트 시작
              </Button>
            )}
            
            {micTestStatus === 'testing' && (
              <Button disabled className="w-full">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                테스트 중... (3초)
              </Button>
            )}
            
            {micTestStatus === 'success' && (
              <Button
                onClick={() => {
                  setShowMicTest(false);
                  toast.success('마이크 테스트 완료! 음성 면접을 시작할 수 있습니다.');
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                확인 및 닫기
              </Button>
            )}
            
            {micTestStatus === 'failed' && (
              <>
                <Button
                  onClick={() => setMicTestStatus('idle')}
                  className="w-full"
                >
                  다시 시도
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMicTest(false);
                    setMicTestPassed(true); // 강제 통과
                    toast.info('마이크 테스트를 건너뛰었습니다. 음성 인식이 잘 되지 않을 수 있습니다.');
                  }}
                  className="w-full"
                >
                  건너뛰고 계속하기
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              onClick={() => setShowMicTest(false)}
              className="w-full text-muted-foreground"
            >
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 중도 포기 확인 다이얼로그 */}
      <Dialog open={showQuitConfirmDialog} onOpenChange={setShowQuitConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ⚠️ 면접을 종료하시겠습니까?
            </DialogTitle>
            <DialogDescription>
              지금까지 답변한 {qas.filter(item => item.questionType !== "follow_up").length}개 기본 질문만 사용 처리되고, 결과는 서버에 안전하게 저장됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-medium text-amber-800">진행 현황</p>
                <ul className="text-sm text-amber-700 mt-1 space-y-1">
                  <li>• 답변 완료: {qas.filter(item => item.questionType !== "follow_up").length}개 질문</li>
                  <li>• 남은 질문: {Math.max(0, totalQuestions - qas.filter(item => item.questionType !== "follow_up").length)}개</li>
                  <li>• 꼬리질문: 추가 차감 없음</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setShowQuitConfirmDialog(false);
                const answeredBaseCount = qas.filter(item => item.questionType !== "follow_up").length;
                if (answeredBaseCount > 0 && sessionId) {
                  completeMutation.mutate({ sessionId });
                } else {
                  setLocation('/dashboard');
                  toast.info('면접이 취소되었습니다. 횟수가 차감되지 않았습니다.');
                }
              }}
              className="w-full"
            >
              면접 종료하고 결과 보기
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowQuitConfirmDialog(false)}
              className="w-full"
            >
              계속 진행하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 후기 작성 유도 팝업 */}
      <ReviewIncentiveDialog 
        open={showReviewIncentive} 
        onOpenChange={setShowReviewIncentive}
      />
    </DashboardLayout>
  );
}
