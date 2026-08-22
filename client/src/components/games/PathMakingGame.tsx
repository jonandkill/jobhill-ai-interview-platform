import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Route, Target, Zap, Timer } from "lucide-react";

interface PathMakingGameProps {
  onComplete: (score: number, time: number) => void;
  onRestart: () => void;
}

type CellType = 'empty' | 'start' | 'end' | 'path' | 'obstacle';

interface Cell {
  type: CellType;
  row: number;
  col: number;
}

export default function PathMakingGame({ onComplete, onRestart }: PathMakingGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [path, setPath] = useState<Array<{ row: number; col: number }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [level, setLevel] = useState(1);
  const [startPos, setStartPos] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [endPos, setEndPos] = useState<{ row: number; col: number }>({ row: 0, col: 0 });

  const gridSize = 8 + level * 2; // 레벨별 그리드 크기
  const obstacleCount = level * 5; // 레벨별 장애물 개수

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [gameState, startTime]);

  const initializeGrid = useCallback(() => {
    const newGrid: Cell[][] = [];
    
    // 빈 그리드 생성
    for (let row = 0; row < gridSize; row++) {
      newGrid[row] = [];
      for (let col = 0; col < gridSize; col++) {
        newGrid[row][col] = { type: 'empty', row, col };
      }
    }

    // 시작점과 끝점 설정
    const start = { row: 0, col: 0 };
    const end = { row: gridSize - 1, col: gridSize - 1 };
    newGrid[start.row][start.col].type = 'start';
    newGrid[end.row][end.col].type = 'end';
    setStartPos(start);
    setEndPos(end);

    // 장애물 배치 (시작점과 끝점 제외)
    let placedObstacles = 0;
    while (placedObstacles < obstacleCount) {
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      
      if (newGrid[row][col].type === 'empty') {
        newGrid[row][col].type = 'obstacle';
        placedObstacles++;
      }
    }

    setGrid(newGrid);
    setPath([start]);
  }, [gridSize, obstacleCount]);

  const startGame = () => {
    initializeGrid();
    setGameState('playing');
    setStartTime(Date.now());
    setElapsedTime(0);
  };

  const handleCellMouseDown = (row: number, col: number) => {
    if (grid[row][col].type === 'start') {
      setIsDrawing(true);
      setPath([{ row, col }]);
    }
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isDrawing) return;
    
    const cell = grid[row][col];
    if (cell.type === 'obstacle') return;
    
    const lastPos = path[path.length - 1];
    
    // 인접한 셀만 허용 (대각선 제외)
    const isAdjacent = 
      (Math.abs(row - lastPos.row) === 1 && col === lastPos.col) ||
      (Math.abs(col - lastPos.col) === 1 && row === lastPos.row);
    
    if (!isAdjacent) return;
    
    // 이미 경로에 있는 셀인지 확인
    const alreadyInPath = path.some(p => p.row === row && p.col === col);
    if (alreadyInPath) return;
    
    setPath(prev => [...prev, { row, col }]);
    
    // 끝점에 도달했는지 확인
    if (row === endPos.row && col === endPos.col) {
      setIsDrawing(false);
      const finalTime = Date.now() - (startTime || 0);
      const score = calculateScore(finalTime, path.length + 1);
      setGameState('finished');
      onComplete(score, finalTime);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const calculateScore = (time: number, pathLength: number) => {
    const timeInSeconds = time / 1000;
    const optimalPath = gridSize * 2 - 2; // 최단 경로 길이
    const efficiency = Math.max(0, 100 - ((pathLength - optimalPath) / optimalPath) * 50);
    const speedBonus = Math.max(0, 50 - timeInSeconds);
    return Math.round(efficiency + speedBonus);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}초`;
  };

  const getCellColor = (cell: Cell) => {
    const isInPath = path.some(p => p.row === cell.row && p.col === cell.col);
    
    if (cell.type === 'start') return 'bg-green-500';
    if (cell.type === 'end') return 'bg-red-500';
    if (cell.type === 'obstacle') return 'bg-gray-700';
    if (isInPath) return 'bg-blue-500';
    return 'bg-slate-800 hover:bg-slate-700';
  };

  if (gameState === 'ready') {
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-purple-500" />
            길 만들기 게임
          </CardTitle>
          <CardDescription>
            시작점에서 끝점까지 장애물을 피해 경로를 그리세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <h3 className="font-semibold text-purple-500 mb-2">게임 규칙</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 녹색 시작점에서 마우스를 누른 채로 드래그하세요</li>
              <li>• 빨간색 끝점까지 경로를 그리세요</li>
              <li>• 회색 장애물은 피해야 합니다</li>
              <li>• 대각선 이동은 불가능합니다</li>
              <li>• 최단 경로로 빠르게 완료할수록 높은 점수를 받습니다</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">난이도 선택</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={level === 1 ? "default" : "outline"}
                onClick={() => setLevel(1)}
              >
                쉬움 (10×10)
              </Button>
              <Button
                variant={level === 2 ? "default" : "outline"}
                onClick={() => setLevel(2)}
              >
                보통 (12×12)
              </Button>
              <Button
                variant={level === 3 ? "default" : "outline"}
                onClick={() => setLevel(3)}
              >
                어려움 (14×14)
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
    const finalScore = calculateScore(elapsedTime, path.length);
    const optimalPath = gridSize * 2 - 2;
    
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-green-500" />
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

          <div className="p-4 bg-slate-800/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">경로 길이</span>
              <Badge variant="secondary">{path.length}칸</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">최단 경로</span>
              <Badge variant="secondary">{optimalPath}칸</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">효율성</span>
              <Badge variant={path.length === optimalPath ? "default" : "secondary"}>
                {Math.round((optimalPath / path.length) * 100)}%
              </Badge>
            </div>
          </div>

          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-sm font-medium text-purple-500 mb-2">평가 결과</p>
            <p className="text-sm text-muted-foreground">
              {finalScore >= 80 ? "🎉 우수한 공간 지각력과 문제 해결 능력을 보여주셨습니다!" :
               finalScore >= 60 ? "👍 양호한 수준입니다. 최단 경로를 찾는 연습을 더 해보세요." :
               "💪 다양한 경로 탐색 전략을 시도해보세요!"}
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
            <Route className="w-5 h-5 text-purple-500" />
            경로를 그리세요
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {formatTime(elapsedTime)}
          </Badge>
        </div>
        <CardDescription>
          녹색 시작점에서 빨간색 끝점까지 드래그하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className="grid gap-1 select-none"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`aspect-square rounded ${getCellColor(cell)} transition-colors cursor-pointer`}
                onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
              />
            ))
          )}
        </div>

        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">현재 경로 길이</span>
            <Badge variant="secondary">{path.length}칸</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
