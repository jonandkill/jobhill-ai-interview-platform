import { useMemo, useState } from "react";
import { Brain, CheckCircle2, Home, RotateCw, ShieldCheck, Target, Zap } from "lucide-react";
import {
  GAME_ASSESSMENTS,
  type GameAssessmentDefinition,
  type GameAssessmentId,
} from "@shared/gameAssessments";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import AdaptiveCognitiveGame, { type AdaptiveAttemptMetrics } from "@/components/games/AdaptiveCognitiveGame";
import NumberClickGame from "@/components/games/NumberClickGame";
import PathMakingGame from "@/components/games/PathMakingGame";
import RockPaperScissorsGame from "@/components/games/RockPaperScissorsGame";
import ShapeRotationGame from "@/components/games/ShapeRotationGame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

export default function GameAssessment() {
  const [selectedId, setSelectedId] = useState<GameAssessmentId | null>(null);
  const [sessionScores, setSessionScores] = useState<Partial<Record<GameAssessmentId, number>>>({});
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const statsQuery = trpc.game.getStats.useQuery();
  const utils = trpc.useUtils();
  const saveResult = trpc.game.saveResult.useMutation();
  const selected = selectedId ? GAME_ASSESSMENTS.find((game) => game.id === selectedId) ?? null : null;

  const completedCount = useMemo(() => {
    const completed = new Set<GameAssessmentId>(Object.keys(sessionScores) as GameAssessmentId[]);
    for (const id of Object.keys(statsQuery.data?.statsByAssessment ?? {})) completed.add(id as GameAssessmentId);
    return completed.size;
  }, [sessionScores, statsQuery.data]);

  const complete = async (
    game: GameAssessmentDefinition,
    rawScore: number,
    timeSpent?: number,
    mistakes = 0,
    metrics?: AdaptiveAttemptMetrics,
  ) => {
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    setSaveState({ status: "saving", message: "이번 연습 결과를 안전하게 저장하고 있습니다." });
    try {
      await saveResult.mutateAsync({
        assessmentType: game.id,
        score,
        timeSpent: timeSpent === undefined ? undefined : Math.max(0, Math.round(timeSpent)),
        level: 1,
        mistakes: Math.max(0, Math.round(mistakes)),
        metrics,
      });
      setSessionScores((current) => ({ ...current, [game.id]: score }));
      setSaveState({ status: "saved", message: "저장되었습니다. 최근 자신의 기록과 비교할 수 있습니다." });
      await utils.game.getStats.invalidate();
    } catch (error) {
      console.error("[game.saveResult] 결과 저장 실패:", error);
      setSaveState({ status: "error", message: "저장하지 못했습니다. 네트워크를 확인한 뒤 게임을 다시 완료해주세요." });
    }
  };

  if (selected) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => { setSelectedId(null); setSaveState({ status: "idle" }); }}>← 15종 목록</Button>
            <Link href="/dashboard"><Button variant="outline" size="sm"><Home className="mr-2 h-4 w-4" />대시보드</Button></Link>
          </div>
          {saveState.status !== "idle" && (
            <div
              className={
                "rounded-lg border p-3 text-sm " +
                (saveState.status === "error"
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-primary/30 bg-primary/5 text-foreground")
              }
              role={saveState.status === "error" ? "alert" : "status"}
            >
              {saveState.message}
            </div>
          )}
          {selected.id === "rps" && <RockPaperScissorsGame onComplete={(score) => void complete(selected, score)} />}
          {selected.id === "rotation" && <ShapeRotationGame onComplete={(score) => void complete(selected, score)} />}
          {selected.id === "numberClick" && <NumberClickGame onComplete={(score, time) => void complete(selected, score, time)} onRestart={() => setSaveState({ status: "idle" })} />}
          {selected.id === "pathMaking" && <PathMakingGame onComplete={(score, time) => void complete(selected, score, time)} onRestart={() => setSaveState({ status: "idle" })} />}
          {selected.component === "adaptive" && (
            <AdaptiveCognitiveGame
              definition={selected}
              onComplete={(score, time, mistakes, metrics) => void complete(selected, score, time, mistakes, metrics)}
            />
          )}
          <Card>
            <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2">
              <div><p className="font-semibold">해석 가능한 범위</p><p className="mt-1 text-muted-foreground">{selected.interpretation}</p></div>
              <div><p className="font-semibold">다음 연습 방법</p><p className="mt-1 text-muted-foreground">{selected.improvement}</p></div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-0">
        <div className="space-y-2">
          <Badge variant="outline">자기점검용 연습도구</Badge>
          <h1 className="text-2xl font-bold sm:text-3xl">JobHill 업무 수행 연습게임 15종</h1>
          <p className="max-w-3xl text-muted-foreground">
            공개된 과제 원리를 바탕으로 JobHill이 독자 설계한 연습입니다. 실제 기업 검사를 복제하지 않으며,
            결과로 성격·지능·감정·채용 적합도나 합격 가능성을 판단하지 않습니다.
          </p>
        </div>

        <Card className="border-primary/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold">연습 완료 {completedCount}/15종</span>
            </div>
            <p className="text-sm text-muted-foreground">서로 다른 게임 점수는 합산하지 않고, 같은 게임의 내 기록만 비교합니다.</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAME_ASSESSMENTS.map((game, index) => {
            const Icon = index % 4 === 0 ? Zap : index % 4 === 1 ? RotateCw : index % 4 === 2 ? Target : Brain;
            const saved = statsQuery.data?.statsByAssessment?.[game.id];
            const latestScore = sessionScores[game.id] ?? saved?.latestScore;
            return (
              <Card key={game.id} className="flex flex-col transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                    <Badge variant="secondary">{String(index + 1).padStart(2, "0")}</Badge>
                  </div>
                  <CardTitle className="flex items-center justify-between gap-2 text-lg">
                    {game.title}
                    {latestScore !== undefined && <Badge>{latestScore}점</Badge>}
                  </CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="rounded-lg bg-secondary/30 p-3 text-xs">
                    <p className="font-medium">이번 과제에서 보는 것</p>
                    <p className="mt-1 text-muted-foreground">{game.measures}</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 p-3 text-xs">
                    <p className="font-medium">해석 주의</p>
                    <p className="mt-1 text-muted-foreground">{game.caution}</p>
                  </div>
                  {saved && (
                    <p className="text-xs text-muted-foreground">
                      내 기록 {saved.count}회 · 최근 5회 중앙값 {saved.recentMedian}점
                      {saved.changeFromPrevious !== null && " · 이전 구간 대비 " + (saved.changeFromPrevious > 0 ? "+" : "") + saved.changeFromPrevious + "점"}
                    </p>
                  )}
                  <Button className="min-h-11 w-full" onClick={() => { setSelectedId(game.id); setSaveState({ status: "idle" }); }}>
                    {latestScore === undefined ? "연습 시작" : "다시 연습"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 shrink-0 text-green-600" />
            <p>
              저장 항목은 과제 ID, 정확도, 오류 수, 소요시간과 본인 변화 비교에 필요한 최소 기록입니다.
              카메라 영상·음성·표정·시선·감정·성격 추론값은 게임 결과에 저장하거나 사용하지 않습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
