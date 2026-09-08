import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Quote, Star } from "lucide-react";

export default function ReviewsSection() {
  const { data: reviews, isLoading } = trpc.review.getApproved.useQuery({ limit: 6 });
  const approvedReviews = reviews ?? [];

  return (
    <section className="bg-gradient-to-b from-white to-gray-50 px-4 py-16 dark:from-background dark:to-muted/20" aria-labelledby="reviews-heading">
      <div className="container">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800"><MessageSquare className="h-4 w-4" /> 검수된 사용자 후기</div>
          <h2 id="reviews-heading" className="text-3xl font-bold">사용자가 남긴 연습 경험</h2>
          <p className="mt-3 text-sm text-muted-foreground">관리자 승인 후 공개된 실제 후기만 표시합니다. 서비스가 채용 결과를 보장하지는 않습니다.</p>
        </div>

        {isLoading ? (
          <div className="mx-auto h-28 max-w-2xl animate-pulse rounded-xl bg-muted" aria-label="후기 불러오는 중" />
        ) : approvedReviews.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-xl border border-dashed bg-background px-5 py-10 text-center">
            <MessageSquare className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 font-medium">아직 공개된 후기가 없습니다</p>
            <p className="mt-1 text-sm text-muted-foreground">검수된 후기가 등록되면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {approvedReviews.map(review => (
              <Card key={review.id} className="relative overflow-hidden">
                <CardContent className="pt-6">
                  <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/10" />
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{(review.userName || "익명").charAt(0)}</div>
                    <div><p className="text-sm font-semibold">{review.userName || "익명"}</p><div className="mt-1 flex" aria-label={`${review.rating || 0}점 후기`}>{[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-3.5 w-3.5 ${star <= (review.rating || 0) ? "fill-yellow-500 text-yellow-500" : "text-muted"}`} />)}</div></div>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{review.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
