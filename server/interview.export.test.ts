import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { inferProcedureInput } from '@trpc/server';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAuthContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

describe('Interview Export Tests', () => {
  // 기존 데이터 사용 (실제 면접 세션 ID)
  const testUserId = 1; // 실제 사용자 ID
  const testSessionId = 1950002; // 실제 면접 세션 ID

  it('should get session detail with QA list', async () => {
    const ctx = createAuthContext(testUserId);

    const caller = appRouter.createCaller(ctx);
    type Input = inferProcedureInput<typeof appRouter.interview.getSessionDetail>;
    const input: Input = { sessionId: testSessionId };

    const result = await caller.interview.getSessionDetail(input);

    expect(result).toBeDefined();
    expect(result.id).toBe(testSessionId);
    expect(result.qaList).toBeDefined();
  });

  it('should export to PDF', async () => {
    const ctx = createAuthContext(testUserId);

    const caller = appRouter.createCaller(ctx);
    type Input = inferProcedureInput<typeof appRouter.interview.exportToPDF>;
    const input: Input = { sessionId: testSessionId };

    const result = await caller.interview.exportToPDF(input);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.filename).toContain('.pdf');
    expect(typeof result.data).toBe('string'); // base64 string
  });

  it('should export to Word', async () => {
    const ctx = createAuthContext(testUserId);

    const caller = appRouter.createCaller(ctx);
    type Input = inferProcedureInput<typeof appRouter.interview.exportToWord>;
    const input: Input = { sessionId: testSessionId };

    const result = await caller.interview.exportToWord(input);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.filename).toContain('.docx');
    expect(typeof result.data).toBe('string'); // base64 string
  });

  it('should export a filtered question list PDF', async () => {
    const ctx = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);
    type Input = inferProcedureInput<typeof appRouter.interview.exportQuestionListPDF>;
    const input: Input = { sessionId: testSessionId, category: '인성' };

    const result = await caller.interview.exportQuestionListPDF(input);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.filename).toContain('인성');
    expect(result.filename).toContain('.pdf');
    expect(typeof result.data).toBe('string');
  });

  it('should export only explicitly selected questions', async () => {
    const ctx = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);
    const detail = await caller.interview.getSessionDetail({ sessionId: testSessionId });
    const firstQuestionId = detail.qaList?.[0]?.id;

    if (!firstQuestionId) {
      return;
    }

    type Input = inferProcedureInput<typeof appRouter.interview.exportQuestionListPDF>;
    const input: Input = {
      sessionId: testSessionId,
      category: 'all',
      selectedQuestionIds: [firstQuestionId],
    };
    const result = await caller.interview.exportQuestionListPDF(input);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.filename).toContain('전체');
    expect(typeof result.data).toBe('string');
  });

  it('should reject unauthorized access', async () => {
    const ctx = createAuthContext(99999);

    const caller = appRouter.createCaller(ctx);
    type Input = inferProcedureInput<typeof appRouter.interview.getSessionDetail>;
    const input: Input = { sessionId: testSessionId };

    await expect(caller.interview.getSessionDetail(input)).rejects.toThrow();
  });
});
