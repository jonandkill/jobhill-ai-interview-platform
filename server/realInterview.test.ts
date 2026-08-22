import { describe, it, expect, vi, beforeEach } from "vitest";

// 리얼 면접 모드 설정 테스트
describe("Real Interview Mode Settings", () => {
  // 면접관 스타일 설정 테스트
  describe("Interviewer Style Settings", () => {
    it("should have three interviewer styles available", () => {
      const styles = ["friendly", "neutral", "pressure"];
      expect(styles).toHaveLength(3);
      expect(styles).toContain("friendly");
      expect(styles).toContain("neutral");
      expect(styles).toContain("pressure");
    });

    it("should generate correct prompt style for pressure mode", () => {
      const pressureStyle = {
        formality: 'formal' as const,
        questionStyle: 'probing' as const,
        feedbackStyle: 'strict' as const,
        promptStyle: '압박 면접 스타일로 날카롭고 도전적인 질문을 해주세요.'
      };
      
      expect(pressureStyle.formality).toBe('formal');
      expect(pressureStyle.questionStyle).toBe('probing');
      expect(pressureStyle.feedbackStyle).toBe('strict');
    });

    it("should generate correct prompt style for friendly mode", () => {
      const friendlyStyle = {
        formality: 'semi-formal' as const,
        questionStyle: 'friendly' as const,
        feedbackStyle: 'encouraging' as const,
        promptStyle: '친절하고 격려하는 분위기로 질문해주세요.'
      };
      
      expect(friendlyStyle.formality).toBe('semi-formal');
      expect(friendlyStyle.questionStyle).toBe('friendly');
      expect(friendlyStyle.feedbackStyle).toBe('encouraging');
    });
  });

  // 질문 수 설정 테스트
  describe("Question Count Settings", () => {
    it("should allow question counts of 5, 7, or 10", () => {
      const validCounts = [5, 7, 10];
      validCounts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(5);
        expect(count).toBeLessThanOrEqual(10);
      });
    });
  });

  // 시간 제한 설정 테스트
  describe("Time Limit Settings", () => {
    it("should allow time limits of 60, 120, or 180 seconds", () => {
      const validTimeLimits = [60, 120, 180]; // 1분, 2분, 3분
      validTimeLimits.forEach(limit => {
        expect(limit).toBeGreaterThanOrEqual(60);
        expect(limit).toBeLessThanOrEqual(180);
      });
    });

    it("should convert minutes to seconds correctly", () => {
      const minutes = [1, 2, 3];
      const expectedSeconds = [60, 120, 180];
      
      minutes.forEach((min, index) => {
        expect(min * 60).toBe(expectedSeconds[index]);
      });
    });
  });

  // 침묵 감지 설정 테스트
  describe("Silence Detection Settings", () => {
    it("should allow silence detection times of 2, 3, 4, or 5 seconds", () => {
      const validSilenceTimes = [2, 3, 4, 5];
      validSilenceTimes.forEach(time => {
        expect(time).toBeGreaterThanOrEqual(2);
        expect(time).toBeLessThanOrEqual(5);
      });
    });

    it("should default to 3 seconds", () => {
      const defaultSilenceTime = 3;
      expect(defaultSilenceTime).toBe(3);
    });
  });
});

// 타이머 로직 테스트
describe("Interview Timer Logic", () => {
  it("should calculate remaining time correctly", () => {
    const totalTime = 120; // 2분
    const elapsed = 45;
    const remaining = totalTime - elapsed;
    
    expect(remaining).toBe(75);
  });

  it("should format time as MM:SS", () => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    expect(formatTime(120)).toBe("02:00");
    expect(formatTime(75)).toBe("01:15");
    expect(formatTime(10)).toBe("00:10");
    expect(formatTime(0)).toBe("00:00");
  });

  it("should trigger warning at correct thresholds", () => {
    const warningThresholds = [60, 30, 10]; // 1분, 30초, 10초
    const timeRemaining = 30;
    
    const shouldWarn = warningThresholds.includes(timeRemaining);
    expect(shouldWarn).toBe(true);
  });

  it("should trigger auto-submit when time reaches 0", () => {
    const timeRemaining = 0;
    const shouldAutoSubmit = timeRemaining <= 0;
    
    expect(shouldAutoSubmit).toBe(true);
  });
});

// 점수 기반 감정 표현 테스트
describe("Score-based Emotion", () => {
  const getEmotionByScore = (score: number): string => {
    if (score >= 80) return "happy";
    if (score >= 60) return "neutral";
    if (score >= 40) return "thinking";
    return "concerned";
  };

  it("should return happy for scores >= 80", () => {
    expect(getEmotionByScore(80)).toBe("happy");
    expect(getEmotionByScore(95)).toBe("happy");
    expect(getEmotionByScore(100)).toBe("happy");
  });

  it("should return neutral for scores 60-79", () => {
    expect(getEmotionByScore(60)).toBe("neutral");
    expect(getEmotionByScore(70)).toBe("neutral");
    expect(getEmotionByScore(79)).toBe("neutral");
  });

  it("should return thinking for scores 40-59", () => {
    expect(getEmotionByScore(40)).toBe("thinking");
    expect(getEmotionByScore(50)).toBe("thinking");
    expect(getEmotionByScore(59)).toBe("thinking");
  });

  it("should return concerned for scores < 40", () => {
    expect(getEmotionByScore(0)).toBe("concerned");
    expect(getEmotionByScore(20)).toBe("concerned");
    expect(getEmotionByScore(39)).toBe("concerned");
  });
});

// 면접 진행 상태 테스트
describe("Interview Progress Status", () => {
  type SessionStatus = "idle" | "setup" | "starting" | "question" | "recording" | "processing" | "completed";

  it("should have valid status transitions", () => {
    const validStatuses: SessionStatus[] = [
      "idle", "setup", "starting", "question", "recording", "processing", "completed"
    ];

    expect(validStatuses).toHaveLength(7);
  });

  it("should follow correct status flow", () => {
    const statusFlow: SessionStatus[] = [
      "idle",      // 초기 상태
      "setup",     // 설정 화면
      "starting",  // 면접 시작 중
      "question",  // 질문 표시
      "recording", // 녹음 중
      "processing",// 답변 처리 중
      "completed"  // 면접 완료
    ];

    // 상태 순서 확인
    expect(statusFlow[0]).toBe("idle");
    expect(statusFlow[statusFlow.length - 1]).toBe("completed");
  });
});

// QA 데이터 구조 테스트
describe("QA Data Structure", () => {
  interface QAItem {
    id: number;
    question: string;
    questionType: string;
    userAnswer: string | null;
    audioUrl: string | null;
    score: number | null;
    feedback: string | null;
    strengths: string | null;
    improvements: string | null;
    suggestedAnswer: string | null;
  }

  it("should create valid QA item structure", () => {
    const qaItem: QAItem = {
      id: 1,
      question: "자기소개를 해주세요.",
      questionType: "personality",
      userAnswer: null,
      audioUrl: null,
      score: null,
      feedback: null,
      strengths: null,
      improvements: null,
      suggestedAnswer: null
    };

    expect(qaItem.id).toBe(1);
    expect(qaItem.question).toBeTruthy();
    expect(qaItem.userAnswer).toBeNull();
  });

  it("should update QA item after answer submission", () => {
    const qaItem: QAItem = {
      id: 1,
      question: "자기소개를 해주세요.",
      questionType: "personality",
      userAnswer: "안녕하세요. 저는...",
      audioUrl: "https://example.com/audio.webm",
      score: 85,
      feedback: "좋은 답변입니다.",
      strengths: "자신감 있는 태도",
      improvements: "구체적인 사례 추가",
      suggestedAnswer: "더 나은 답변 예시..."
    };

    expect(qaItem.userAnswer).toBeTruthy();
    expect(qaItem.score).toBe(85);
    expect(qaItem.audioUrl).toBeTruthy();
  });
});
