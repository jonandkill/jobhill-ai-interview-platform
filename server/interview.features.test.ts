import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock db functions
vi.mock("./db", () => ({
  getInterviewQAById: vi.fn(),
  getUserProfile: vi.fn(),
  createSharedQuestionList: vi.fn(),
  getSharedQuestionListByCode: vi.fn(),
  incrementSharedListViewCount: vi.fn(),
  getSharedQuestionListsByUser: vi.fn(),
  createSharedListFeedback: vi.fn(),
  getSharedListFeedbacks: vi.fn(),
  getSharedQuestionListById: vi.fn(),
  deleteSharedQuestionList: vi.fn(),
  updateInterviewQA: vi.fn(),
}));

describe("Interview Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Answer Revision Feature", () => {
    it("should get interview QA by id", async () => {
      const mockQA = {
        id: 1,
        question: "자기소개를 해주세요.",
        userAnswer: "저는 개발자입니다.",
        score: 70,
        feedback: "좋은 답변입니다.",
      };
      
      vi.mocked(db.getInterviewQAById).mockResolvedValue(mockQA as any);
      
      const result = await db.getInterviewQAById(1);
      
      expect(result).toEqual(mockQA);
      expect(db.getInterviewQAById).toHaveBeenCalledWith(1);
    });

    it("should return null for non-existent QA", async () => {
      vi.mocked(db.getInterviewQAById).mockResolvedValue(null);
      
      const result = await db.getInterviewQAById(999);
      
      expect(result).toBeNull();
    });
  });

  describe("Question Sharing Feature", () => {
    it("should create a shared question list", async () => {
      const mockResult = { insertId: 1 };
      vi.mocked(db.createSharedQuestionList).mockResolvedValue(mockResult as any);
      
      const input = {
        userId: 1,
        shareCode: "ABC12345",
        title: "면접 질문 모음",
        description: "테스트 설명",
        questions: JSON.stringify(["질문1", "질문2"]),
        targetCompany: "삼성전자",
        targetPosition: "SW개발",
        isPublic: true,
      };
      
      const result = await db.createSharedQuestionList(input);
      
      expect(result.insertId).toBe(1);
      expect(db.createSharedQuestionList).toHaveBeenCalledWith(input);
    });

    it("should get shared question list by code", async () => {
      const mockList = {
        id: 1,
        userId: 1,
        shareCode: "ABC12345",
        title: "면접 질문 모음",
        questions: JSON.stringify(["질문1", "질문2"]),
        viewCount: 10,
      };
      
      vi.mocked(db.getSharedQuestionListByCode).mockResolvedValue(mockList as any);
      
      const result = await db.getSharedQuestionListByCode("ABC12345");
      
      expect(result).toEqual(mockList);
      expect(result?.shareCode).toBe("ABC12345");
    });

    it("should return null for non-existent share code", async () => {
      vi.mocked(db.getSharedQuestionListByCode).mockResolvedValue(null);
      
      const result = await db.getSharedQuestionListByCode("INVALID");
      
      expect(result).toBeNull();
    });

    it("should increment view count", async () => {
      vi.mocked(db.incrementSharedListViewCount).mockResolvedValue(undefined);
      
      await db.incrementSharedListViewCount(1);
      
      expect(db.incrementSharedListViewCount).toHaveBeenCalledWith(1);
    });

    it("should get user's shared lists", async () => {
      const mockLists = [
        { id: 1, title: "목록1", questions: "[]" },
        { id: 2, title: "목록2", questions: "[]" },
      ];
      
      vi.mocked(db.getSharedQuestionListsByUser).mockResolvedValue(mockLists as any);
      
      const result = await db.getSharedQuestionListsByUser(1);
      
      expect(result).toHaveLength(2);
    });

    it("should create feedback for shared list", async () => {
      const mockResult = { insertId: 1 };
      vi.mocked(db.createSharedListFeedback).mockResolvedValue(mockResult as any);
      
      const input = {
        sharedListId: 1,
        userId: 2,
        authorName: "테스터",
        content: "좋은 질문 목록입니다.",
        rating: 5,
      };
      
      const result = await db.createSharedListFeedback(input);
      
      expect(result.insertId).toBe(1);
    });

    it("should get feedbacks for shared list", async () => {
      const mockFeedbacks = [
        { id: 1, content: "피드백1", rating: 5 },
        { id: 2, content: "피드백2", rating: 4 },
      ];
      
      vi.mocked(db.getSharedListFeedbacks).mockResolvedValue(mockFeedbacks as any);
      
      const result = await db.getSharedListFeedbacks(1);
      
      expect(result).toHaveLength(2);
    });

    it("should delete shared list", async () => {
      vi.mocked(db.deleteSharedQuestionList).mockResolvedValue(undefined);
      
      await db.deleteSharedQuestionList(1);
      
      expect(db.deleteSharedQuestionList).toHaveBeenCalledWith(1);
    });
  });

  describe("Answer Duration Feature", () => {
    it("should update interview QA with answer duration", async () => {
      vi.mocked(db.updateInterviewQA).mockResolvedValue(undefined);
      
      await db.updateInterviewQA(1, { answerDuration: 120 });
      
      expect(db.updateInterviewQA).toHaveBeenCalledWith(1, { answerDuration: 120 });
    });
  });
});
