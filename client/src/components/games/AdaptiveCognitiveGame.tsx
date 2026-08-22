import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Clock3, RotateCcw, ShieldCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AdaptiveGameMode =
  | "goNoGo"
  | "stroop"
  | "nBack"
  | "symbolSearch"
  | "sequenceMemory"
  | "ruleSwitch"
  | "visualMemory"
  | "estimation"
  | "arithmetic"
  | "dualAttention"
  | "riskChoice";

export interface AdaptiveGameDefinition {
  id: string;
  title: string;
  mode: AdaptiveGameMode;
  measures: string;
  caution: string;
}

type Trial = { prompt: string; choices: string[]; answer: string };

const COLORS = ["빨강", "파랑", "초록", "노랑"];
const SYMBOLS = ["◆", "●", "▲", "■", "★"];

function makeTrial(mode: AdaptiveGameMode, round: number, history: string[]): Trial {
  const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
  if (mode === "goNoGo") {
    const symbol = pick(SYMBOLS);
    return { prompt: symbol === "★" ? "별에는 누르지 마세요" : `${symbol}를 확인하고 누르세요`, choices: ["누르기", "멈추기"], answer: symbol === "★" ? "멈추기" : "누르기" };
  }
  if (mode === "stroop") {
    const word = pick(COLORS);
    const ink = pick(COLORS.filter((color) => color !== word));
    return { prompt: `글자 '${word}'의 표시 색은 ${ink}입니다. 표시 색을 고르세요.`, choices: COLORS, answer: ink };
  }
  if (mode === "nBack") {
    const current = round > 1 && Math.random() > 0.5 ? history[Math.max(0, history.length - 2)] : pick(SYMBOLS);
    const match = history.length >= 2 && current === history[history.length - 2];
    return { prompt: `현재 기호 ${current} · 두 단계 전과 같은가요?`, choices: ["같음", "다름"], answer: match ? "같음" : "다름" };
  }
  if (mode === "symbolSearch") {
    const target = pick(SYMBOLS);
    const row = Array.from({ length: 7 }, () => pick(SYMBOLS));
    const count = row.filter((item) => item === target).length;
    return { prompt: `${row.join(" ")} 안의 ${target} 개수`, choices: [0, 1, 2, 3, 4].map(String), answer: String(Math.min(4, count)) };
  }
  if (mode === "sequenceMemory" || mode === "visualMemory") {
    const sequence = Array.from({ length: 3 + (round % 3) }, () => pick(SYMBOLS));
    const answer = sequence.join("");
    return { prompt: `순서를 기억하세요: ${sequence.join(" ")}`, choices: [answer, [...sequence].reverse().join(""), [...sequence].sort().join("")], answer };
  }
  if (mode === "ruleSwitch") {
    const number = 1 + Math.floor(Math.random() * 9);
    const rule = round % 2 === 0 ? "홀짝" : "5보다 큰지";
    const answer = rule === "홀짝" ? (number % 2 ? "홀수" : "짝수") : (number > 5 ? "큼" : "작거나 같음");
    return { prompt: `규칙: ${rule} · 숫자 ${number}`, choices: rule === "홀짝" ? ["홀수", "짝수"] : ["큼", "작거나 같음"], answer };
  }
  if (mode === "estimation") {
    const dots = 6 + Math.floor(Math.random() * 20);
    const nearest = Math.round(dots / 5) * 5;
    return { prompt: `${"• ".repeat(dots)} 대략 몇 개인가요?`, choices: [nearest - 5, nearest, nearest + 5].map(String), answer: String(nearest) };
  }
  if (mode === "arithmetic") {
    const a = 3 + Math.floor(Math.random() * 17);
    const b = 2 + Math.floor(Math.random() * 12);
    const answer = a + b;
    return { prompt: `${a} + ${b} = ?`, choices: [answer, answer + 2, answer - 1].map(String), answer: String(answer) };
  }
  if (mode === "dualAttention") {
    const number = 1 + Math.floor(Math.random() * 9);
    const symbol = pick(SYMBOLS);
    const answer = number % 2 === 0 && symbol !== "★" ? "조건 충족" : "조건 불충족";
    return { prompt: `${number} ${symbol} · 짝수이면서 별이 아닌가요?`, choices: ["조건 충족", "조건 불충족"], answer };
  }
  const safe = Math.random() > 0.5;
  return { prompt: safe ? "확정 60점과 50% 확률의 100점 중 선택" : "확정 40점과 70% 확률의 70점 중 선택", choices: ["확정 선택", "확률 선택"], answer: safe ? "확정 선택" : "확률 선택" };
}

export default function AdaptiveCognitiveGame({ definition, onComplete }: { definition: AdaptiveGameDefinition; onComplete: (score: number, timeMs: number, mistakes: number, metadata: string) => void }) {
  const totalRounds = 8;
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [finalStats, setFinalStats] = useState({ correct: 0, mistakes: 0, score: 0 });
  const startedAt = useRef(Date.now());
  const trial = useMemo(() => makeTrial(definition.mode, round, history), [definition.mode, round, history]);

  useEffect(() => { startedAt.current = Date.now(); }, [definition.id]);

  const choose = (choice: string) => {
    const isCorrect = choice === trial.answer;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    const nextMistakes = mistakes + (isCorrect ? 0 : 1);
    setCorrect(nextCorrect);
    setMistakes(nextMistakes);
    setHistory((items) => [...items, trial.prompt.match(/[◆●▲■★]/)?.[0] ?? trial.answer]);
    if (round + 1 >= totalRounds) {
      const timeMs = Date.now() - startedAt.current;
      const accuracy = nextCorrect / totalRounds;
      const speedPenalty = Math.min(20, Math.max(0, Math.round((timeMs / totalRounds - 1500) / 150)));
      const score = Math.max(0, Math.min(100, Math.round(accuracy * 100 - speedPenalty)));
      setFinalStats({ correct: nextCorrect, mistakes: nextMistakes, score });
      setFinished(true);
      onComplete(score, timeMs, nextMistakes, JSON.stringify({ assessmentType: definition.id, accuracy, averageResponseMs: Math.round(timeMs / totalRounds) }));
    } else {
      setRound((value) => value + 1);
    }
  };

  if (finished) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-green-500" />
          <h2 className="text-xl font-bold">측정 완료</h2>
          <p className="text-3xl font-bold text-primary">{finalStats.score}점</p>
          <p>정답 {finalStats.correct}/{totalRounds} · 실수 {finalStats.mistakes}회</p>
          <p className="text-sm text-muted-foreground">결과는 이번 과제에서 관찰된 정확도와 반응시간입니다. 성격·지능·채용 적합도를 단정하지 않습니다.</p>
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
        <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{round + 1}/{totalRounds}</span><span className="flex items-center gap-1"><Clock3 className="h-4 w-4" />정확하게 먼저, 그다음 빠르게</span></div>
        <div className="min-h-28 rounded-xl border bg-secondary/20 p-6 text-center text-lg font-semibold" aria-live="polite">{trial.prompt}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {trial.choices.map((choice) => <Button key={choice} variant="outline" className="min-h-12" onClick={() => choose(choice)}>{choice}</Button>)}
        </div>
        <div className="grid gap-2 rounded-lg bg-primary/5 p-3 text-sm sm:grid-cols-2"><p><Target className="mr-1 inline h-4 w-4" />확인: {definition.measures}</p><p><RotateCcw className="mr-1 inline h-4 w-4" />주의: {definition.caution}</p></div>
      </CardContent>
    </Card>
  );
}
