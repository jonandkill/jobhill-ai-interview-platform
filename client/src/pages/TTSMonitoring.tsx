import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function TTSMonitoring() {
  const [, setLocation] = useLocation();

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.ttsMonitoring.getLogs.useQuery({
    limit: 50,
    offset: 0,
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.ttsMonitoring.getStats.useQuery();

  const handleRefresh = () => {
    refetchLogs();
    refetchStats();
  };

  const getErrorTypeBadge = (errorType: string) => {
    const colors: Record<string, string> = {
      edge_tts_failure: 'bg-red-600/20 text-red-400 border-red-600/30',
      audio_playback_error: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
      fallback_success: 'bg-green-600/20 text-green-400 border-green-600/30',
    };
    return colors[errorType] || 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container max-w-7xl py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/admin/settings')}
              className="text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              관리자 설정
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">TTS 품질 모니터링</h1>
              <p className="text-slate-400 mt-1">음성 생성 오류 및 품질 지표를 모니터링합니다</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="text-cyan-400 border-cyan-400/30 hover:bg-cyan-400/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                총 오류 수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">
                {statsLoading ? <Skeleton className="h-10 w-20" /> : stats?.totalErrors || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Edge TTS 실패</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-400">
                {statsLoading ? <Skeleton className="h-10 w-20" /> : stats?.errorsByType?.edge_tts_failure || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">오디오 재생 오류</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">
                {statsLoading ? <Skeleton className="h-10 w-20" /> : stats?.errorsByType?.audio_playback_error || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                영향받은 사용자
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyan-400">
                {statsLoading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  Object.keys(stats?.errorsByUser || {}).length
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 오류 유형별 통계 */}
        <Card className="bg-slate-900/50 border-slate-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              오류 유형별 통계
            </CardTitle>
            <CardDescription className="text-slate-400">
              각 오류 유형별 발생 횟수를 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats?.errorsByType || {}).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={getErrorTypeBadge(type)}>{type}</Badge>
                      <span className="text-white font-medium">
                        {type === 'edge_tts_failure'
                          ? 'Edge TTS 실패'
                          : type === 'audio_playback_error'
                          ? '오디오 재생 오류'
                          : type === 'fallback_success'
                          ? '폴백 성공'
                          : type}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">{count as number}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 오류 로그 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              최근 오류 로그
            </CardTitle>
            <CardDescription className="text-slate-400">최근 50개의 TTS 오류 기록</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : logs && logs.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">오류 로그가 없습니다</p>
                <p className="text-slate-500 text-sm mt-2">TTS 시스템이 정상 작동 중입니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs?.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getErrorTypeBadge(log.errorType)}>{log.errorType}</Badge>
                        <span className="text-sm text-slate-400">
                          사용자 ID: {log.userId}
                          {log.sessionId && ` | 세션 #${log.sessionId}`}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                      </span>
                    </div>
                    <div className="text-sm text-red-300 mb-2">
                      <strong>오류 메시지:</strong> {log.errorMessage}
                    </div>
                    {log.questionText && (
                      <div className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                        <strong>질문 텍스트:</strong> {log.questionText}
                      </div>
                    )}
                    {log.voiceType && (
                      <div className="text-xs text-slate-500 mt-2">음성 유형: {log.voiceType}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 안내 메시지 */}
        <Card className="mt-6 bg-cyan-900/20 border-cyan-800/30">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="text-cyan-400 mt-1">ℹ️</div>
              <div className="text-sm text-cyan-100">
                <p className="font-medium mb-2">TTS 모니터링 가이드</p>
                <ul className="space-y-1 text-cyan-200/80">
                  <li>• Edge TTS 실패율이 높으면 서버 상태를 확인하세요</li>
                  <li>• 오디오 재생 오류는 클라이언트 브라우저 호환성 문제일 수 있습니다</li>
                  <li>• 폴백 성공은 Web Speech API로 대체 재생된 경우입니다</li>
                  <li>• 특정 사용자에게 오류가 집중되면 개별 지원이 필요할 수 있습니다</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
