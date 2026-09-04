import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw, Calendar, CreditCard } from 'lucide-react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function CreditRefundHistory() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<'all' | 'refund'>('refund');

  const { data: historyData, isLoading, refetch } = trpc.freeLimit.history.useQuery({
    limit: 100,
    offset: 0,
  });
  
  const { data: creditCheck } = trpc.freeLimit.check.useQuery();

  // 환불 내역만 필터링
  const refundHistory = historyData?.history.filter(item => item.type === 'refund') || [];
  const displayHistory = filter === 'refund' ? refundHistory : historyData?.history || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container max-w-6xl py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard')}
              className="text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              대시보드로
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">크레딧 환불 내역</h1>
              <p className="text-slate-400 mt-1">오류로 인한 크레딧 환불 기록을 확인하세요</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-cyan-400 border-cyan-400/30 hover:bg-cyan-400/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">총 환불 횟수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {isLoading ? <Skeleton className="h-10 w-20" /> : refundHistory.length}
                <span className="text-lg text-slate-400 ml-2">회</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">총 환불 크레딧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyan-400">
                {isLoading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  refundHistory.reduce((sum, item) => sum + item.amount, 0)
                )}
                <span className="text-lg text-slate-400 ml-2">개</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">현재 잔액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {isLoading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  creditCheck?.questionCredits || 0
                )}
                <span className="text-lg text-slate-400 ml-2">개</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 버튼 */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'refund' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('refund')}
            className={filter === 'refund' ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-slate-700 text-slate-400'}
          >
            환불 내역만
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-slate-700 text-slate-400'}
          >
            전체 내역
          </Button>
        </div>

        {/* 환불 내역 테이블 */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              환불 내역
            </CardTitle>
            <CardDescription className="text-slate-400">
              {filter === 'refund' ? '환불 내역만 표시됩니다' : '모든 크레딧 내역이 표시됩니다'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : displayHistory.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">환불 내역이 없습니다</p>
                <p className="text-slate-500 text-sm mt-2">
                  오류 발생 시 자동으로 크레딧이 환불됩니다
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant={item.type === 'refund' ? 'default' : 'secondary'}
                          className={
                            item.type === 'refund'
                              ? 'bg-green-600/20 text-green-400 border-green-600/30'
                              : 'bg-slate-700 text-slate-300'
                          }
                        >
                          {item.type === 'refund' ? '환불' : item.type === 'purchase' ? '구매' : '사용'}
                        </Badge>
                        <span className="text-white font-medium">{item.description}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(item.createdAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                        </div>
                        {item.relatedSessionId && (
                          <span className="text-slate-500">세션 #{item.relatedSessionId}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-bold ${
                          item.type === 'refund' ? 'text-green-400' : item.type === 'purchase' ? 'text-cyan-400' : 'text-red-400'
                        }`}
                      >
                        {item.type === 'refund' || item.type === 'purchase' ? '+' : '-'}
                        {item.amount}
                      </div>
                      <div className="text-sm text-slate-500">잔액: {item.balance}</div>
                    </div>
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
                <p className="font-medium mb-2">크레딧 환불 정책</p>
                <ul className="space-y-1 text-cyan-200/80">
                  <li>• 시스템 오류로 인한 면접 중단 시 자동으로 크레딧이 환불됩니다</li>
                  <li>• TTS 음성 생성 오류 시에도 크레딧이 환불됩니다</li>
                  <li>• 환불된 크레딧은 즉시 계정에 반영됩니다</li>
                  <li>• 환불 내역은 최대 100건까지 조회 가능합니다</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
