import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Clock3, RotateCcw, ShieldCheck, Target } from "lucide-react";
import {
  calculatePracticeScore,
  describePracticeResult,
  type AdaptiveGameMode,
  type GameAssessmentDefinition,
} from "@shared/gameAssessments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AdaptiveGameDefinition = GameAssessmentDefinition;

export type AdaptiveAttemptMetrics = {
  totalTrials: number;
  correct: number;
  mistakes: number;
  accuracy: number;
  averageResponseMs: number;
};

type Trial = {
  prompt: string;
  choices: string[];
  answer: string;
  historyToken?: string;
  reveal?: { text: string; color?: string };
};

const COLORS = ["빨강", "파랑", "초록", "노랑"];
const COLOR_VALUES: Record<string, string> = {
  빨강: "#dc2626",
  파랑: "#2563eb",
  초록: "#15803d",
  노랑: "#a16207",
};
const SYMBOLS = ["◆", "●", "▲", "■", "★"];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function memoryTrial(round: number): Trial {
  const length = 3 + (round % 3);
  const sequence = Array.from({ length }, () => pick(SYMBOLS));
  const answer = sequence.join("");
  const reversed = [...sequence].reverse().join("");
  const shifted = [...sequence.slice(1), sequence[0]].join("");
  const changed = [...sequence.slice(0, -1), pick(SYMBOLS.filter((item) => item !== sequence.at(-1)))].join("");
  const choices = Array.from(new Set([answer, reversed, shifted, changed])).slice(0, 3);
  return {
    prompt: "기억한 순서를 고르세요.",
    reveal: { text: sequence.join("  ") },
    choices,
    answer,
  };
}

function makeTrial(mode: AdaptiveGameMode, round: number, history: string[]): Trial {
  if (mode === "goNoGo") {
    const symbol = pick(SYMBOLS);
    return {
      prompt: symbol === "★" ? "중지 신호입니다. 대기하세요." : symbol + " 신호에 응답하세요.",
      choices: ["응답", "대기"],
      answer: symbol === "★" ? "대기" : "응답",
      historyToken: symbol,
    };
  }

  if (mode === "stroop") {
    const word = pick(COLORS);
    const ink = pick(COLORS.filter((color) => color !== word));
    return {
      prompt: "글자의 뜻이 아니라 실제 표시 색을 고르세요.",
      reveal: { text: word, color: COLOR_VALUES[ink] },
      choices: COLORS,
      answer: ink,
    };
  }

  if (mode === "nBack") {
    const canMatch = history.length >= 2;
    const current = canMatch && Math.random() > 0.5 ? history[history.length - 2] : pick(SYMBOLS);
    const match = canMatch && current === history[history.length - 2];
    return {
      prompt: "현재 기호 " + current + " · 두 단계 전과 같은가요?",
      choices: ["같음", "다름"],
      answer: match ? "같음" : "다름",
      historyToken: current,
    };
  }

  if (mode === "symbolSearch") {
    const target = pick(SYMBOLS);
    const row = Array.from({ length: 7 }, () => pick(SYMBOLS));
    const count = row.filter((item) => item === target).length;
    return {
      prompt: row.join("  ") + " 안의 " + target + " 개수",
      choices: [0, 1, 2, 3, 4, 5].map(String),
      answer: String(count),
    };
  }

  if (mode === "sequenceMemory" || mode === "visualMemory") return memoryTrial(round);

  if (mode === "ruleSwitch") {
    const number = 1 + Math.floor(Math.random() * 9);
    const isParity = round % 2 === 0;
    const answer = isParity ? (number % 2 ? "홀수" : "짝수") : (number > 5 ? "큼" : "작거나 같음");
    return {
      prompt: "규칙: " + (isParity ? "홀짝" : "5보다 큰지") + " · 숫자 " + number,
      choices: isParity ? ["홀수", "짝수"] : ["큼", "작거나 같음"],
      answer,
    };
  }

  if (mode === "estimation") {
    const dots = 6 + Math.floor(Math.random() * 20);
    const nearest = Math.max(5, Math.round(dots / 5) * 5);
    return {
      prompt: "방금 본 점의 수와 가장 가까운 값을 고르세요.",
      reveal: { text: "• ".repeat(dots) },
      choices: [nearest - 5, nearest, nearest + 5].map(String),
      answer: String(nearest),
    };
  }

  if (mode === "arithmetic") {
    const a = 3 + Math.floor(Math.random() * 17);
    const b = 2 + Math.floor(Math.random() * 12);
    const answer = a + b;
    return {
      prompt: a + " + " + b + " = ?",
      choices: [answer, answer + 2, answer - 1].map(String),
      answer: String(answer),
    };
  }

  if (mode === "dualAttention") {
    const number = 1 + Math.floor(Math.random() * 9);
    const symbol = pick(SYMBOLS);
    const answer = number % 2 === 0 && symbol !== "★" ? "조건 충족" : "조건 불충족";
    return {
      prompt: number + " " + symbol + " · 짝수이면서 별이 아닌가요?",
      choices: ["조건 충족", "조건 불충족"],
      answer,
    };
  }

  const priorityScenarios: Trial[] = [
    {
      prompt: "안전 센서 이상과 납기 지연이 동시에 발생했습니다. 공개 기준: 안전을 먼저 확보합니다.",
      choices: ["설비 중지·보고", "납기 작업 계속"],
      answer: "설비 중지·보고",
    },
    {
      prompt: "치명 품질 결함 가능성과 일반 문의가 함께 들어왔습니다. 공개 기준: 영향이 큰 품질 문제를 먼저 확인합니다.",
      choices: ["품질 격리·확인", "일반 문의 처리"],
      answer: "품질 격리·확인",
    },
    {
      prompt: "작업자 위험 신고와 재고 정리 요청이 동시에 있습니다. 공개 기준: 사람의 안전을 먼저 확인합니다.",
      choices: ["위험 작업 중지·확인", "재고 정리"],
      answer: "위험 작업 중지·확인",
    },
  ];
  return priorityScenarios[round % priorityScenarios.length];
}

export default function AdaptiveCognitiveGame({
  definition,
  onComplete,
}: {
  definition: AdaptiveGameDefinition;
  onComplete: (score: number, timeMs: number, mistakes: number, metrics: AdaptiveAttemptMetrics) => void;
}) {
  const totalRounds = 8;
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [phase, setPhase] = useState<"present" | "respond">("respond");
  const [finalStats, setFinalStats] = useState({ correct: 0, mistakes: 0, score: 0, averageResponseMs: 0 });
  const startedAt = useRef(Date.now());
  const responseStartedAt = useRef(Date.now());
  const responseTimes = useRef<number[]>([]);
  const trial = useMemo(() => makeTrial(definition.mode!, round, history), [definition.mode, round, history]);

  useEffect(() => {
    setPhase(trial.reveal ? "present" : "respond");
    responseStartedAt.current = Date.now();
  }, [trial]);

  const beginResponse = () => {
    setPhase("respond");
    responseStartedAt.current = Date.now();
  };

  const reset = () => {
    setRound(0);
    setCorrect(0);
    setMistakes(0);
    setHistory([]);
    setFinished(false);
    responseTimes.current = [];
    startedAt.current = Date.now();
  };

  const choose = (choice: string) => {
    if (phase !== "respond") return;
    const responseMs = Math.max(0, Date.now() - responseStartedAt.current);
    responseTimes.current.push(responseMs);
    const isCorrect = choice === trial.answer;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    const nextMistakes = mistakes + (isCorrect ? 0 : 1);
    setCorrect(nextCorrect);
    setMistakes(nextMistakes);
    if (trial.historyToken) setHistory((items) => [...items, trial.historyToken!]);

    if (round + 1 >= totalRounds) {
      const timeMs = Date.now() - startedAt.current;
      const score = calculatePracticeScore(nextCorrect, totalRounds);
      const averageResponseMs = Math.round(
        responseTimes.current.reduce((sum, value) => sum + value, 0) / responseTimes.current.length,
      );
      setFinalStats({ correct: nextCorrect, mistakes: nextMistakes, score, averageResponseMs });
      setFinished(true);
      onComplete(score, timeMs, nextMistakes, {
        totalTrials: totalRounds,
        correct: nextCorrect,
        mistakes: nextMistakes,
        accuracy: nextCorrect / totalRounds,
        averageResponseMs,
      });
      return;
    }
    setRound((value) => value + 1);
  };

  if (finished) {
    return (
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-green-600" />
            <h2 className="mt-2 text-xl font-bold">연습 완료</h2>
            <p className="mt-2 text-3xl font-bold text-primary">{finalStats.score}점</p>
            <p className="mt-1 text-sm text-muted-foreground">
              정답 {finalStats.correct}/{totalRounds} · 오류 {finalStats.mistakes}회 · 문항당 응답 {finalStats.averageResponseMs}ms
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold">이번에 관찰된 사실</p>
              <p className="mt-1 text-sm text-muted-foreground">{describePracticeResult(finalStats.score)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{definition.interpretation}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold">다음 연습</p>
              <p className="mt-1 text-sm text-muted-foreground">{definition.improvement}</p>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{definition.caution}</p>
            </div>
          </div>
          <p className="rounded-lg bg-secondary/40 p-3 text-sm text-muted-foreground">
            이 결과는 이번 연습 문항의 수행 기록입니다. 성격·지능·감정·채용 적합도 또는 합격 가능성을 판정하지 않습니다.
          </p>
          <Button variant="outline" className="min-h-11 w-full" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />같은 게임 다시 연습
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />{definition.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{round + 1}/{totalRounds}</span>
          <span className="flex items-center gap-1"><Clock3 className="h-4 w-4" />점수에는 응답속도를 반영하지 않습니다</span>
        </div>
        <div className="min-h-36 rounded-xl border bg-secondary/20 p-6 text-center" aria-live="polite">
          {phase === "present" && trial.reveal ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">충분히 확인한 뒤 응답 단계로 이동하세요.</p>
              <p className="break-words text-3xl font-bold tracking-wider" style={{ color: trial.reveal.color }}>
                {trial.reveal.text}
              </p>
              <Button className="min-h-11" onClick={beginResponse}>응답 준비됨</Button>
            </div>
          ) : (
            <p className="text-lg font-semibold">{trial.prompt}</p>
          )}
        </div>
        {phase === "respond" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {trial.choices.map((choice) => (
              <Button key={choice} variant="outline" className="min-h-12" onClick={() => choose(choice)}>
                {choice}
              </Button>
            ))}
          </div>
        )}
        <div className="grid gap-2 rounded-lg bg-primary/5 p-3 text-sm sm:grid-cols-2">
          <p><Target className="mr-1 inline h-4 w-4" />관찰: {definition.measures}</p>
          <p><RotateCcw className="mr-1 inline h-4 w-4" />주의: {definition.caution}</p>
        </div>
      </CardContent>
    </Card>
  );
}
