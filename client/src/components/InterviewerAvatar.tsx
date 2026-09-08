import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Users, Settings, Volume2, VolumeX } from "lucide-react";

// 면접관 아바타 음성 스타일 설정
export interface AvatarVoiceStyle {
  pitch: number; // 음높이 (0.5 ~ 2.0, 기본 1.0)
  rate: number; // 속도 (0.5 ~ 2.0, 기본 1.0)
  volume: number; // 볼륨 (0 ~ 1, 기본 1.0)
  tone: 'calm' | 'energetic' | 'professional' | 'warm' | 'strict'; // 톤
}

// 아바타별 말투 스타일 설정
export interface AvatarSpeechStyle {
  formality: 'formal' | 'semi-formal' | 'casual'; // 존댓말 정도
  questionStyle: 'direct' | 'indirect' | 'probing' | 'friendly'; // 질문 스타일
  feedbackStyle: 'strict' | 'encouraging' | 'balanced' | 'detailed'; // 피드백 스타일
  sampleSentence: string; // 음성 미리듣기용 샘플 문장
  promptStyle: string; // AI 프롬프트에 사용할 스타일 설명
}

// 면접관 아바타 타입
export interface InterviewerAvatarType {
  id: string;
  name: string;
  emoji: string;
  description: string;
  style: string; // 면접 스타일
  color: string; // 테마 색상
  voiceType: string;
  voiceStyle: AvatarVoiceStyle; // 아바타별 음성 스타일
  speechStyle: AvatarSpeechStyle; // 아바타별 말투 스타일
}

// 사용 가능한 아바타 목록 (6명 각기 다른 고유 voiceType 지정)
export const INTERVIEWER_AVATARS: InterviewerAvatarType[] = [
  {
    id: 'professional_female',
    name: '김지현 팀장',
    emoji: '👩‍💼',
    description: '대기업 인사팀 10년차 베테랑',
    style: '체계적이고 논리적인 질문을 선호합니다',
    color: 'from-blue-500 to-indigo-500',
    voiceType: 'female1', // ko-KR-SunHiNeural (또렷한 여성)
    voiceStyle: {
      pitch: 1.05,
      rate: 1.1,
      volume: 1.0,
      tone: 'professional',
    },
    speechStyle: {
      formality: 'formal',
      questionStyle: 'direct',
      feedbackStyle: 'balanced',
      sampleSentence: '안녕하세요. 오늘 면접을 담당하게 된 김지현입니다. 자기소개를 부탁드립니다.',
      promptStyle: '체계적이고 논리적인 질문을 하는 대기업 인사팀장 스타일. 존댓말을 사용하고, 질문은 명확하고 간결하게. 피드백은 구체적이고 객관적으로.',
    },
  },
  {
    id: 'friendly_female',
    name: '이수진 매니저',
    emoji: '👩',
    description: '스타트업 HR 담당자',
    style: '편안한 분위기에서 대화형 면접을 진행합니다',
    color: 'from-pink-500 to-rose-500',
    voiceType: 'female2', // ko-KR-JiMinNeural (밝은 여성)
    voiceStyle: {
      pitch: 1.2,
      rate: 1.05,
      volume: 1.0,
      tone: 'warm',
    },
    speechStyle: {
      formality: 'semi-formal',
      questionStyle: 'friendly',
      feedbackStyle: 'encouraging',
      sampleSentence: '안녕하세요! 오늘 면접 편하게 진행해볼게요. 먼저 자기소개 부탁드릴게요~',
      promptStyle: '편안하고 친근한 분위기의 스타트업 HR 담당자 스타일. 반말을 사용하고, 질문은 대화하듯 자연스럽게. 피드백은 격려하고 긍정적으로.',
    },
  },
  {
    id: 'professional_male',
    name: '박준혁 부장',
    emoji: '👨‍💼',
    description: '대기업 현업 부서장',
    style: '실무 중심의 날카로운 질문을 합니다',
    color: 'from-gray-600 to-gray-800',
    voiceType: 'male1', // ko-KR-BongJinNeural (저음 중후한 남성)
    voiceStyle: {
      pitch: 0.75,
      rate: 0.9,
      volume: 1.0,
      tone: 'strict',
    },
    speechStyle: {
      formality: 'formal',
      questionStyle: 'probing',
      feedbackStyle: 'strict',
      sampleSentence: '예. 오늘 면접 진행하겠습니다. 실무 경험에 대해 구체적으로 말씀해보세요.',
      promptStyle: '실무 중심의 날카로운 질문을 하는 대기업 현업 부서장 스타일. 존댓말을 사용하고, 질문은 구체적이고 파고드는 스타일. 피드백은 엄격하고 직설적으로.',
    },
  },
  {
    id: 'calm_male',
    name: '정민수 차장',
    emoji: '👨',
    description: '중견기업 인사담당',
    style: '차분하고 꼼꼼하게 평가합니다',
    color: 'from-green-500 to-emerald-500',
    voiceType: 'male2', // ko-KR-InJoonNeural (차분한 남성)
    voiceStyle: {
      pitch: 0.9,
      rate: 0.95,
      volume: 0.95,
      tone: 'calm',
    },
    speechStyle: {
      formality: 'formal',
      questionStyle: 'indirect',
      feedbackStyle: 'detailed',
      sampleSentence: '안녕하세요. 천천히 진행해보겠습니다. 편하게 말씀해주세요.',
      promptStyle: '차분하고 꼼꼼한 중견기업 인사담당 스타일. 존댓말을 사용하고, 질문은 부드럽고 우회적으로. 피드백은 세부적이고 구체적으로.',
    },
  },
  {
    id: 'tech_lead',
    name: '최현우 리드',
    emoji: '🧑‍💻',
    description: 'IT기업 기술 면접관',
    style: '기술적 깊이와 문제해결 능력을 중시합니다',
    color: 'from-purple-500 to-violet-500',
    voiceType: 'male2', // 기술 면접관 (차분하지만 빠른 템포)
    voiceStyle: {
      pitch: 1.0,
      rate: 1.15,
      volume: 1.0,
      tone: 'professional',
    },
    speechStyle: {
      formality: 'semi-formal',
      questionStyle: 'direct',
      feedbackStyle: 'detailed',
      sampleSentence: '안녕하세요. 기술 면접 진행하겠습니다. 문제 해결 경험에 대해 말씀해주세요.',
      promptStyle: '기술적 깊이와 문제해결 능력을 중시하는 IT기업 기술 면접관 스타일. 존댓말을 사용하되 편하게, 질문은 기술적이고 구체적으로. 피드백은 기술적 관점에서 상세하게.',
    },
  },
  {
    id: 'executive',
    name: '한승민 상무',
    emoji: '🧑‍💼',
    description: '임원 면접 담당',
    style: '비전과 리더십, 조직 적합성을 평가합니다',
    color: 'from-amber-500 to-orange-500',
    voiceType: 'male1', // 임원 면접관 (매우 낮은 저음과 무게감)
    voiceStyle: {
      pitch: 0.7,
      rate: 0.85,
      volume: 1.0,
      tone: 'strict',
    },
    speechStyle: {
      formality: 'formal',
      questionStyle: 'probing',
      feedbackStyle: 'strict',
      sampleSentence: '오늘 면접 진행하겠습니다. 우리 회사에 왔을 때 어떤 비전을 가지고 있습니까?',
      promptStyle: '비전과 리더십, 조직 적합성을 평가하는 임원 면접관 스타일. 존댓말을 사용하고, 질문은 거시적이고 전략적으로. 피드백은 엄격하고 핵심을 짜르는 스타일.',
    },
  },
];

// 감정 상태 타입
export type EmotionType = 'neutral' | 'pleased' | 'thinking' | 'encouraging' | 'serious' | 'surprised';

// 감정별 이모지 매핑
export const EMOTION_EMOJIS: Record<EmotionType, string> = {
  neutral: '😐',
  pleased: '😊',
  thinking: '🤔',
  encouraging: '😄',
  serious: '😑',
  surprised: '😮',
};

// 점수에 따른 감정 결정
export const getEmotionByScore = (score: number): EmotionType => {
  if (score >= 85) return 'pleased';
  if (score >= 70) return 'encouraging';
  if (score >= 50) return 'thinking';
  if (score >= 30) return 'serious';
  return 'neutral';
};

interface InterviewerAvatarProps {
  selectedAvatar: InterviewerAvatarType;
  emotion?: EmotionType;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showEmotion?: boolean;
  animated?: boolean;
}

export function InterviewerAvatarDisplay({
  selectedAvatar,
  emotion = 'neutral',
  size = 'md',
  showName = true,
  showEmotion = false,
  animated = false,
}: InterviewerAvatarProps & { isSpeaking?: boolean }) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-16 h-16 text-3xl',
    lg: 'w-24 h-24 text-5xl',
  };

  const isSpeaking = (animated as unknown) as boolean;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${isSpeaking ? 'scale-105 transition-transform' : ''}`}>
        <div 
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${selectedAvatar.color} flex items-center justify-center shadow-lg ${isSpeaking ? 'ring-4 ring-primary/50 animate-pulse' : ''}`}
        >
          <span>{selectedAvatar.emoji}</span>
        </div>
        {isSpeaking && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-end gap-0.5 bg-background/90 px-2 py-0.5 rounded-full shadow border text-[10px] text-primary font-bold">
            <span className="w-1 h-3 bg-primary animate-bounce rounded-full" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-5 bg-primary animate-bounce rounded-full" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-2 bg-primary animate-bounce rounded-full" style={{ animationDelay: '300ms' }} />
            <span className="w-1 h-4 bg-primary animate-bounce rounded-full" style={{ animationDelay: '450ms' }} />
          </div>
        )}
        {showEmotion && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow border text-sm">
            {EMOTION_EMOJIS[emotion]}
          </div>
        )}
      </div>
      {showName && (
        <div className="text-center">
          <p className="font-medium text-sm">{selectedAvatar.name}</p>
          <p className="text-xs text-muted-foreground">{selectedAvatar.description}</p>
        </div>
      )}
    </div>
  );
}

interface AvatarSelectorProps {
  selectedAvatarId: string;
  onSelect: (avatar: InterviewerAvatarType) => void;
  disabled?: boolean;
}

export function AvatarSelector({ selectedAvatarId, onSelect, disabled = false }: AvatarSelectorProps) {
  const [open, setOpen] = useState(false);
  const [previewingAvatarId, setPreviewingAvatarId] = useState<string | null>(null);
  const selectedAvatar = INTERVIEWER_AVATARS.find(a => a.id === selectedAvatarId) || INTERVIEWER_AVATARS[0];

  // 음성 미리듣기 함수
  const previewVoice = (avatar: InterviewerAvatarType, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // 이전 음성 중지
      window.speechSynthesis.cancel();
      
      // 같은 아바타 클릭 시 중지만
      if (previewingAvatarId === avatar.id) {
        setPreviewingAvatarId(null);
        return;
      }
      
      setPreviewingAvatarId(avatar.id);
      
      const utterance = new SpeechSynthesisUtterance(avatar.speechStyle.sampleSentence);
      utterance.lang = 'ko-KR';
      utterance.pitch = avatar.voiceStyle.pitch;
      utterance.rate = avatar.voiceStyle.rate;
      utterance.volume = avatar.voiceStyle.volume;
      
      // 한국어 음성 찾기
      const voices = window.speechSynthesis.getVoices();
      const koreanVoices = voices.filter(voice => voice.lang.includes('ko'));
      
      let selectedVoice: SpeechSynthesisVoice | undefined;
      const isMale = avatar.voiceType === 'park' || avatar.voiceType === 'jeong' || avatar.voiceType === 'han' || avatar.voiceType === 'male1' || avatar.voiceType === 'male2';
      
      switch (avatar.voiceType) {
        case 'kim':
        case 'female1':
          selectedVoice = koreanVoices.find(v => v.name.includes('SunHi') || v.name.includes('Yuna') || v.name.includes('Female')) || koreanVoices[0];
          break;
        case 'lee':
        case 'female2':
          selectedVoice = koreanVoices.find(v => v.name.includes('JiMin') || v.name.includes('Heami') || v.name.includes('Sun')) || koreanVoices[0];
          break;
        case 'park':
        case 'han':
        case 'male1':
          selectedVoice = koreanVoices.find(v => v.name.includes('BongJin') || v.name.includes('InJoon') || v.name.includes('Male') || v.name.includes('Jinho')) || koreanVoices[koreanVoices.length - 1];
          break;
        case 'jeong':
        case 'choi':
        case 'male2':
          selectedVoice = koreanVoices.find(v => v.name.includes('InJoon') || v.name.includes('Junwoo') || v.name.includes('Male')) || koreanVoices[koreanVoices.length - 1];
          break;
        default:
          selectedVoice = koreanVoices.find(v => isMale ? (v.name.includes('Male') || v.name.includes('남성')) : (v.name.includes('Female') || v.name.includes('여성'))) || koreanVoices[0];
          break;
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.onend = () => {
        setPreviewingAvatarId(null);
      };
      
      utterance.onerror = () => {
        setPreviewingAvatarId(null);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // 다이얼로그 닫힘 시 음성 중지
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setPreviewingAvatarId(null);
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 h-auto py-2"
          disabled={disabled}
        >
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${selectedAvatar.color} flex items-center justify-center text-lg`}>
            {selectedAvatar.emoji}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{selectedAvatar.name}</p>
            <p className="text-xs text-muted-foreground">면접관 변경</p>
          </div>
          <Settings className="w-4 h-4 ml-2 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            면접관 선택
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          {INTERVIEWER_AVATARS.map((avatar) => (
            <Card 
              key={avatar.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedAvatarId === avatar.id 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => {
                onSelect(avatar);
                setOpen(false);
              }}
            >
              <CardContent className="p-4 text-center">
                <div 
                  className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center text-3xl mb-3`}
                >
                  {avatar.emoji}
                </div>
                <p className="font-medium text-sm">{avatar.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{avatar.description}</p>
                <p className="text-xs text-primary/70 mt-2 italic">"{avatar.style}"</p>
                
                {/* 음성 미리듣기 버튼 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 text-xs w-full bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-medium"
                  onClick={(e) => previewVoice(avatar, e)}
                >
                  {previewingAvatarId === avatar.id ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                      🔊 목소리 재생 중...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      🔊 음성 미리듣기
                    </>
                  )}
                </Button>
                
                {selectedAvatarId === avatar.id && (
                  <Badge className="mt-2">선택됨</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 면접 중 아바타 표시 컴포넌트
interface InterviewingAvatarProps {
  avatar: InterviewerAvatarType;
  isSpeaking?: boolean;
  emotion?: EmotionType;
  message?: string;
}

export function InterviewingAvatar({ 
  avatar, 
  isSpeaking = false, 
  emotion = 'neutral',
  message 
}: InterviewingAvatarProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="relative">
        {/* 아바타 원형 */}
        <div 
          className={`w-24 h-24 rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center text-4xl shadow-xl border-4 border-background ${
            isSpeaking ? 'animate-pulse ring-4 ring-cyan-400/50' : ''
          }`}
        >
          {avatar.emoji}
        </div>
        {/* 감정 이모지 */}
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background rounded-full flex items-center justify-center shadow-lg border-2 border-border text-lg">
          {EMOTION_EMOJIS[emotion]}
        </div>
      </div>
      
      {/* 이름 및 상태 */}
      <div className="text-center">
        <p className="font-semibold text-foreground">{avatar.name}</p>
        {isSpeaking && (
          <Badge variant="secondary" className="mt-2 text-xs animate-pulse bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            말하는 중...
          </Badge>
        )}
        {message && (
          <p className="text-sm text-muted-foreground mt-2">{message}</p>
        )}
      </div>
    </div>
  );
}

export default InterviewerAvatarDisplay;
