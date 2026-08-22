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
import { canContinueInterviewWizard, getQuestionRecoveryMessage, INTERVIEW_SETUP_LABELS, moveInterviewSetupStep, type InterviewSetupStep } from "@/lib/interviewWizard";
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
  GripVertical,
  Timer,
  Copy,
  Link2,
  CheckCircle,
  StopCircle
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
import InterviewCheckpoint from "@/components/InterviewCheckpoint";

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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { correctSpeechText, generateSpeechHintMessage } from "@/lib/speechDictionary";
import { escapeHtml, escapeHtmlWithBreaks } from "@/lib/safeHtml";

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
  strengths?: string | null;
  improvements?: string | null;
  suggestedAnswer?: string | null;
  suggestedAnswerShort?: string | null;
  suggestedAnswerLong?: string | null;
  improvementGuide?: string | null;
  feedbackPerspective?: string | null;
  timingInfo?: TimingInfo | null;
  followUpQuestions?: string[] | null;
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

// 드래그 가능한 질문 아이템 컴포넌트
function SortableQuestionItem({ id, question, index, onRemove }: {
  id: string;
  question: string;
  index: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 bg-background rounded border ${
        isDragging ? "border-primary shadow-lg" : "border-border"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <span className="text-xs text-muted-foreground min-w-[20px]">{index + 1}.</span>
      <span className="flex-1 text-sm truncate">{question}</span>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
      >
        <span className="text-xs">✕</span>
      </button>
    </div>
  );
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
  const [, setLocation] = useLocation();
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
  const [sessionId, setSessionId] = useState<number | null>(null);

  // 모의면접 시작 전에는 한 화면에 모든 설정을 노출하지 않고 단계별로 진행합니다.
  const [setupStep, setSetupStep] = useState<InterviewSetupStep>(0);
  const [showInterviewGuide, setShowInterviewGuide] = useState(false);
  const [questionGenerationError, setQuestionGenerationError] = useState<string | null>(null);
  const [wizardCompany, setWizardCompany] = useState("");
  const [wizardPosition, setWizardPosition] = useState("");
  const [selectedInterviewStages, setSelectedInterviewStages] = useState<Array<"basic" | "personality" | "situational" | "strategy" | "deep">>(["basic"]);
  const [recordingMode, setRecordingMode] = useState<"manual" | "automatic">("manual");
  const [silenceThreshold, setSilenceThreshold] = useState(3);
  const questionGenerationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionGenerationRequestRef = useRef(0);
  const [currentQA, setCurrentQA] = useState<QAItem | null>(null);
  const [qas, setQas] = useState<QAItem[]>([]);
  const [answer, setAnswer] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [voiceMode, setVoiceMode] = useState(() => {
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsSpeed, setTtsSpeed] = useState(0.98); // 0.8 ~ 1.5, 기본값 1.15배속
  const [ttsTone, setTtsTone] = useState<'calm' | 'energetic' | 'professional'>('professional');
  const [ttsVoiceType, setTtsVoiceType] = useState<string>('natural'); // 음성 유형 선택
  const [customPitch, setCustomPitch] = useState(1.0); // 사용자 맞춤 음높이 (0.5 ~ 1.5, 기본값 1.0)
  const [answerVersionPreference, setAnswerVersionPreference] = useState<'short' | 'long'>('long');
  
  // 음성 면접 흐름 개선을 위한 상태
  const [showVoiceConfirmDialog, setShowVoiceConfirmDialog] = useState(false);
  const [voiceConfirmType, setVoiceConfirmType] = useState<'retry' | 'next' | null>(null);
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
  
  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 드래그 종료 시 순서 변경 처리
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSelectedQuestions((items) => {
        const oldIndex = items.findIndex((item) => item === active.id);
        const newIndex = items.findIndex((item) => item === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      toast.success("질문 순서가 변경되었습니다");
    }
  }, []);
  
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
  }, [profile?.targetCompany, profile?.targetPosition]);
  const [timerOvertime, setTimerOvertime] = useState(false); // 시간 초과 여부
  const [overtimeSeconds, setOvertimeSeconds] = useState(0); // 초과 시간
  
  // 답변 시간 측정 관련 상태
  const [answerStartTime, setAnswerStartTime] = useState<number | null>(null);
  const [answerDuration, setAnswerDuration] = useState<number | null>(null); // 초 단위
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
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const audioPlayerRef = useState<HTMLAudioElement | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false); // Whisper API 변환 중
  const [useWhisperApi, setUseWhisperApi] = useState(true); // Whisper API 사용 여부
  
  // 후속 질문 관련 상태
  const [followUpDifficulty, setFollowUpDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium'); // 후속 질문 난이도
  const [continuousFollowUpMode, setContinuousFollowUpMode] = useState(false); // 꼬리 질문 연속 모드
  const [followUpCount, setFollowUpCount] = useState(0); // 현재 세션에서 후속 질문 횟수
  const [maxFollowUpCount, setMaxFollowUpCount] = useState(3); // 최대 후속 질문 횟수

  // Whisper API 음성 인식 mutation
  const whisperTranscribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      console.log('[Whisper API] 음성 인식 성공:', data.text);
      if (data.text) {
        setAnswer(prev => {
          const newAnswer = prev + (prev ? ' ' : '') + data.text.trim();
          return newAnswer;
        });
        setInterimTranscript('');
        toast.success('음성 인식 완료!');
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

  // 음성 녹음 시작 (Whisper API 연동)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      // 무음 감지를 위한 AudioContext 설정
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      audioSource.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let hasSpeech = false;
      let lastSoundAt = Date.now();
      let silenceInterval: ReturnType<typeof setInterval> | null = null;
      const detectSilence = () => {
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
          return;
        }
        if (recordingMode === "automatic" && hasSpeech && (Date.now() - lastSoundAt) / 1000 >= silenceThreshold && recorder.state !== "inactive") {
          toast.info(`${silenceThreshold}초 동안 음성이 없어 답변을 마칩니다.`);
          recorder.stop();
          setIsRecording(false);
        }
      };
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        if (silenceInterval) clearInterval(silenceInterval);
        audioContext.close();
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        setAudioChunks([]);
        stream.getTracks().forEach(track => track.stop());
        
        // Whisper API로 음성 인식 (로그인 사용자만)
        if (useWhisperApi && subscription) {
          setIsTranscribing(true);
          setInterimTranscript('음성을 텍스트로 변환 중...');
          
          try {
            // Blob을 Base64로 변환
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            );
            
            // Whisper API 호출
            whisperTranscribeMutation.mutate({
              audioBase64: base64,
              mimeType: 'audio/webm',
              language: 'ko',
            });
          } catch (error) {
            console.error('[Whisper API] Base64 변환 실패:', error);
            setIsTranscribing(false);
            setInterimTranscript('');
          }
        }
      };
      
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      recorder.start();
      if (recordingMode === "automatic") {
        silenceInterval = setInterval(detectSilence, 250);
      }
      setIsRecording(true);
      
      // Whisper API 사용 시 실시간 안내
      if (useWhisperApi && subscription) {
        setInterimTranscript('녹음 중... (녹음 종료 후 자동 변환)');
      }
    } catch (error) {
      toast.error("마이크 접근 권한이 필요합니다.");
    }
  };

  // 음성 녹음 중지
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // 녹음 재생
  const playRecording = () => {
    if (recordedAudioUrl) {
      const audio = new Audio(recordedAudioUrl);
      audio.onended = () => setIsPlayingRecording(false);
      audio.play();
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
            setSetupStep(6); // 바로 준비 완료 단계로 이동
            toast.success(`"${retryData.question.slice(0, 20)}..." 재연습을 시작합니다!`);
          }
        } catch (e) {
          console.error("Failed to parse retry_single_question", e);
        }
      }
    }
  }, [voiceMode]);

  // 음성 인식 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        // 모바일 호환성: iOS Safari는 continuous 모드를 지원하지 않음
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // iOS에서는 continuous와 interimResults 모두 false로 설정
        recognition.continuous = isIOS ? false : !isMobile;
        recognition.interimResults = isIOS ? false : true; // iOS는 interimResults 지원 안됨
        recognition.maxAlternatives = 1;
        
        recognition.onresult = (event: any) => {
          console.log('[SpeechRecognition] onresult event received:', event.results.length, 'results');
          let finalTranscript = '';
          let interim = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0]?.transcript || '';
            const confidence = result[0]?.confidence || 0;
            const isFinal = result.isFinal;
            console.log(`[SpeechRecognition] Result ${i}: "${transcript}" (isFinal: ${isFinal}, confidence: ${confidence})`);
            
            // iOS에서는 모든 결과를 final로 처리
            if (isFinal || isIOS) {
              finalTranscript += transcript;
            } else {
              interim += transcript;
            }
          }
          
          // 중간 결과 실시간 표시 - 즉시 업데이트
          if (interim) {
            console.log('[SpeechRecognition] Setting interim transcript:', interim);
            setInterimTranscript(interim);
          }
          
          if (finalTranscript) {
            console.log('[SpeechRecognition] Final transcript:', finalTranscript);
            // 전문 용어 사전으로 교정
            const correctedTranscript = correctSpeechText(finalTranscript);
            setAnswer(prev => {
              const newAnswer = prev + (prev ? ' ' : '') + correctedTranscript;
              console.log('[SpeechRecognition] Updated answer:', newAnswer);
              // 모바일에서 텍스트 입력 필드에 반영되도록 강제 업데이트
              return newAnswer;
            });
            setInterimTranscript(''); // 최종 결과 후 중간 결과 초기화
            
            // 모바일에서 성공 피드백
            if (isMobile) {
              toast.success('음성이 텍스트로 변환되었습니다!', { duration: 1500 });
            }
            
            // 실시간 피드백: 마지막 음성 감지 시간 업데이트
            setLastSpeechTime(Date.now());
            setShowSilenceWarning(false);
            setSilenceTimer(0);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // 모바일에서 no-speech 오류는 자동 재시작
          if (isMobile && event.error === 'no-speech') {
            console.log('[SpeechRecognition] Mobile no-speech, will restart');
            return; // onend에서 재시작 처리
          }
          setIsListening(false);
          switch (event.error) {
            case 'not-allowed':
              toast.error('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
              break;
            case 'no-speech':
              toast.info('음성이 감지되지 않았습니다. 다시 시도해주세요.');
              break;
            case 'audio-capture':
              toast.error('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
              break;
            case 'network':
              toast.error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
              break;
            case 'aborted':
              // 사용자가 중단한 경우 메시지 없음
              break;
            default:
              toast.error('음성 인식 오류: ' + event.error);
          }
        };
        
        recognition.onend = () => {
          console.log('[SpeechRecognition] onend called, isListening:', isListening);
          // 모바일에서 자동 재시작 (듣기 중이면)
          if (isMobile && isListening) {
            console.log('[SpeechRecognition] Mobile auto-restart');
            // 약간의 지연 후 재시작 (iOS 호환성)
            setTimeout(() => {
              try {
                recognition.start();
                console.log('[SpeechRecognition] Restarted successfully');
              } catch (e) {
                console.log('[SpeechRecognition] Restart failed:', e);
                setIsListening(false);
              }
            }, isIOS ? 500 : 100); // iOS는 더 긴 지연 필요
          } else {
            setIsListening(false);
          }
        };
        
        setSpeechRecognition(recognition);
      }
    }
  }, [isListening]);

  // 음성 인식 시작/중지 핸들러
  // Whisper API 기반 음성 녹음 시작/중지
  const toggleListening = async () => {
    // Whisper API 사용 시
    if (useWhisperApi) {
      if (isRecording) {
        // 녹음 중지 및 Whisper API로 변환
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          console.log('[Whisper API] 녹음 중지');
        }
        setIsRecording(false);
        setIsListening(false);
      } else {
        // 녹음 시작
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error('이 브라우저는 마이크를 지원하지 않습니다.');
            return;
          }
          
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // 모바일 호환성을 위한 MIME 타입 선택
          let mimeType: 'audio/webm' | 'audio/webm;codecs=opus' | 'audio/mp4' | 'audio/ogg' = 'audio/webm';
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          }
          
          const recorder = new MediaRecorder(stream, { mimeType });
          const chunks: Blob[] = [];
          
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
              console.log('[Whisper API] 오디오 청크 추가:', e.data.size, 'bytes');
            }
          };
          
          recorder.onstop = async () => {
            console.log('[Whisper API] 녹음 완료, 총', chunks.length, '개 청크');
            stream.getTracks().forEach(track => track.stop());
            
            if (chunks.length === 0) {
              toast.error('녹음된 오디오가 없습니다.');
              return;
            }
            
            const audioBlob = new Blob(chunks, { type: mimeType });
            console.log('[Whisper API] 오디오 Blob 생성:', audioBlob.size, 'bytes');
            
            // 16MB 제한 확인
            if (audioBlob.size > 16 * 1024 * 1024) {
              toast.error('오디오 파일이 너무 큽니다. (16MB 제한)');
              return;
            }
            
            // Base64로 변환
            setIsTranscribing(true);
            try {
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                console.log('[Whisper API] Base64 변환 완료, 길이:', base64.length);
                
                // Whisper API 호출
                const apiMimeType = mimeType === 'audio/webm;codecs=opus'
                  ? 'audio/webm'
                  : mimeType;
                whisperTranscribeMutation.mutate({
                  audioBase64: base64,
                  mimeType: apiMimeType,
                  language: 'ko',
                });
              };
              reader.readAsDataURL(audioBlob);
            } catch (err) {
              console.error('[Whisper API] Base64 변환 오류:', err);
              setIsTranscribing(false);
              toast.error('음성 변환에 실패했습니다.');
            }
          };
          
          recorder.onerror = (e) => {
            console.error('[Whisper API] 녹음 오류:', e);
            toast.error('녹음 중 오류가 발생했습니다.');
            setIsRecording(false);
            setIsListening(false);
          };
          
          setMediaRecorder(recorder);
          setAudioChunks([]);
          recorder.start(1000); // 1초마다 데이터 수집
          setIsRecording(true);
          setIsListening(true);
          setLastSpeechTime(Date.now());
          console.log('[Whisper API] 녹음 시작');
          toast.success('음성 녹음을 시작합니다. 말씀해주세요!');
        } catch (err: any) {
          console.error('[Whisper API] 마이크 오류:', err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            toast.error('마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
          } else if (err.name === 'NotFoundError') {
            toast.error('마이크를 찾을 수 없습니다.');
          } else {
            toast.error('마이크 접근에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
          }
        }
      }
      return;
    }
    
    // Web Speech API 폴백 (기존 코드)
    if (!speechRecognition) {
      toast.error('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
      return;
    }
    
    if (isListening) {
      try {
        speechRecognition.stop();
      } catch (e) {
        console.error('Speech recognition stop error:', e);
      }
      setIsListening(false);
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast.error('이 브라우저는 마이크를 지원하지 않습니다.');
          return;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        
        speechRecognition.start();
        setIsListening(true);
        toast.success('음성 인식을 시작합니다.');
      } catch (err: any) {
        console.error('Microphone permission error:', err);
        toast.error('마이크 접근에 실패했습니다.');
      }
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

  // TTS(Text-to-Speech) 함수 - 서버 Edge TTS API 사용 (아바타별 다른 목소리)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [ttsProviderStatus, setTtsProviderStatus] = useState<'idle' | 'loading' | 'supertonic2' | 'edge-tts' | 'web-speech' | 'text'>('idle');
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
  
  const speakQuestion = async (text: string) => {
    if (!ttsEnabled || !voiceMode) return;
    
    // 이전 오디오 중지
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    setIsTTSLoading(true);
    setTtsProviderStatus('loading');
    setIsSpeaking(true);
    
    // Edge TTS 시도
    try {
      // 아바타별 voiceStyle 반영
      const avatarVoiceStyle = selectedAvatar.voiceStyle;
      
      // 속도 계산: 아바타 설정 * 사용자 설정 배율
      const rate = avatarVoiceStyle.rate * ttsSpeed;
      // Edge TTS rate 형식으로 변환 (0.5 ~ 2.0 → -50% ~ +100%)
      const ratePercent = Math.round((rate - 1.0) * 100);
      const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
      
      // 음높이 계산: 아바타 설정 반영
      const pitch = Math.max(0.5, Math.min(2.0, avatarVoiceStyle.pitch));
      // Edge TTS pitch 형식으로 변환 (0.5 ~ 2.0 → -50Hz ~ +50Hz)
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
      
      setTtsProviderStatus(result.provider === 'supertonic2' ? 'supertonic2' : 'edge-tts');

      // 오디오 재생
      const audio = new Audio(result.audioUrl);
      audio.volume = avatarVoiceStyle.volume;
      setCurrentAudio(audio);
      
      audio.onended = async () => {
        console.log('[TTS] Edge TTS 음성 재생 완료');
        setIsSpeaking(false);
        
        // AI 음성 완료 후 타이머 시작
        if (voiceMode && timerEnabled && status === 'answering') {
          const duration = autoTimerEnabled ? getAutoTimerDuration(text) : timerDuration;
          console.log('[타이머] AI 음성 완료 후 타이머 시작:', duration, '초');
          setTimeRemaining(duration);
          setTimerActive(true);
          setTimerOvertime(false);
          setOvertimeSeconds(0);
        }
        
        // 음성 면접 안내 메시지
        if (voiceMode) {
          if (recordingMode === "automatic") {
            toast.info('질문 읽기 완료! 자동으로 녹음을 시작합니다.', { duration: 2000 });
            window.setTimeout(() => { void startRecording(); }, 500);
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
      console.error('[TTS] Edge TTS 실패, Web Speech API로 폴백:', error);
      
      // TTS 오류 로그 기록
      logTTSErrorMutation.mutate({
        errorMessage: error.message || '알 수 없는 오류',
        errorType: 'edge_tts_failure',
        questionText: text.substring(0, 500), // 최대 500자
        voiceType: selectedAvatar.voiceType,
        sessionId: sessionId || undefined,
      });
      
      // 폴백: Web Speech API 사용
      try {
        setTtsProviderStatus('web-speech');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = ttsSpeed;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onend = async () => {
          console.log('[TTS] Web Speech API 음성 재생 완료');
          setIsSpeaking(false);
          
          // AI 음성 완료 후 타이머 시작
          if (voiceMode && timerEnabled && status === 'answering') {
            const duration = autoTimerEnabled ? getAutoTimerDuration(text) : timerDuration;
            console.log('[타이머] AI 음성 완료 후 타이머 시작:', duration, '초');
            setTimeRemaining(duration);
            setTimerActive(true);
            setTimerOvertime(false);
            setOvertimeSeconds(0);
          }
          
          // 음성 면접 안내 메시지
          if (voiceMode) {
            if (recordingMode === "automatic") {
              toast.info('질문 읽기 완료! 자동으로 녹음을 시작합니다.', { duration: 2000 });
              window.setTimeout(() => { void startRecording(); }, 500);
            } else {
              toast.info('질문 읽기 완료! 마이크 버튼을 눌러 답변해주세요.', { duration: 3000 });
            }
          }
        };
        
        utterance.onerror = (event) => {
          console.error('[TTS] Web Speech API 오류:', event);
          toast.error('음성 재생에 실패했습니다. 텍스트로 진행해주세요.');
          setIsSpeaking(false);
          setIsTTSLoading(false);
        };
        
        window.speechSynthesis.speak(utterance);
        setIsTTSLoading(false);
        toast.info('기본 음성으로 재생합니다.', { duration: 2000 });
      } catch (fallbackError) {
        console.error('[TTS] 폴백도 실패:', fallbackError);
        setTtsProviderStatus('text');
        toast.error('음성 재생에 실패했습니다. 텍스트로 진행해주세요.');
        setIsSpeaking(false);
        setIsTTSLoading(false);
      }
    }
  };

  // TTS 중지 함수
  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  // 음성 목록 로드 (일부 브라우저에서 필요)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // 음성 목록이 비동기로 로드되는 경우를 위해
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);
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
        // TTS 중지
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        // 음성 인식 중지
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
      // 컴포넌트 언마운트 시 TTS 및 음성 인식 정리
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (speechRecognition) {
        speechRecognition.stop();
      }
    };
  }, [status, speechRecognition]);  // 타이머 카운트다운
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

  // 텍스트 읽기 시간 계산 함수 (한글 기준: 분당 300자, 영어: 분당 200단어)
  const calculateReadingTime = (text: string): number => {
    const koreanChars = (text.match(/[\u3131-\u318E\uAC00-\uD7A3]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const numbers = (text.match(/[0-9]+/g) || []).length;
    
    // 한글: 분당 300자 = 초당 5자
    // 영어: 분당 200단어 = 초당 3.3단어
    // 숫자: 분당 150개 = 초당 2.5개
    const readingTimeSeconds = (koreanChars / 5) + (englishWords / 3.3) + (numbers / 2.5);
    
    // 최소 2초, 최대 10초
    return Math.max(2, Math.min(10, Math.ceil(readingTimeSeconds)));
  };

  // 질문 유형에 따른 자동 타이머 설정 함수
  const getAutoTimerDuration = (question: string): number => {
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
  };

  // 질문 생성 시 타이머 시작 - 음성 모드에서는 질문 읽기 완료 후 시작, 텍스트 모드에서는 읽기 시간 후 시작
  useEffect(() => {
    if (status === 'answering' && timerEnabled && currentQA) {
      // 음성 모드이고 TTS가 활성화되어 있으면 질문 읽기 완료 후 타이머 시작
      if (voiceMode && ttsEnabled && isSpeaking) {
        // 질문 읽는 중이면 타이머 시작하지 않음
        return;
      }
      
      // 자동 타이머 설정이 활성화되어 있으면 질문 유형에 따라 타이머 설정
      const duration = autoTimerEnabled ? getAutoTimerDuration(currentQA.question) : timerDuration;
      
      // 텍스트 모드에서는 읽기 시간 후 타이머 시작
      if (!voiceMode || !ttsEnabled) {
        const readingTime = calculateReadingTime(currentQA.question);
        toast.info(`질문을 읽는 시간 ${readingTime}초 후 타이머가 시작됩니다`, { duration: readingTime * 1000 });
        
        setTimeout(() => {
          setTimeRemaining(duration);
          setTimerActive(true);
          setTimerOvertime(false);
          setOvertimeSeconds(0);
          toast.success('타이머 시작! 답변을 시작하세요.', { duration: 2000 });
        }, readingTime * 1000);
      } else {
        // 음성 모드에서는 즉시 설정 (TTS 완료 후 시작)
        setTimeRemaining(duration);
        setTimerActive(true);
        setTimerOvertime(false);
        setOvertimeSeconds(0);
      }
    } else if (status !== 'answering') {
      setTimerActive(false);
      setTimerOvertime(false);
      setOvertimeSeconds(0);
    }
  }, [status, timerEnabled, timerDuration, currentQA, autoTimerEnabled, voiceMode, ttsEnabled, isSpeaking]);

  const startMutation = trpc.interview.start.useMutation({
    onSuccess: (data) => {
      setSessionId(data.id);
      // 선택된 질문이 있으면 해당 개수로 totalQuestions 업데이트
      if (selectedQuestions.length > 0) {
        setTotalQuestions(selectedQuestions.length);
      }
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
    onSuccess: (data) => {
      if (questionGenerationTimeoutRef.current) {
        clearTimeout(questionGenerationTimeoutRef.current);
        questionGenerationTimeoutRef.current = null;
      }
      setQuestionGenerationError(null);
      const qa: QAItem = {
        id: data.id,
        question: data.question,
        questionType: data.questionType || "personality",
      };
      setCurrentQA(qa);
      setStatus("answering");
      
      // 답변 시작 시간 기록
      setAnswerStartTime(Date.now());
      setAnswerDuration(null);
      
      // 음성 모드: 바로 TTS 재생
      if (voiceMode && ttsEnabled) {
        setTimeout(() => {
          speakQuestion(data.question);
        }, 500);
      }
    },
    onError: (error) => {
      if (questionGenerationTimeoutRef.current) {
        clearTimeout(questionGenerationTimeoutRef.current);
        questionGenerationTimeoutRef.current = null;
      }
      console.error("[generateQuestion] 질문 생성 실패:", error);
      setQuestionGenerationError(getQuestionRecoveryMessage(false));
      setStatus("in_progress");
    },
  });

  const saveFollowUpMutation = trpc.interview.saveFollowUpHistory.useMutation();
  const logTTSErrorMutation = trpc.ttsMonitoring.logError.useMutation();
  
  const submitMutation = trpc.interview.submitAnswer.useMutation({
    onSuccess: (data) => {
      const updatedQA: QAItem = {
        ...currentQA!,
        userAnswer: data.userAnswer,
        feedback: data.feedback,
        score: data.score,
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
      
      // 후속 질문 히스토리 저장 (후속 질문이 있을 때만)
      if (data.followUpQuestions && data.followUpQuestions.length > 0) {
        data.followUpQuestions.forEach((fq: string, idx: number) => {
          saveFollowUpMutation.mutate({
            sessionId: sessionId || undefined,
            originalQuestion: currentQA?.question || '',
            userAnswer: data.userAnswer || '',
            followUpQuestion: fq,
            difficulty: followUpDifficulty,
            depth: followUpCount + 1,
          });
        });
      }
      
      // 꼬리 질문 연속 모드일 때 자동으로 첫 번째 후속 질문으로 진행
      if (continuousFollowUpMode && followUpCount < maxFollowUpCount && data.followUpQuestions && data.followUpQuestions.length > 0) {
        setTimeout(() => {
          const nextFollowUp = data.followUpQuestions[0];
          setCurrentQA({
            id: Date.now(),
            question: nextFollowUp,
            questionType: 'follow_up',
          });
          setAnswer('');
          setStatus('answering');
          setQuestionIndex(prev => prev + 1);
          setTotalQuestions(prev => prev + 1);
          setFollowUpCount(prev => prev + 1);
          
          toast.info(`꼬리 질문 연속 모드: ${followUpCount + 1}/${maxFollowUpCount}회`, {
            description: "자동으로 후속 질문이 진행됩니다"
          });
          
          // 음성 모드일 때 TTS로 질문 읽어주기
          if (voiceMode && ttsEnabled) {
            setTimeout(() => {
              speakQuestion(nextFollowUp);
            }, 500);
          }
        }, 2000); // 2초 후 자동 진행
      }
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
      setPassRate(data.session?.passRate || null);
      
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
    setQuestionGenerationError(null);
    setStatus("in_progress");
    questionGenerationTimeoutRef.current = setTimeout(() => {
      if (requestId !== questionGenerationRequestRef.current) return;
      generateMutation.reset();
      setQuestionGenerationError(getQuestionRecoveryMessage(true));
      setStatus("in_progress");
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
    if (!company || !position) {
      toast.error("지원 회사와 직무를 입력해주세요.");
      return;
    }
    await profileUpsertMutation.mutateAsync({
      targetCompany: company,
      targetPosition: position,
      resume: profile?.resume || undefined,
      coverLetter: profile?.coverLetter || undefined,
      experience: profile?.experience || undefined,
      education: profile?.education || undefined,
      skills: profile?.skills || undefined,
    });
    moveSetupStep(1);
  };

  const handleStart = async () => {
    if (!wizardCompany.trim() || !wizardPosition.trim()) {
      toast.error("먼저 지원 회사와 직무를 입력해주세요.");
      setSetupStep(1);
      return;
    }

    setQuestionGenerationError(null);
    setQuestionIndex(0);
    setCurrentQA(null);
    setQas([]);
    setAnswer("");
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

    // 사용 횟수 증가
    incrementUsageMutation.mutate({
      sessionId: sessionTrackingId,
      featureType: voiceMode ? "voice_interview" : "text_interview",
    });

    setStatus("starting");
    startMutation.mutate({
      sessionType: "mock_interview",
      totalQuestions: selectedQuestions.length > 0 ? selectedQuestions.length : totalQuestions,
      isVoiceMode: voiceMode,
      selectedQuestions: selectedQuestions.length > 0 ? selectedQuestions : undefined,
      interviewStages: selectedInterviewStages,
    });
  };

  const handleSubmitAnswer = () => {
    if (!answer.trim()) {
      toast.error("답변을 입력해주세요");
      return;
    }
    if (!currentQA) return;
    
    // 답변 시간 계산
    let duration = 0;
    if (answerStartTime) {
      duration = Math.round((Date.now() - answerStartTime) / 1000);
      setAnswerDuration(duration);
      setQaAnswerDurations(prev => ({ ...prev, [currentQA.id]: duration }));
    }
    
    setStatus("in_progress");
    
    // 후속 질문인지 확인
    const isFollowUp = currentQA.questionType === 'follow_up';
    
    submitMutation.mutate({
      qaId: currentQA.id,
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
      setCurrentQA(null);
      setAnswer("");
      setQuestionGenerationError(null);
      setStatus("in_progress");
      if (sessionId) {
        generateQuestion(sessionId, nextIndex);
      }
    }
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
    const hasProfileMaterial = Boolean(profile?.resume?.trim() || profile?.coverLetter?.trim());
    const canMoveFromProfile = canContinueInterviewWizard({ company: wizardCompany, position: wizardPosition, hasProfileMaterial });
    const stepTitle = setupLabels[setupStep];

    if (setupStep >= 0) {
      return (
        <DashboardLayout>
          <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
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
                      <h2 className="text-xl font-semibold">어디에 지원하시나요?</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">회사와 직무를 먼저 저장하면 이력서·자기소개서와 함께 맞춤 질문을 만듭니다.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="wizard-company">지원 회사</Label>
                        <Input id="wizard-company" value={wizardCompany} onChange={(event: ChangeEvent<HTMLInputElement>) => setWizardCompany(event.target.value)} placeholder="예: 삼성전자" autoComplete="organization" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wizard-position">지원 직무</Label>
                        <Input id="wizard-position" value={wizardPosition} onChange={(event: ChangeEvent<HTMLInputElement>) => setWizardPosition(event.target.value)} placeholder="예: 소프트웨어 개발" autoComplete="organization-title" />
                      </div>
                    </div>
                    <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
                      <div className="flex items-center gap-2">{profile?.resume ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />} 이력서 {profile?.resume ? "등록됨" : "미등록"}</div>
                      <div className="flex items-center gap-2">{profile?.coverLetter ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />} 자기소개서 {profile?.coverLetter ? "등록됨" : "미등록"}</div>
                    </div>
                    {!hasProfileMaterial && <div className="space-y-2"><p className="text-xs leading-5 text-amber-700 dark:text-amber-300">맞춤 질문을 만들려면 이력서 또는 자기소개서가 필요합니다. 등록 후 이 화면으로 돌아오세요.</p><Link href="/profile"><Button variant="outline" className="w-full">이력서·자소서 등록하기</Button></Link></div>}
                    <Button className="w-full" onClick={saveSupportInfoAndContinue} disabled={!canMoveFromProfile || !hasProfileMaterial || profileUpsertMutation.isPending}>{profileUpsertMutation.isPending ? "저장 중..." : "지원 정보 저장 후 다음"}</Button>
                  </div>
                )}

                {setupStep === 2 && (
                  <div className="space-y-5">
                    <div><h2 className="text-xl font-semibold">어떤 면접을 연습할까요?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">필요한 단계만 선택하세요. 선택한 단계의 질문과 결과가 순서대로 진행됩니다.</p></div>
                    <div className="grid gap-3">
                      {([
                        ["basic", "1단계 기본 면접", "자기소개·지원동기·장단점"],
                        ["personality", "2단계 성향 파악", "가치관과 직무 성향 문항"],
                        ["situational", "3단계 상황 대처", "롤플레잉형 업무 상황"],
                        ["strategy", "4단계 전략 게임", "집중력·기억력·문제 해결"],
                        ["deep", "5단계 심층 면접", "답변 기반 꼬리 질문"],
                      ] as const).map(([id, title, description]) => {
                        const selected = selectedInterviewStages.includes(id);
                        return <button key={id} type="button" className={`rounded-xl border p-4 text-left ${selected ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => setSelectedInterviewStages((previous) => selected ? (previous.length > 1 ? previous.filter((item) => item !== id) : previous) : [...previous, id])}>
                          <div className="flex items-start gap-3"><div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>{selected && <CheckCircle2 className="h-4 w-4" />}</div><div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>
                        </button>;
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">기본 면접은 항상 하나 이상 선택해야 합니다. 성향·게임 단계는 준비 시간이 더 필요할 수 있습니다.</p>
                    <Button className="w-full" onClick={() => moveSetupStep(1)}>면접 단계 저장 후 다음</Button>
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
                    <div><p className="mb-2 text-sm font-medium">질문 수</p><div className="grid grid-cols-3 gap-2">{[5, 7, 10].map((count) => <Button key={count} type="button" variant={totalQuestions === count ? "default" : "outline"} onClick={() => setTotalQuestions(count)}>{count}개</Button>)}</div></div>
                    <div><p className="mb-2 text-sm font-medium">질문당 답변 시간</p><div className="grid grid-cols-3 gap-2">{[60, 90, 120].map((seconds) => <Button key={seconds} type="button" variant={timerDuration === seconds ? "default" : "outline"} onClick={() => setTimerDuration(seconds)}>{seconds / 60}분</Button>)}</div></div>
                    {voiceMode && <>
                      <div><p className="mb-2 text-sm font-medium">녹음 방식</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" className={`rounded-lg border p-3 text-left ${recordingMode === "manual" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => setRecordingMode("manual")}><p className="font-medium">수동 녹음</p><p className="mt-1 text-xs text-muted-foreground">마이크 버튼을 눌러 시작·종료</p></button><button type="button" className={`rounded-lg border p-3 text-left ${recordingMode === "automatic" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => setRecordingMode("automatic")}><p className="font-medium">자동 녹음</p><p className="mt-1 text-xs text-muted-foreground">질문 재생 후 자동 시작</p></button></div></div>
                      <div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">침묵 감지</p><span className="text-sm text-muted-foreground">{silenceThreshold}초</span></div><input aria-label="침묵 감지 시간" type="range" min="2" max="5" step="1" value={silenceThreshold} onChange={(event: ChangeEvent<HTMLInputElement>) => setSilenceThreshold(Number(event.target.value))} className="w-full accent-primary" /><p className="mt-1 text-xs text-muted-foreground">말이 멈춘 뒤 설정한 시간이 지나면 답변을 제출합니다.</p></div>
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
                    <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm"><p>지원 정보: <span className="font-medium">{wizardCompany} · {wizardPosition}</span></p><p>선택 단계: <span className="font-medium">{selectedInterviewStages.length}개</span></p><p>면접 방식: <span className="font-medium">{voiceMode ? "음성" : "텍스트"}</span></p><p>면접관: <span className="font-medium">{selectedAvatar.name}</span></p><p>분량: <span className="font-medium">{totalQuestions}문항 · {timerDuration / 60}분</span></p>{voiceMode && <p>녹음: <span className="font-medium">{recordingMode === "automatic" ? `자동 · ${silenceThreshold}초 침묵 감지` : "수동"}</span></p>}</div>
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

    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">AI 모의 면접</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              실전처럼 면접을 연습하고 상세한 피드백을 받아보세요
            </p>
          </div>

          {/* 이력서/자소서 등록 유도 배너 */}
          {(!profile?.resume && !profile?.coverLetter) && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 mb-1">이력서/자소서를 등록하면 더 다채로운 답변을 받을 수 있어요!</p>
                    <p className="text-sm text-blue-700 mb-3">
                      귀하의 경험과 역량을 바탕으로 맞춤형 질문과 피드백을 제공합니다.
                    </p>
                    <Link href="/profile">
                      <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <FileText className="w-4 h-4" />
                        지금 등록하기
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">면접 정보</CardTitle>
              <CardDescription>현재 설정된 지원 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground mb-1">지원 회사</p>
                  <p className="font-medium">{profile?.targetCompany || "미설정"}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground mb-1">지원 직무</p>
                  <p className="font-medium">{profile?.targetPosition || "미설정"}</p>
                </div>
              </div>
              
              {/* 이력서/자소서 등록 상태 표시 */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg ${profile?.resume ? 'bg-green-900/20 border border-green-700' : 'bg-slate-800 border border-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    {profile?.resume ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={`text-sm ${profile?.resume ? 'text-green-700' : 'text-gray-500'}`}>
                      이력서 {profile?.resume ? '등록됨' : '미등록'}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${profile?.coverLetter ? 'bg-green-900/20 border border-green-700' : 'bg-slate-800 border border-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    {profile?.coverLetter ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={`text-sm ${profile?.coverLetter ? 'text-green-700' : 'text-gray-500'}`}>
                      자소서 {profile?.coverLetter ? '등록됨' : '미등록'}
                    </span>
                  </div>
                </div>
              </div>
              
              {(!profile?.targetCompany || !profile?.targetPosition) && (
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
                  <p className="text-sm">
                    면접을 시작하려면 먼저 프로필에서 지원 회사와 직무를 설정해주세요.
                  </p>
                  <Link href="/profile">
                    <Button variant="link" className="p-0 h-auto text-yellow-800 underline">
                      프로필 설정하기
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 음성 모드 옵션 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="w-5 h-5" />
                면접 모드 선택
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${!voiceMode ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                onClick={() => setVoiceMode(false)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">텍스트 면접</p>
                    <p className="text-sm text-muted-foreground">채팅 형식으로 면접 진행</p>
                  </div>
                </div>
                <Badge variant={!voiceMode ? "default" : "secondary"}>{!voiceMode ? '선택됨' : '기본'}</Badge>
              </div>

              {/* 텍스트 모드 선택 시 음성 유도 문구 */}
              {!voiceMode && canUseVoiceMode && (
                <div className="p-3 bg-gradient-to-r from-gold/10 to-orange-100 border border-gold/30 rounded-lg">
                  <p className="text-sm text-center">
                    <Mic className="w-4 h-4 inline mr-1 text-gold" />
                    <span className="font-medium text-gold">팁!</span> 음성 면접을 이용하면 실제 면접처럼 연습할 수 있어 <span className="font-bold">더 효과적</span>입니다!
                  </p>
                </div>
              )}

              <div 
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${voiceMode ? 'border-gold bg-gold/5 shadow-md' : 'hover:border-gold/50'} ${!canUseVoiceMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={() => canUseVoiceMode && setVoiceMode(true)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${voiceMode ? 'bg-gold/20' : 'bg-gold/10'}`}>
                    <Mic className={`w-5 h-5 ${voiceMode ? 'text-gold animate-pulse' : 'text-gold'}`} />
                  </div>
                  <div>
                    <p className="font-medium">음성 면접</p>
                    <p className="text-sm text-muted-foreground">실제 면접처럼 음성으로 진행</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!subscription && voiceUsageCount === 0 && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">🎁 1회 무료</Badge>
                  )}
                  {!subscription && voiceUsageCount >= 1 && (
                    <Badge variant="outline" className="text-xs">무료 사용 완료</Badge>
                  )}
                  {subscription && (subscription.planType === "premium" || (subscription as any)?.plan === "premium_plus") && (
                    <Badge variant="secondary" className="text-xs bg-gold/20 text-gold">프리미엄</Badge>
                  )}
                  {voiceMode && (
                    <Badge className="bg-gold text-white">선택됨</Badge>
                  )}
                  <Switch
                    checked={voiceMode}
                    onCheckedChange={setVoiceMode}
                    disabled={!canUseVoiceMode}
                  />
                </div>
              </div>

              {!subscription && voiceUsageCount === 0 && !hasCouponFreeTime && (
                <p className="text-xs text-green-600 text-center font-medium">
                  🎉 첫 방문 특별 혜택! 음성 면접을 1회 무료로 체험해보세요.
                </p>
              )}
              {hasCouponFreeTime && (
                <p className="text-xs text-amber-600 text-center font-medium">
                  🎁 쿠폰 무료 시간: {couponFreeTime?.remainingMinutes}분 남음 - 음성 면접을 이용하실 수 있습니다!
                </p>
              )}
              {!canUseVoiceMode && voiceUsageCount >= 1 && !hasCouponFreeTime && (
                <p className="text-xs text-muted-foreground text-center">
                  무료 체험을 완료하셨습니다. 계속 사용하려면 프리미엄+ 구독 또는 음성 1회권을 구매해주세요.{" "}
                  <Link href="/pricing">
                    <span className="text-primary underline cursor-pointer">요금제 보기</span>
                  </Link>
                </p>
              )}
              
              {/* 음성 면접 설정 옵션 */}
              {voiceMode && (
                <div className="mt-4 p-4 bg-gradient-to-r from-gold/5 to-orange-50 rounded-lg border border-gold/20 space-y-4">
                  <p className="text-sm font-medium text-gold flex items-center gap-2">
                    ⚙️ 음성 면접 설정
                  </p>
                  
                  {/* 아바타 음성 정보 */}
                  <div className="p-3 bg-gold/5 rounded-lg border border-gold/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{selectedAvatar.emoji}</span>
                      <div>
                        <p className="text-xs font-medium">{selectedAvatar.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedAvatar.voiceType.includes('female') ? '여성 음성' : '남성 음성'} 자동 적용
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      아바타 성별에 따라 음성이 자동으로 선택됩니다.
                    </p>
                  </div>
                  
                  {/* 음성 속도 조절 */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>음성 속도</span>
                      <span className="text-gold">{ttsSpeed}배속</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">느림</span>
                      <input
                        type="range"
                        min="0.8"
                        max="1.5"
                        step="0.1"
                        value={ttsSpeed}
                        onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold"
                      />
                      <span className="text-xs text-muted-foreground">빠름</span>
                    </div>
                  </div>
                  
                  {/* 타이머 바 표시 설정 */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">타이머 바 표시</label>
                    <Switch
                      checked={showTimerBar}
                      onCheckedChange={setShowTimerBar}
                    />
                  </div>
                  
                  {/* 음성 인식 힌트 */}
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      {generateSpeechHintMessage(profile?.targetCompany || undefined, profile?.targetPosition || undefined)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 무료 제한 배너 */}
          <FreeLimitBanner variant="inline" />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">면접 진행 안내</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>총 {totalQuestions}개의 질문이 출제됩니다</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>각 질문에 대해 답변을 작성하면 AI가 피드백을 제공합니다</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span>면접 완료 후 답변 준비도와 영역별 연습 지표를 확인할 수 있습니다</span>
                </li>
              </ul>
              
              {/* 자소서 저장 안내 */}
              {!profile?.coverLetter && (
                <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 text-lg">💡</span>
                    <div>
                      <p className="text-sm font-medium text-amber-800">프로필에 자기소개서를 저장하면 더 정확한 질문이 나와요!</p>
                      <p className="text-xs text-amber-700 mt-1">
                        자소서 내용을 기반으로 실제 면접과 유사한 적중률 높은 질문을 생성합니다.
                      </p>
                      <Link href="/profile">
                        <Button variant="outline" size="sm" className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-100">
                          프로필 관리로 이동 →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              {profile?.coverLetter && (
                <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-lg">✅</span>
                    <p className="text-sm font-medium text-green-800">자기소개서가 등록되어 있어 적중률 높은 질문이 생성됩니다!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 대표 질문 추천 */}
          <PopularQuestions 
            maxSelections={10}
            hasProfile={!!(profile?.resume || profile?.coverLetter)}
            profileResume={profile?.resume}
            profileCoverLetter={profile?.coverLetter}
            onSelectQuestions={(questions) => {
              setSelectedQuestions(questions);
            }}
            onStartInterview={(questions) => {
              // 선택된 질문으로 바로 면접 시작
              if (!profile?.targetCompany || !profile?.targetPosition) {
                toast.error("먼저 프로필에서 지원 회사와 직무를 입력해주세요");
                return;
              }
              
              // 사용 횟수 체크 (구독이 없고 쿠폰 무료 시간도 없는 경우만)
              if (!subscription && !hasCouponFreeTime) {
                // 사용 횟수 데이터가 로드되지 않았으면 대기
                if (usageCheckQuery.isLoading) {
                  toast.info("사용 횟수를 확인 중입니다. 잠시 후 다시 시도해주세요.");
                  return;
                }
                if (usageCheckQuery.data) {
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
              }
              
              // 사용 횟수 증가
              incrementUsageMutation.mutate({
                sessionId: sessionTrackingId,
                featureType: voiceMode ? "voice_interview" : "text_interview",
              });
              
              // 선택된 질문 상태 업데이트 및 면접 시작
              setSelectedQuestions(questions);
              setTotalQuestions(questions.length);
              setStatus("starting");
              startMutation.mutate({
                sessionType: "mock_interview",
                totalQuestions: questions.length,
                isVoiceMode: voiceMode,
                selectedQuestions: questions,
              });
              toast.success(`${questions.length}개 질문으로 면접을 시작합니다!`);
            }}
          />
          
          {/* 선택된 질문 표시 - 드래그 앤 드롭으로 순서 변경 가능 */}
          {selectedQuestions.length > 0 && (
            <div className="w-full p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-sm text-primary">선택된 질문 ({selectedQuestions.length}개)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">드래그하여 순서를 변경할 수 있습니다</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      console.log('공유 버튼 클릭 - selectedQuestions:', selectedQuestions);
                      if (selectedQuestions.length === 0) {
                        toast.error('공유할 질문을 선택해주세요');
                        return;
                      }
                      console.log('mutation 호출 시작');
                      shareQuestionsMutation.mutate({
                        title: `${profile?.targetCompany || '미지정'} ${profile?.targetPosition || ''} 면접 질문`,
                        questions: selectedQuestions,
                        targetCompany: profile?.targetCompany || undefined,
                        targetPosition: profile?.targetPosition || undefined,
                      });
                    }} 
                    className="text-xs h-7 gap-1"
                  >
                    <Share2 className="w-3 h-3" />
                    공유
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedQuestions([])} className="text-xs h-7">
                    전체 해제
                  </Button>
                </div>
                {/* 인라인 공유 링크 표시 */}
                {generatedShareUrl && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">공유 링크가 생성되었습니다!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={generatedShareUrl} 
                        readOnly 
                        className="flex-1 text-xs p-2 bg-white border rounded text-gray-700"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedShareUrl);
                          toast.success('링크가 클립보드에 복사되었습니다!');
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        복사
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setGeneratedShareUrl(null)}
                      >
                        닫기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedQuestions}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedQuestions.map((question, idx) => (
                      <SortableQuestionItem
                        key={question}
                        id={question}
                        question={question}
                        index={idx}
                        onRemove={() => {
                          setSelectedQuestions(prev => prev.filter((_, i) => i !== idx));
                          toast.success("질문이 제거되었습니다");
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* 면접관 아바타 선택 */}
          <div className="flex justify-center mb-4">
            <AvatarSelector
              selectedAvatarId={selectedAvatar.id}
              onSelect={(avatar) => {
                setSelectedAvatar(avatar);
                setTtsVoiceType(avatar.voiceType);
                toast.success(`${avatar.name} 면접관이 선택되었습니다`);
              }}
              disabled={status !== 'idle'}
            />
          </div>

          {/* Chrome 브라우저 권장 배너 */}
          {voiceMode && showBrowserWarning && !isChromeBrowser && (
            <div className="w-full max-w-md mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Chrome 브라우저 권장</p>
                  <p className="text-xs text-amber-700 mt-1">
                    음성 인식 기능은 Chrome 브라우저에서 가장 안정적으로 작동합니다.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs text-amber-700 hover:text-amber-800 p-0"
                    onClick={() => setShowBrowserWarning(false)}
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 마이크 권한 거부 시 안내 배너 */}
          {voiceMode && micPermissionDenied && (
            <div className="w-full max-w-md mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">마이크 권한이 거부되었습니다</p>
                  <p className="text-xs text-red-700 mt-1">
                    음성 면접을 위해 브라우저 설정에서 마이크 권한을 허용해주세요.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowMicPermissionGuide(true)}
                    >
                      권한 허용 방법
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setVoiceMode(false);
                        setMicPermissionDenied(false);
                        toast.info('텍스트 모드로 전환되었습니다');
                      }}
                    >
                      텍스트 모드로 전환
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-4 pb-6">
            {voiceMode ? (
              <>
                <div className="text-center p-4 bg-gradient-to-r from-gold/10 to-orange-100 rounded-xl border border-gold/30 w-full max-w-md">
                  <Mic className="w-8 h-8 text-gold mx-auto mb-2 animate-pulse" />
                  <p className="font-medium text-gold">음성 면접 모드 선택됨</p>
                  <p className="text-sm text-muted-foreground mt-1">마이크를 사용하여 음성으로 답변합니다</p>
                  
                  {/* 마이크 테스트 상태 표시 */}
                  {micTestPassed ? (
                    <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">마이크 테스트 완료!</span>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-gold text-gold hover:bg-gold/10"
                        onClick={() => {
                          setShowMicTest(true);
                          setMicTestStatus('idle');
                        }}
                      >
                        <Mic className="w-4 h-4" />
                        마이크 테스트하기 (권장)
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        테스트 없이도 시작 가능합니다
                      </p>
                    </div>
                  )}
                </div>
                <Button 
                  size="lg" 
                  className="gap-2 px-8 w-full sm:w-auto bg-gradient-to-r from-gold to-orange-500 hover:from-gold/90 hover:to-orange-500/90 text-white shadow-lg"
                  onClick={handleStart}
                  disabled={!profile?.targetCompany || !profile?.targetPosition}
                >
                  <Mic className="w-5 h-5" />
                  음성 면접 시작하기
                </Button>
              </>
            ) : (
              <Button 
                size="lg" 
                className="gap-2 px-8 w-full sm:w-auto"
                onClick={handleStart}
                disabled={!profile?.targetCompany || !profile?.targetPosition}
              >
                <Sparkles className="w-4 h-4" />
                텍스트 면접 시작하기
              </Button>
            )}
            
            {/* 쿠폰 입력 버튼 */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <CouponInputModal variant="compact" />
            </div>
          </div>
        </div>

        {/* 마이크 테스트 다이얼로그 - idle 화면에서도 표시 */}
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
                          setMicPermissionDenied(true);
                          setShowMicTest(false);
                          toast.error('마이크 권한이 거부되었습니다. 권한 허용 방법을 확인하거나 텍스트 모드로 전환하세요.');
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
                      setMicTestPassed(true);
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

        {/* 마이크 권한 안내 팝업 */}
        <Dialog open={showMicPermissionGuide} onOpenChange={setShowMicPermissionGuide}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-gold" />
                마이크 권한 허용 방법
              </DialogTitle>
              <DialogDescription>
                음성 면접을 위해 마이크 권한이 필요합니다
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">Chrome 브라우저</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>주소창 왼쪽의 자물쇠 아이콘을 클릭하세요</li>
                  <li>'사이트 설정' 또는 '권한'을 클릭하세요</li>
                  <li>'마이크' 항목을 '허용'으로 변경하세요</li>
                  <li>페이지를 새로고침하세요</li>
                </ol>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">Safari 브라우저 (iOS/Mac)</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>설정 &gt; Safari &gt; 웹사이트 설정으로 이동하세요</li>
                  <li>해당 웹사이트를 찾아 마이크를 허용하세요</li>
                </ol>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowMicPermissionGuide(false);
                    window.location.reload();
                  }}
                >
                  페이지 새로고침
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowMicPermissionGuide(false);
                    setVoiceMode(false);
                    setMicPermissionDenied(false);
                    toast.info('텍스트 모드로 전환되었습니다');
                  }}
                >
                  텍스트 모드로 전환
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        

      </DashboardLayout>
    );
  }

  // 질문 생성이 지연되거나 실패했을 때는 무한 로딩 대신 사용자가 다음 행동을 선택합니다.
  if (questionGenerationError && !currentQA) {
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
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0">
        {/* 홈 버튼 및 Progress */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setShowQuitConfirmDialog(true)}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">면접 종료</span>
          </Button>
          <div className="text-xs text-muted-foreground">
            ℹ️ 지금 종료하면 답변한 질문만 차감됩니다
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            질문 {questionIndex + 1} / {totalQuestions}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`w-6 sm:w-8 h-2 rounded-full ${
                  i < questionIndex ? "bg-green-500" 
                  : i === questionIndex ? "bg-primary" 
                  : "bg-secondary"
                }`}
              />
            ))}
          </div>
        </div>

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
                      {ttsProviderStatus === 'loading' ? '음성 준비 중' : ttsProviderStatus === 'supertonic2' ? 'Supertonic2' : ttsProviderStatus === 'edge-tts' ? 'Edge TTS' : ttsProviderStatus === 'web-speech' ? '브라우저 음성 폴백' : '텍스트 진행'}
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

        {status === "answering" && voiceMode && cameraEnabled && (
          <InterviewMediaCheck audio={false} video autoStart compact />
        )}

        {/* Answer Input or Feedback */}
        {status === "answering" && (
          <Card>
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
                <div className="flex flex-col items-center gap-3 p-4 sm:p-6 bg-gradient-to-r from-gold/5 to-orange-50 rounded-xl border border-gold/20">
                  <div className="flex flex-col items-center gap-3">
                    {/* 통합 마이크 버튼 (음성 인식 + 녹음 동시 시작) - 모바일에서 더 크게 */}
                    <button
                      onClick={async () => {
                        // Whisper API 사용 시 toggleListening만 호출 (녹음 + 변환 통합)
                        await toggleListening();
                      }}
                      className={`w-28 h-28 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-lg ${
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
                        녹음 중... 말씀해주세요
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
              {answer.length > 0 && (
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
              
              <Textarea
                placeholder={voiceMode ? "음성으로 입력된 내용이 여기에 표시됩니다. 직접 수정도 가능합니다." : "답변을 입력하세요..."}
                rows={8}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              
              {/* 이력서/자소서 맞춤 안내 */}
              {(!profile?.resume && !profile?.coverLetter) ? (
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
              )}
              
              {/* 개인정보 보호 안내 */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  <span className="font-medium">데이터 처리 안내:</span> 음성은 텍스트 변환을 위해 연결된 AI 서비스에서 처리되며, 앱에는 변환된 답변과 피드백이 저장됩니다. 주민등록번호·계좌번호 등 불필요한 민감정보는 입력하지 마세요.
                </p>
              </div>
              
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
                    onClick={() => {
                      if (voiceMode && answer.trim()) {
                        // 음성 모드에서도 다음 질문으로 바로 이동하지 않고 피드백 요청을 먼저 확인합니다.
                        setShowVoiceConfirmDialog(true);
                        setVoiceConfirmType('next');
                      } else {
                        handleSubmitAnswer();
                      }
                    }}
                    disabled={submitMutation.isPending || isTranscribing || !answer.trim()}
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
                        피드백 받기
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

        {status === "feedback" && currentQA && (
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

                {/* 모범답안 버전 선택 */}
                {(currentQA.suggestedAnswerShort || currentQA.suggestedAnswerLong || currentQA.suggestedAnswer) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-primary">내 답변을 고친 예시</p>
                      {currentQA.suggestedAnswerShort && currentQA.suggestedAnswerLong && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAnswerVersionPreference('short')}
                            className={`text-xs px-2 py-1 rounded ${answerVersionPreference === 'short' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                          >
                            짧은 버전
                          </button>
                          <button
                            onClick={() => setAnswerVersionPreference('long')}
                            className={`text-xs px-2 py-1 rounded ${answerVersionPreference === 'long' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                          >
                            긴 버전
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="bg-primary/5 p-4 rounded-lg text-sm">
                      <Streamdown>
                        {answerVersionPreference === 'short' && currentQA.suggestedAnswerShort
                          ? currentQA.suggestedAnswerShort
                          : currentQA.suggestedAnswerLong || currentQA.suggestedAnswer || ''}
                      </Streamdown>
                    </div>
                  </div>
                )}

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
                
                {/* 추천 후속 질문 섹션 - AI 생성 후속 질문 사용 */}
                {(currentQA.followUpQuestions && currentQA.followUpQuestions.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <p className="text-sm font-medium text-amber-700">이런 후속 질문이 나올 수 있어요</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">난이도:</span>
                        <select
                          value={followUpDifficulty}
                          onChange={(e) => setFollowUpDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                          className="text-xs border rounded px-2 py-1 bg-background"
                        >
                          <option value="easy">쉬움</option>
                          <option value="medium">보통</option>
                          <option value="hard">어려움</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* 꼬리 질문 연속 모드 토글 */}
                    <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium text-orange-700">꼬리 질문 연속 모드</span>
                          <span className="text-xs text-orange-500">(실전 압박 면접)</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={continuousFollowUpMode}
                            onChange={(e) => {
                              setContinuousFollowUpMode(e.target.checked);
                              if (!e.target.checked) {
                                setFollowUpCount(0); // 모드 해제 시 카운트 초기화
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                      </div>
                      
                      {continuousFollowUpMode && (
                        <>
                          {/* 진행 상황 표시 */}
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs text-orange-600 mb-1">
                              <span>진행 상황</span>
                              <span>{followUpCount} / {maxFollowUpCount}회</span>
                            </div>
                            <div className="w-full bg-orange-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(followUpCount / maxFollowUpCount) * 100}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* 최대 횟수 설정 */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-orange-600">최대 횟수:</span>
                            <select
                              value={maxFollowUpCount}
                              onChange={(e) => setMaxFollowUpCount(Number(e.target.value))}
                              className="text-xs border border-orange-300 rounded px-2 py-1 bg-white"
                            >
                              <option value={2}>2회</option>
                              <option value={3}>3회</option>
                              <option value={5}>5회</option>
                              <option value={10}>10회</option>
                            </select>
                          </div>
                          
                          {/* 중지 버튼 */}
                          {followUpCount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setContinuousFollowUpMode(false);
                                setFollowUpCount(0);
                                toast.info("꼬리 질문 연속 모드를 종료했습니다");
                              }}
                              className="w-full text-xs border-orange-300 text-orange-600 hover:bg-orange-100"
                            >
                              <StopCircle className="w-3 h-3 mr-1" />
                              연속 모드 중지하기
                            </Button>
                          )}
                          
                          <p className="text-xs text-orange-500 mt-2">
                            후속 질문에 답변하면 또 다른 후속 질문이 자동으로 이어집니다
                          </p>
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      {currentQA.followUpQuestions.map((fq, idx) => {
                        // 후속 질문별 예상 평가 포인트 생성
                        const getEvaluationPoint = (question: string, index: number) => {
                          const q = question.toLowerCase();
                          if (q.includes('구체적') || q.includes('예시') || q.includes('사례')) {
                            return '🎯 구체적 사례/수치 제시 능력 평가';
                          }
                          if (q.includes('어떻게') || q.includes('방법') || q.includes('과정')) {
                            return '🛠️ 문제해결 과정/방법론 평가';
                          }
                          if (q.includes('왜') || q.includes('이유') || q.includes('동기')) {
                            return '🧠 논리적 사고력/판단력 평가';
                          }
                          if (q.includes('결과') || q.includes('성과') || q.includes('효과')) {
                            return '📊 성과 측정/자기 평가 능력';
                          }
                          if (q.includes('다시') || q.includes('다르게') || q.includes('개선')) {
                            return '🔄 자기성찰/성장 가능성 평가';
                          }
                          if (q.includes('팀') || q.includes('협업') || q.includes('갈등')) {
                            return '🤝 협업/소통 능력 평가';
                          }
                          const points = [
                            '📝 답변 일관성/진정성 평가',
                            '💡 문제 인식 능력 평가',
                            '🎯 직무 이해도 평가'
                          ];
                          return points[index % points.length];
                        };
                        
                        return (
                          <div 
                            key={idx}
                            className="bg-amber-50 p-3 rounded-lg text-sm cursor-pointer hover:bg-amber-100 transition-colors border border-amber-200"
                            onClick={() => {
                              // 후속 질문으로 바로 면접 진행
                              setCurrentQA({
                                id: Date.now(),
                                question: fq,
                                questionType: 'follow_up',
                              });
                              setAnswer('');
                              setStatus('answering');
                              setQuestionIndex(prev => prev + 1);
                              setTotalQuestions(prev => prev + 1);
                              setFollowUpCount(prev => prev + 1); // 후속 질문 횟수 증가
                              
                              const difficultyLabel = followUpDifficulty === 'easy' ? '쉬움' : followUpDifficulty === 'hard' ? '어려움' : '보통';
                              toast.success(`후속 질문으로 면접을 진행합니다 (난이도: ${difficultyLabel})`, {
                                description: continuousFollowUpMode ? `연속 모드 ${followUpCount + 1}/${maxFollowUpCount}회` : "답변을 입력해주세요"
                              });
                              // 음성 모드일 때 TTS로 질문 읽어주기
                              if (voiceMode && ttsEnabled) {
                                setTimeout(() => {
                                  speakQuestion(fq);
                                }, 500);
                              }
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-amber-700 font-medium">Q{idx + 1}.</span>
                              <div className="flex-1">
                                <span className="text-slate-900 font-medium">{fq}</span>
                                <div className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                                  {getEvaluationPoint(fq, idx)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">클릭하면 해당 질문으로 바로 면접이 진행됩니다</p>
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

            <InterviewCheckpoint answers={qas} />

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
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? (
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

      {/* 음성 면접 확인 다이얼로그 */}
      <Dialog open={showVoiceConfirmDialog} onOpenChange={setShowVoiceConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎤 답변 확인
            </DialogTitle>
            <DialogDescription>
              입력하신 답변을 제출하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-800 rounded-lg p-4 my-4 max-h-40 overflow-y-auto">
            <p className="text-sm text-slate-200 whitespace-pre-wrap">
              {answer || '입력된 답변이 없습니다.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setShowVoiceConfirmDialog(false);
                handleSubmitAnswer();
              }}
              className="w-full bg-gradient-to-r from-gold to-orange-500 hover:from-gold/90 hover:to-orange-500/90"
            >
              ✅ 피드백 받기
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowVoiceConfirmDialog(false);
                setAnswer('');
                setInterimTranscript('');
                toast.info('다시 답변해주세요.');
              }}
              className="w-full"
            >
              🔄 다시 답변하기
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowVoiceConfirmDialog(false)}
              className="w-full text-muted-foreground"
            >
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              지금까지 답변한 {questionIndex}개 질문만 차감되고, 남은 {totalQuestions - questionIndex}개 질문은 다음 면접에서 사용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-medium text-amber-800">진행 현황</p>
                <ul className="text-sm text-amber-700 mt-1 space-y-1">
                  <li>• 답변 완료: {questionIndex}개 질문</li>
                  <li>• 남은 질문: {totalQuestions - questionIndex}개 (다음 면접에서 사용 가능)</li>
                  <li>• 차감 횟수: {questionIndex}회</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setShowQuitConfirmDialog(false);
                // 지금까지 답변한 내용으로 완료 처리
                if (questionIndex > 0) {
                  setStatus('completed');
                  toast.success(`면접이 종료되었습니다. ${questionIndex}개 질문에 대한 피드백을 확인하세요.`);
                } else {
                  setLocation('/');
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
