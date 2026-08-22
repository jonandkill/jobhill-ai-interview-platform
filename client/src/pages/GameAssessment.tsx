import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap,
  RotateCw,
  Home,
  Trophy,
  Target
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import RockPaperScissorsGame from "@/components/games/RockPaperScissorsGame";
import ShapeRotationGame from "@/components/games/ShapeRotationGame";
import NumberClickGame from "@/components/games/NumberClickGame";
import PathMakingGame from "@/components/games/PathMakingGame";

type GameType = 'rps' | 'rotation' | 'numberClick' | 'pathMaking' | null;

export default function GameAssessment() {
  const [selectedGame, setSelectedGame] = useState<GameType>(null);
  const [gameScores, setGameScores] = useState<Record<string, number>>({});
  
  const saveResultMutation = trpc.game.saveResult.useMutation();

  const handleGameComplete = (gameType: string, score: number, timeSpent?: number, level?: number, mistakes?: number) => {
    setGameScores(prev => ({ ...prev, [gameType]: score }));
    
    // DB에 결과 저장
    saveResultMutation.mutate({
      gameType: gameType as 'rps' | 'rotation' | 'numberClick' | 'pathMaking',
      score,
      timeSpent,
      level,
      mistakes,
    });
  };

  const handleRestart = () => {
    setSelectedGame(null);
  };

  const games = [
    {
      type: 'rps' as const,
      icon: Zap,
      title: '빠른 판단력 테스트',
      description: '가위바위보 게임으로 순발력과 빠른 판단력을 평가합니다',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      type: 'rotation' as const,
      icon: RotateCw,
      title: '공간 지각력 테스트',
      description: '도형 회전 게임으로 공간 지각력과 패턴 인식 능력을 평가합니다',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      type: 'numberClick' as const,
      icon: Target,
      title: '숫자 클릭 테스트',
      description: '숫자를 순서대로 클릭하여 집중력과 순발력을 평가합니다',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      type: 'pathMaking' as const,
      icon: Target,
      title: '길 만들기 테스트',
      description: '장애물을 피해 경로를 그려 공간 지각력과 문제 해결 능력을 평가합니다',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  if (selectedGame === null) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">AI 게임형 평가</h1>
            <p className="text-muted-foreground">
              잡다 스타일 인터랙티브 게임으로 면접 역량을 평가합니다
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {games.map((game) => {
              const Icon = game.icon;
              const score = gameScores[game.type];
              
              return (
                <Card 
                  key={game.type}
                  className="cursor-pointer hover:shadow-lg transition-shadow glass-effect"
                  onClick={() => setSelectedGame(game.type)}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-full ${game.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${game.color}`} />
                    </div>
                    <CardTitle className="flex items-center justify-between">
                      {game.title}
                      {score !== undefined && (
                        <Badge variant="secondary" className="ml-2">
                          <Trophy className="w-3 h-3 mr-1" />
                          {score}점
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{game.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full btn-neon">
                      {score !== undefined ? '다시 도전하기' : '시작하기'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {Object.keys(gameScores).length > 0 && (
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  종합 결과
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {games.map((game) => {
                    const score = gameScores[game.type];
                    if (score === undefined) return null;
                    
                    return (
                      <div key={game.type} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                        <span className="font-medium">{game.title}</span>
                        <Badge variant="default">{score}점</Badge>
                      </div>
                    );
                  })}
                  
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg">평균 점수</span>
                      <span className="text-2xl font-bold gradient-text">
                        {Math.round(
                          Object.values(gameScores).reduce((sum, score) => sum + score, 0) / 
                          Object.values(gameScores).length
                        )}점
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center">
            <Link href="/dashboard">
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                대시보드로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleRestart}>
            ← 게임 선택으로
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              대시보드
            </Button>
          </Link>
        </div>

        {selectedGame === 'rps' && (
          <RockPaperScissorsGame 
            onComplete={(score) => {
              handleGameComplete('rps', score, undefined, 1, 0);
              setTimeout(() => setSelectedGame(null), 2000);
            }}
          />
        )}

        {selectedGame === 'rotation' && (
          <ShapeRotationGame 
            onComplete={(score) => {
              handleGameComplete('rotation', score, undefined, 1, 0);
              setTimeout(() => setSelectedGame(null), 2000);
            }}
          />
        )}

        {selectedGame === 'numberClick' && (
          <NumberClickGame 
            onComplete={(score, time) => {
              handleGameComplete('numberClick', score, time, 1, 0);
              setTimeout(() => setSelectedGame(null), 2000);
            }}
            onRestart={handleRestart}
          />
        )}

        {selectedGame === 'pathMaking' && (
          <PathMakingGame 
            onComplete={(score, time) => {
              handleGameComplete('pathMaking', score, time, 1, 0);
              setTimeout(() => setSelectedGame(null), 2000);
            }}
            onRestart={handleRestart}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
