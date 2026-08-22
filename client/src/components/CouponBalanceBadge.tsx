import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Ticket, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export function CouponBalanceBadge() {
  const { data: freeTime, isLoading } = trpc.coupon.myFreeTime.useQuery();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Ticket className="w-3 h-3" />
        <span className="text-xs">...</span>
      </Badge>
    );
  }

  const totalMinutes = freeTime?.totalMinutes || 0;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const isLow = totalMinutes < 30; // 30분 미만이면 경고

  return (
    <Link href="/admin/coupons">
      <Badge 
        variant={isLow ? "destructive" : "outline"} 
        className="gap-1 cursor-pointer hover:opacity-80 transition-opacity"
      >
        {isLow && <AlertTriangle className="w-3 h-3" />}
        {!isLow && <Ticket className="w-3 h-3" />}
        <span className="text-xs font-medium">
          {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
        </span>
      </Badge>
    </Link>
  );
}
