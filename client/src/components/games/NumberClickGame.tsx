import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, Target, Zap } from "lucide-react";

interface NumberClickGameProps {
  onComplete: (score: number, time: number) => void;
  onRestart: () => void;
}

export default function NumberClickGame({ onComplete, onRestart }: NumberClickGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [numbers, setNumbers] = useState<Array<{ value: number; x: number; y: number; clicked: boolean }>>([]);
  const [currentTarget, setCurrentTarget] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [level, setLevel] = useState(1); // 난이도 (1-3)
  
  const maxNumber = 10 + (level - 1) * 5; // 레벨별 숫자 개수

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [gameState, startTime]);

  const generateNumbers = useCallback(() => {
    const newNumbers = [];
    for (let i = 1; i <= maxNumber; i++) {
      newNumbers.push({
        value: i,
        x: Math.random() * 80 + 5, // 5-85% 범위
        y: Math.random() * 80 + 5,
        clicked: false,
      });
    }
    setNumbers(newNumbers);
  }, [maxNumber]);

  const startGame = () => {
    generateNumbers();
    setGameState('playing');
    setStartTime(Date.now());
    setCurrentTarget(1);
    setMistakes(0);
    setElapsedTime(0);
  };

  const handleNumberClick = (value: number) => {
    if (value === currentTarget) {
      // 정답
      setNumbers(prev => 
        prev.map(n => n.value === value ? { ...n, clicked: true } : n)
      );
      
      if (value === maxNumber) {
        // 게임 완료
        const finalTime = Date.now() - (startTime || 0);
        const score = calculateScore(finalTime, mistakes);
        setGameState('finished');
        onComplete(score, finalTime);
      } else {
        setCurrentTarget(prev => prev + 1);
      }
    } else {
      // 오답
      setMistakes(prev => prev + 1);
    }
  };

  const calculateScore = (time: number, mistakes: number) => {
    const timeInSeconds = time / 1000;
    const baseScore = 100;
    const timePenalty = Math.min(timeInSeconds * 0.5, 50); // 최대 50점 감점
    const mistakePenalty = mistakes * 5; // 실수당 5점 감점
    return Math.max(0, Math.round(baseScore - timePenalty - mistakePenalty));
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}초`;
  };

  if (gameState === 'ready') {
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            숫자 순서대로 클릭하기
          </CardTitle>
          <CardDescription>
            1부터 {maxNumber}까지 순서대로 빠르게 클릭하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold text-blue-500 mb-2">게임 규칙</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 화면에 흩어진 숫자를 1부터 순서대로 클릭하세요</li>
              <li>• 빠른 시간 내에 완료할수록 높은 점수를 받습니다</li>
              <li>• 잘못된 숫자를 클릭하면 감점됩니다</li>
              <li>• 집중력과 순발력을 평가합니다</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">난이도 선택</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={level === 1 ? "default" : "outline"}
                onClick={() => setLevel(1)}
              >
                쉬움 (10개)
              </Button>
              <Button
                variant={level === 2 ? "default" : "outline"}
                onClick={() => setLevel(2)}
              >
                보통 (15개)
              </Button>
              <Button
                variant={level === 3 ? "default" : "outline"}
                onClick={() => setLevel(3)}
              >
                어려움 (20개)
              </Button>
            </div>
          </div>

          <Button onClick={startGame} className="w-full btn-neon">
            <Zap className="w-4 h-4 mr-2" />
            게임 시작
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'finished') {
    const finalScore = calculateScore(elapsedTime, mistakes);
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            게임 완료!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">점수</p>
              <p className="text-3xl font-bold text-green-500">{finalScore}점</p>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">소요 시간</p>
              <p className="text-2xl font-bold text-blue-500">{formatTime(elapsedTime)}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">실수 횟수</span>
              <Badge variant={mistakes === 0 ? "default" : "secondary"}>
                {mistakes}회
              </Badge>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm font-medium text-blue-500 mb-2">평가 결과</p>
            <p className="text-sm text-muted-foreground">
              {finalScore >= 80 ? "이번 시도에서는 숫자 순서를 안정적으로 찾았습니다." :
               finalScore >= 60 ? "이번 시도에는 일부 오클릭이나 탐색 지연이 있었습니다." :
               "왼쪽부터 구역을 나눠 일정한 순서로 탐색해보세요."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={startGame} variant="outline">
              다시 도전
            </Button>
            <Button onClick={onRestart}>
              게임 선택으로
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Playing state
  return (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            다음 숫자: <span className="text-blue-500">{currentTarget}</span>
          </CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {formatTime(elapsedTime)}
            </Badge>
            <Badge variant={mistakes === 0 ? "default" : "destructive"}>
              실수: {mistakes}회
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[500px] bg-slate-900/50 rounded-lg border border-slate-700">
          {numbers.map((num) => (
            <button
              key={num.value}
              onClick={() => handleNumberClick(num.value)}
              disabled={num.clicked}
              className={`absolute w-12 h-12 rounded-full font-bold text-lg transition-all ${
                num.clicked
                  ? 'bg-green-500/30 text-green-300 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-110 active:scale-95'
              }`}
              style={{
                left: `${num.x}%`,
                top: `${num.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {num.value}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
