import { useState } from "react";
import { Brain, Home, RotateCw, ShieldCheck, Target, Trophy, Zap } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdaptiveCognitiveGame, { type AdaptiveGameDefinition } from "@/components/games/AdaptiveCognitiveGame";
import NumberClickGame from "@/components/games/NumberClickGame";
import PathMakingGame from "@/components/games/PathMakingGame";
import RockPaperScissorsGame from "@/components/games/RockPaperScissorsGame";
import ShapeRotationGame from "@/components/games/ShapeRotationGame";
import { trpc } from "@/lib/trpc";

type LegacyGameType = "rps" | "rotation" | "numberClick" | "pathMaking";
type GameDefinition = AdaptiveGameDefinition & { persistenceType: LegacyGameType; legacy?: boolean; description: string };

const GAMES: GameDefinition[] = [
  { id: "rps", mode: "goNoGo", persistenceType: "rps", legacy: true, title: "빠른 판단", description: "규칙에 맞춰 빠르게 반응합니다.", measures: "규칙 이해 후 반응의 정확도·시간", caution: "속도보다 규칙 확인을 우선하세요." },
  { id: "rotation", mode: "visualMemory", persistenceType: "rotation", legacy: true, title: "도형 회전", description: "회전된 도형의 일치 여부를 판단합니다.", measures: "공간 정보 처리의 정확도", caution: "머릿속 기준점을 먼저 잡으세요." },
  { id: "numberClick", mode: "symbolSearch", persistenceType: "numberClick", legacy: true, title: "순차 숫자", description: "숫자를 순서대로 찾아 누릅니다.", measures: "시각 탐색 정확도·완료시간", caution: "다음 숫자의 위치를 미리 훑지 마세요." },
  { id: "pathMaking", mode: "sequenceMemory", persistenceType: "pathMaking", legacy: true, title: "경로 설계", description: "장애물을 피해 목표 경로를 만듭니다.", measures: "계획한 경로의 효율·오류", caution: "시작 전에 전체 경로를 한 번 확인하세요." },
  { id: "goNoGo", mode: "goNoGo", persistenceType: "rps", title: "반응 억제", description: "목표에는 반응하고 금지 자극에는 멈춥니다.", measures: "반응·억제 조건의 정확도", caution: "습관적으로 연속 클릭하지 마세요." },
  { id: "stroop", mode: "stroop", persistenceType: "rps", title: "색상 간섭", description: "글자의 뜻이 아니라 표시 색을 선택합니다.", measures: "간섭 상황의 규칙 유지", caution: "문장을 끝까지 읽고 기준을 확인하세요." },
  { id: "nBack", mode: "nBack", persistenceType: "numberClick", title: "작업기억 2-back", description: "현재 자극을 두 단계 전 자극과 비교합니다.", measures: "짧은 정보 유지·갱신 정확도", caution: "최근 두 항목만 순서대로 유지하세요." },
  { id: "symbolSearch", mode: "symbolSearch", persistenceType: "numberClick", title: "기호 탐색", description: "여러 기호 중 목표 기호의 수를 찾습니다.", measures: "시각 탐색의 정확도·시간", caution: "왼쪽에서 오른쪽으로 일정하게 훑으세요." },
  { id: "sequenceMemory", mode: "sequenceMemory", persistenceType: "numberClick", title: "순서 기억", description: "짧게 제시된 기호 순서를 재인합니다.", measures: "순서 정보의 단기 유지", caution: "기호를 작은 묶음으로 나누세요." },
  { id: "ruleSwitch", mode: "ruleSwitch", persistenceType: "rps", title: "규칙 전환", description: "매 문항 바뀌는 판단 규칙을 적용합니다.", measures: "규칙 전환 후 오류·반응시간", caution: "현재 규칙을 먼저 소리 없이 확인하세요." },
  { id: "visualMemory", mode: "visualMemory", persistenceType: "rotation", title: "시각 기억", description: "도형 배열을 기억하고 같은 순서를 찾습니다.", measures: "시각 정보의 단기 재인", caution: "위치와 모양을 함께 묶어 기억하세요." },
  { id: "estimation", mode: "estimation", persistenceType: "numberClick", title: "수량 추정", description: "짧게 보이는 수량을 가까운 값으로 판단합니다.", measures: "제한 시간 내 수량 추정 오차", caution: "하나씩 세기보다 묶음으로 보세요." },
  { id: "arithmetic", mode: "arithmetic", persistenceType: "numberClick", title: "암산 갱신", description: "간단한 수 연산을 빠르고 정확하게 수행합니다.", measures: "연산 정확도·평균 반응시간", caution: "빠른 오답보다 한 번의 검산이 낫습니다." },
  { id: "dualAttention", mode: "dualAttention", persistenceType: "rps", title: "이중 조건 주의", description: "숫자와 기호의 두 조건을 동시에 확인합니다.", measures: "복수 조건 적용의 정확도", caution: "첫 조건만 보고 답하지 마세요." },
  { id: "riskChoice", mode: "riskChoice", persistenceType: "pathMaking", title: "선택 일관성", description: "확정 보상과 확률 보상 사이에서 선택합니다.", measures: "선택 패턴과 응답 일관성", caution: "정답 게임이 아니며 한 문항으로 성향을 단정하지 않습니다." },
];

export default function GameAssessment() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const saveResult = trpc.game.saveResult.useMutation();
  const selected = GAMES.find((game) => game.id === selectedId) ?? null;

  const complete = (game: GameDefinition, score: number, timeSpent?: number, mistakes = 0, metadata?: string) => {
    setScores((current) => ({ ...current, [game.id]: score }));
    saveResult.mutate({ gameType: game.persistenceType, score, timeSpent, level: 1, mistakes, metadata: metadata ?? JSON.stringify({ assessmentType: game.id }) });
  };

  if (selected) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-0">
          <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setSelectedId(null)}>← 15종 목록</Button><Link href="/dashboard"><Button variant="outline" size="sm"><Home className="mr-2 h-4 w-4" />대시보드</Button></Link></div>
          {selected.id === "rps" && <RockPaperScissorsGame onComplete={(score) => { complete(selected, score); setTimeout(() => setSelectedId(null), 1500); }} />}
          {selected.id === "rotation" && <ShapeRotationGame onComplete={(score) => { complete(selected, score); setTimeout(() => setSelectedId(null), 1500); }} />}
          {selected.id === "numberClick" && <NumberClickGame onComplete={(score, time) => { complete(selected, score, time); setTimeout(() => setSelectedId(null), 1500); }} onRestart={() => setSelectedId(null)} />}
          {selected.id === "pathMaking" && <PathMakingGame onComplete={(score, time) => { complete(selected, score, time); setTimeout(() => setSelectedId(null), 1500); }} onRestart={() => setSelectedId(null)} />}
          {!selected.legacy && <AdaptiveCognitiveGame definition={selected} onComplete={(score, time, mistakes, metadata) => complete(selected, score, time, mistakes, metadata)} />}
        </div>
      </DashboardLayout>
    );
  }

  const completed = Object.values(scores);
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-0">
        <div className="space-y-2"><Badge variant="outline">관찰 기반 연습도구</Badge><h1 className="text-2xl font-bold sm:text-3xl">AI 역량게임 15종</h1><p className="max-w-3xl text-muted-foreground">주의·작업기억·규칙 전환·시각 탐색·계획 과정을 연습합니다. 실제 기업 검사를 복제하지 않으며, 결과로 성격·지능·채용 적합도를 단정하지 않습니다.</p></div>
        {completed.length > 0 && <Card className="border-primary/30"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" /><span className="font-semibold">완료 {completed.length}/15종</span></div><Badge>현재 평균 {Math.round(completed.reduce((a, b) => a + b, 0) / completed.length)}점</Badge></CardContent></Card>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game, index) => {
            const Icon = index % 4 === 0 ? Zap : index % 4 === 1 ? RotateCw : index % 4 === 2 ? Target : Brain;
            return <Card key={game.id} className="flex flex-col transition-shadow hover:shadow-lg"><CardHeader><div className="mb-3 flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><Badge variant="secondary">{String(index + 1).padStart(2, "0")}</Badge></div><CardTitle className="flex items-center justify-between gap-2 text-lg">{game.title}{scores[game.id] !== undefined && <Badge>{scores[game.id]}점</Badge>}</CardTitle><CardDescription>{game.description}</CardDescription></CardHeader><CardContent className="mt-auto space-y-3"><div className="rounded-lg bg-secondary/30 p-3 text-xs"><p className="font-medium">무엇을 보나</p><p className="mt-1 text-muted-foreground">{game.measures}</p></div><Button className="min-h-11 w-full" onClick={() => setSelectedId(game.id)}>{scores[game.id] === undefined ? "시작하기" : "다시 연습"}</Button></CardContent></Card>;
          })}
        </div>
        <Card><CardContent className="flex gap-3 p-4 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 shrink-0 text-green-500" /><p>게임 결과는 과제별 정확도·반응시간·실수 횟수만 저장합니다. 카메라 영상, 음성, 감정·성격 추론값은 저장하지 않습니다.</p></CardContent></Card>
      </div>
    </DashboardLayout>
  );
}

