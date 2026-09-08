import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { CreditCard, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Settings, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

const paymentMethodLabels: Record<string, string> = {
  CARD: "신용/체크카드",
  VACCOUNT: "가상계좌",
  TRANSFER: "계좌이체",
  KAKAOPAY: "카카오페이",
  NAVERPAY: "네이버페이",
  TOSSPAY: "토스페이",
  PHONE: "휴대폰",
  OTHER: "기타",
};

export default function AdminPaymentDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "monthly">("daily");
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{ id: string; name: string; price: number; discountRate: number } | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [newDiscountRate, setNewDiscountRate] = useState("");

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.adminPayment.getStats.useQuery();
  const { data: dailyStats } = trpc.adminPayment.getDailyStats.useQuery();
  const { data: monthlyStats } = trpc.adminPayment.getMonthlyStats.useQuery();
  const { data: methodStats } = trpc.adminPayment.getMethodStats.useQuery();
  const { data: recentPayments } = trpc.adminPayment.getRecentPayments.useQuery();
  const { data: products } = trpc.adminPayment.getProducts.useQuery();

  const updateProductMutation = trpc.adminPayment.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("상품 가격이 업데이트되었습니다.");
      setPriceDialogOpen(false);
      setEditingProduct(null);
      refetchStats();
    },
    onError: (error) => {
      toast.error(error.message || "가격 업데이트에 실패했습니다.");
    },
  });

  const handleUpdatePrice = () => {
    if (!editingProduct) return;
    
    updateProductMutation.mutate({
      productId: editingProduct.id,
      price: parseInt(newPrice) || editingProduct.price,
      discountRate: parseInt(newDiscountRate) || editingProduct.discountRate,
    });
  };

  const openPriceDialog = (product: { id: string; name: string; price: number; discountRate: number }) => {
    setEditingProduct(product);
    setNewPrice(product.price.toString());
    setNewDiscountRate(product.discountRate.toString());
    setPriceDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">완료</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">대기중</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">실패</Badge>;
      case "refunded":
        return <Badge className="bg-gray-100 text-gray-800">환불</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">결제 대시보드</h1>
            <p className="text-muted-foreground">결제 현황 및 매출 통계를 확인하세요.</p>
          </div>
          <Button variant="outline" onClick={() => refetchStats()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>

        {/* 요약 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 매출</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "로딩중..." : formatCurrency(stats?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                전월 대비 {stats?.revenueGrowth || 0}%
                {(stats?.revenueGrowth || 0) >= 0 ? (
                  <TrendingUp className="inline ml-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="inline ml-1 h-3 w-3 text-red-500" />
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">환불 금액</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? "로딩중..." : formatCurrency(stats?.totalRefunds || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                환불률 {stats?.refundRate || 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">순매출</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? "로딩중..." : formatCurrency(stats?.netRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                총 매출 - 환불
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">결제 건수</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "로딩중..." : (stats?.totalTransactions || 0).toLocaleString()}건
              </div>
              <p className="text-xs text-muted-foreground">
                이번 달 {stats?.monthlyTransactions || 0}건
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 차트 탭 */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">매출 추이</TabsTrigger>
            <TabsTrigger value="methods">결제 수단별</TabsTrigger>
            <TabsTrigger value="products">상품 가격 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>매출 추이</CardTitle>
                    <CardDescription>일별/월별 매출 현황</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedPeriod === "daily" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPeriod("daily")}
                    >
                      일별
                    </Button>
                    <Button
                      variant={selectedPeriod === "monthly" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPeriod("monthly")}
                    >
                      월별
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedPeriod === "daily" ? dailyStats : monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "매출"]}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Bar dataKey="revenue" fill="#0088FE" name="매출" />
                      <Bar dataKey="refunds" fill="#FF8042" name="환불" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="methods" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>결제 수단별 비율</CardTitle>
                  <CardDescription>결제 수단별 매출 분포</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={methodStats?.map((item) => ({
                            ...item,
                            name: paymentMethodLabels[item.method] || item.method,
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {methodStats?.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>결제 수단별 통계</CardTitle>
                  <CardDescription>결제 수단별 상세 현황</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>결제 수단</TableHead>
                        <TableHead className="text-right">건수</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {methodStats?.map((item) => (
                        <TableRow key={item.method}>
                          <TableCell>{paymentMethodLabels[item.method] || item.method}</TableCell>
                          <TableCell className="text-right">{item.count}건</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>상품 가격 관리</CardTitle>
                <CardDescription>상품별 가격 및 할인율을 설정하세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상품명</TableHead>
                      <TableHead className="text-right">정가</TableHead>
                      <TableHead className="text-right">할인율</TableHead>
                      <TableHead className="text-right">판매가</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right">{product.discountRate}%</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(Math.round(product.price * (1 - product.discountRate / 100)))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPriceDialog(product)}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            수정
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 최근 결제 내역 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 결제 내역</CardTitle>
            <CardDescription>최근 20건의 결제 내역</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>주문번호</TableHead>
                  <TableHead>사용자</TableHead>
                  <TableHead>상품</TableHead>
                  <TableHead>결제 수단</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>결제일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">{payment.orderNo}</TableCell>
                    <TableCell>{payment.userName || "알 수 없음"}</TableCell>
                    <TableCell>{payment.productName}</TableCell>
                    <TableCell>{payment.paymentMethod ? (paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod) : "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{formatDate(typeof payment.createdAt === 'number' ? payment.createdAt : new Date(payment.createdAt).getTime())}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 가격 수정 다이얼로그 */}
        <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>상품 가격 수정</DialogTitle>
              <DialogDescription>
                {editingProduct?.name}의 가격과 할인율을 수정하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  정가
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="text-right">
                  할인율 (%)
                </Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={newDiscountRate}
                  onChange={(e) => setNewDiscountRate(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">판매가</Label>
                <div className="col-span-3 text-lg font-bold text-primary">
                  {formatCurrency(Math.round((parseInt(newPrice) || 0) * (1 - (parseInt(newDiscountRate) || 0) / 100)))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPriceDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleUpdatePrice} disabled={updateProductMutation.isPending}>
                {updateProductMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
