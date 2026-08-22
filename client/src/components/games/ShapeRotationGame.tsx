import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCw, Trophy, Timer, Zap, Target } from "lucide-react";

interface Shape {
  type: 'triangle' | 'square' | 'pentagon';
  rotation: number; // 0, 90, 180, 270
  targetRotation: number;
}

interface ShapeRotationGameProps {
  onComplete: (score: number) => void;
  duration?: number;
}

const generateRandomShape = (): Shape => {
  const types: Shape['type'][] = ['triangle', 'square', 'pentagon'];
  const rotations = [0, 90, 180, 270];
  
  const type = types[Math.floor(Math.random() * types.length)];
  const rotation = rotations[Math.floor(Math.random() * rotations.length)];
  const targetRotation = rotations[Math.floor(Math.random() * rotations.length)];
  
  return { type, rotation, targetRotation };
};

const ShapeDisplay = ({ type, rotation }: { type: Shape['type']; rotation: number }) => {
  const getShapePath = () => {
    switch (type) {
      case 'triangle':
        return 'M 50 10 L 90 90 L 10 90 Z';
      case 'square':
        return 'M 20 20 L 80 20 L 80 80 L 20 80 Z';
      case 'pentagon':
        return 'M 50 10 L 90 40 L 75 90 L 25 90 L 10 40 Z';
    }
  };

  return (
    <svg 
      width="120" 
      height="120" 
      viewBox="0 0 100 100"
      className="transition-transform duration-300"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path
        d={getShapePath()}
        fill="currentColor"
        className="text-primary"
      />
    </svg>
  );
};

export default function ShapeRotationGame({ onComplete, duration = 45 }: ShapeRotationGameProps) {
  const [shape, setShape] = useState<Shape>(generateRandomShape());
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

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

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setRound(0);
    setTimeLeft(duration);
    setShape(generateRandomShape());
    setFeedback(null);
  };

  const rotateShape = () => {
    if (!isPlaying) return;
    
    setShape(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  };

  const checkAnswer = () => {
    if (!isPlaying) return;
    
    const isCorrect = shape.rotation === shape.targetRotation;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    if (isCorrect) {
      setScore(prev => prev + 15);
    } else {
      setScore(prev => Math.max(0, prev - 5));
    }
    
    setRound(prev => prev + 1);
    
    // 다음 문제로
    setTimeout(() => {
      setShape(generateRandomShape());
      setFeedback(null);
    }, 800);
  };

  // 키보드 입력 처리
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        rotateShape();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        checkAnswer();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, shape]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-blue-500" />
          공간 지각력 테스트 - 도형 회전
        </CardTitle>
        <CardDescription>
          {isPlaying ? (
            <span className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              남은 시간: {timeLeft}초 | 점수: {score}점 | 라운드: {round}
            </span>
          ) : (
            "도형을 회전시켜 목표 각도에 맞추세요! (스페이스바: 회전, 엔터: 확인)"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isPlaying && timeLeft === duration ? (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <p className="text-lg mb-4">공간 지각력과 패턴 인식 능력을 테스트합니다</p>
            <p className="text-sm text-muted-foreground mb-6">
              도형을 회전시켜 목표 각도에 정확히 맞추세요!
            </p>
            <Button onClick={startGame} size="lg" className="btn-neon">
              게임 시작
            </Button>
          </div>
        ) : timeLeft === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-blue-500 mx-auto mb-4" />
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
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">목표 각도</p>
              <div className="inline-block p-4 bg-secondary/20 rounded-lg mb-6">
                <ShapeDisplay type={shape.type} rotation={shape.targetRotation} />
                <p className="text-xs text-muted-foreground mt-2">{shape.targetRotation}°</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Target className="w-6 h-6 text-muted-foreground" />
              <div className="h-px flex-1 bg-border" />
              <Zap className="w-6 h-6 text-yellow-500" />
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">현재 도형 (회전시키세요)</p>
              <div className="inline-block p-4 bg-primary/10 rounded-lg mb-4 relative">
                <ShapeDisplay type={shape.type} rotation={shape.rotation} />
                <p className="text-xs text-muted-foreground mt-2">{shape.rotation}°</p>
                
                {feedback && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <Badge 
                      variant={feedback === 'correct' ? 'default' : 'destructive'}
                      className="text-lg px-4 py-2"
                    >
                      {feedback === 'correct' ? '정답! +15점' : '오답! -5점'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={rotateShape}
                disabled={feedback !== null}
                className="flex-1 h-16"
                variant="outline"
              >
                <RotateCw className="w-5 h-5 mr-2" />
                회전 (스페이스바)
              </Button>
              <Button
                onClick={checkAnswer}
                disabled={feedback !== null}
                className="flex-1 h-16 btn-neon"
              >
                <Target className="w-5 h-5 mr-2" />
                확인 (엔터)
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              스페이스바로 회전, 엔터로 확인하세요!
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
