import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hand, Scissors, FileText, Trophy, Timer, Zap } from "lucide-react";

type Choice = 'rock' | 'paper' | 'scissors';
type GameMode = 'win' | 'lose'; // 이기기 모드 vs 지기 모드

interface RockPaperScissorsGameProps {
  onComplete: (score: number) => void;
  duration?: number; // 게임 시간 (초)
}

const choices: { value: Choice; icon: any; label: string; color: string }[] = [
  { value: 'rock', icon: Hand, label: '바위', color: 'bg-gray-600' },
  { value: 'paper', icon: FileText, label: '보', color: 'bg-blue-600' },
  { value: 'scissors', icon: Scissors, label: '가위', color: 'bg-red-600' },
];

const getWinner = (player: Choice, computer: Choice, mode: GameMode): 'win' | 'lose' | 'draw' => {
  if (player === computer) return 'draw';
  
  const playerWins = 
    (player === 'rock' && computer === 'scissors') ||
    (player === 'paper' && computer === 'rock') ||
    (player === 'scissors' && computer === 'paper');
  
  if (mode === 'win') {
    return playerWins ? 'win' : 'lose';
  } else {
    // 지기 모드: 플레이어가 져야 점수를 얻음
    return playerWins ? 'lose' : 'win';
  }
};

export default function RockPaperScissorsGame({ onComplete, duration = 30 }: RockPaperScissorsGameProps) {
  const [gameMode, setGameMode] = useState<GameMode>('win');
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [modeChangeCountdown, setModeChangeCountdown] = useState<number | null>(null);

  // 타이머
  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsPlaying(false);
          onComplete(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score, onComplete]);

  // 모드 변경 카운트다운
  useEffect(() => {
    if (modeChangeCountdown === null || modeChangeCountdown <= 0) return;
    
    const timer = setTimeout(() => {
      setModeChangeCountdown(prev => prev! - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [modeChangeCountdown]);

  // 랜덤 모드 변경 (5~10라운드마다)
  useEffect(() => {
    if (round > 0 && round % (Math.floor(Math.random() * 6) + 5) === 0) {
      const newMode: GameMode = gameMode === 'win' ? 'lose' : 'win';
      setGameMode(newMode);
      setModeChangeCountdown(3); // 3초 카운트다운
    }
  }, [round]);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setRound(0);
    setTimeLeft(duration);
    setResult(null);
    setComputerChoice(null);
    setGameMode('win');
    setModeChangeCountdown(null);
  };

  const handleChoice = useCallback((playerChoice: Choice) => {
    if (!isPlaying || modeChangeCountdown !== null) return;
    
    const randomChoice = choices[Math.floor(Math.random() * 3)].value;
    setComputerChoice(randomChoice);
    
    const gameResult = getWinner(playerChoice, randomChoice, gameMode);
    setResult(gameResult);
    
    if (gameResult === 'win') {
      setScore(prev => prev + 10);
    } else if (gameResult === 'lose') {
      setScore(prev => Math.max(0, prev - 5));
    }
    
    setRound(prev => prev + 1);
    
    // 0.5초 후 초기화
    setTimeout(() => {
      setComputerChoice(null);
      setResult(null);
    }, 500);
  }, [isPlaying, gameMode, modeChangeCountdown]);

  // 키보드 입력 처리
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || modeChangeCountdown !== null) return;
      
      if (e.key === 'ArrowLeft') {
        handleChoice('rock');
      } else if (e.key === 'ArrowUp') {
        handleChoice('paper');
      } else if (e.key === 'ArrowRight') {
        handleChoice('scissors');
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, handleChoice, modeChangeCountdown]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          빠른 판단력 테스트 - 가위바위보
        </CardTitle>
        <CardDescription>
          {isPlaying ? (
            <span className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              남은 시간: {timeLeft}초 | 점수: {score}점 | 라운드: {round}
            </span>
          ) : (
            "키보드 화살표로 빠르게 선택하세요! (← 바위, ↑ 보, → 가위)"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPlaying && timeLeft === duration ? (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-lg mb-4">빠른 판단력과 순발력을 테스트합니다</p>
            <p className="text-sm text-muted-foreground mb-6">
              모드가 랜덤하게 변경됩니다. "이기기" 모드에서는 이겨야 하고, "지기" 모드에서는 져야 점수를 얻습니다!
            </p>
            <Button onClick={startGame} size="lg" className="btn-neon">
              게임 시작
            </Button>
          </div>
        ) : timeLeft === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-2xl font-bold mb-2">게임 종료!</p>
            <p className="text-lg mb-4">최종 점수: {score}점</p>
            <p className="text-sm text-muted-foreground mb-6">
              총 {round}라운드 플레이
            </p>
            <Button onClick={startGame} variant="outline">
              다시 하기
            </Button>
          </div>
        ) : (
          <>
            {/* 모드 변경 카운트다운 */}
            {modeChangeCountdown !== null && modeChangeCountdown > 0 && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white mb-4">
                    모드 변경!
                  </p>
                  <p className="text-2xl text-yellow-400 mb-4">
                    {gameMode === 'win' ? '이기기 모드' : '지기 모드'}
                  </p>
                  <p className="text-6xl font-bold text-white">
                    {modeChangeCountdown}
                  </p>
                </div>
              </div>
            )}

            {/* 현재 모드 표시 */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant={gameMode === 'win' ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                {gameMode === 'win' ? '🏆 이기기 모드' : '🎯 지기 모드'}
              </Badge>
            </div>

            {/* 컴퓨터 선택 표시 */}
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mb-2">컴퓨터</p>
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                {computerChoice ? (
                  (() => {
                    const choice = choices.find(c => c.value === computerChoice);
                    const Icon = choice?.icon;
                    return Icon ? <Icon className="w-12 h-12 text-white" /> : null;
                  })()
                ) : (
                  <span className="text-2xl">?</span>
                )}
              </div>
              {result && (
                <Badge 
                  variant={result === 'win' ? 'default' : result === 'lose' ? 'destructive' : 'secondary'}
                  className="mt-2"
                >
                  {result === 'win' ? '성공! +10점' : result === 'lose' ? '실패! -5점' : '무승부'}
                </Badge>
              )}
            </div>

            {/* 플레이어 선택 버튼 */}
            <div className="grid grid-cols-3 gap-4">
              {choices.map(({ value, icon: Icon, label, color }) => (
                <Button
                  key={value}
                  onClick={() => handleChoice(value)}
                  disabled={modeChangeCountdown !== null}
                  className={`h-32 flex flex-col items-center justify-center gap-2 ${color} hover:opacity-80 transition-opacity`}
                >
                  <Icon className="w-8 h-8" />
                  <span className="text-lg font-bold">{label}</span>
                  <span className="text-xs opacity-75">
                    {value === 'rock' ? '←' : value === 'paper' ? '↑' : '→'}
                  </span>
                </Button>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              키보드 화살표 키로 빠르게 선택하세요!
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
