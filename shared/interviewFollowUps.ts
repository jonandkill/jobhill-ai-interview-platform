export interface FollowUpAttemptLike {
  sessionId?: number | null;
  followUpQuestion: string;
  followUpAnswer?: string | null;
  followUpScore?: number | null;
  depth?: number | null;
}

export function getAnsweredUniqueFollowUps<T extends FollowUpAttemptLike>(rows: readonly T[]): T[] {
  const unique = new Map<string, T>();
  for (const row of rows) {
    if (
      typeof row.followUpAnswer !== "string" ||
      row.followUpAnswer.trim().length === 0 ||
      typeof row.followUpScore !== "number" ||
      !Number.isFinite(row.followUpScore)
    ) continue;
    const key = [
      row.sessionId ?? "none",
      row.depth ?? 1,
      row.followUpQuestion.trim().replace(/\s+/g, " "),
    ].join(":");
    if (!unique.has(key)) unique.set(key, row);
  }
  return Array.from(unique.values());
}
