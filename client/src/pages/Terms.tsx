import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Scale, Shield, AlertTriangle, Users, CreditCard, Ban, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { PUBLIC_BUSINESS_INFO, displayBusinessValue } from "@/lib/businessInfo";

// 회사 정보
const COMPANY_INFO = {
  name: PUBLIC_BUSINESS_INFO.name,
  ceo: displayBusinessValue(PUBLIC_BUSINESS_INFO.representative),
  businessNumber: displayBusinessValue(PUBLIC_BUSINESS_INFO.businessNumber),
  address: displayBusinessValue(PUBLIC_BUSINESS_INFO.address),
  phone: displayBusinessValue(PUBLIC_BUSINESS_INFO.phone),
  email: displayBusinessValue(PUBLIC_BUSINESS_INFO.email),
  salesNumber: displayBusinessValue(PUBLIC_BUSINESS_INFO.salesNumber),
  jobInfoNumber: displayBusinessValue(PUBLIC_BUSINESS_INFO.jobInfoNumber),
};

const SERVICE_NAME = "AI 면접 코치";
const EFFECTIVE_DATE = "2024년 1월 1일";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* 헤더 */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">이용약관</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        <div className="space-y-6">
          {/* 제목 */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{SERVICE_NAME} 서비스 이용약관</h1>
            <p className="text-muted-foreground">시행일: {EFFECTIVE_DATE}</p>
          </div>

          {/* 제1조 목적 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                제1조 (목적)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                본 약관은 {COMPANY_INFO.name}(이하 "회사")이 제공하는 {SERVICE_NAME} 서비스(이하 "서비스")의 
                이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </CardContent>
          </Card>

          {/* 제2조 정의 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                제2조 (정의)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>"서비스"</strong>란 회사가 제공하는 AI 기반 면접 연습, 피드백, 질문 생성 등 모든 관련 서비스를 의미합니다.</li>
                <li><strong>"회원"</strong>이란 본 약관에 동의하고 회사와 서비스 이용계약을 체결한 자를 의미합니다.</li>
                <li><strong>"아이디(ID)"</strong>란 회원 식별과 서비스 이용을 위해 회원이 설정하고 회사가 승인한 문자와 숫자의 조합을 의미합니다.</li>
                <li><strong>"콘텐츠"</strong>란 서비스 내에서 제공되는 면접 질문, AI 피드백, 모범답안 등 모든 정보를 의미합니다.</li>
                <li><strong>"유료 서비스"</strong>란 회사가 유료로 제공하는 프리미엄 기능 및 서비스를 의미합니다.</li>
              </ol>
            </CardContent>
          </Card>

          {/* 제3조 약관의 효력 및 변경 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="w-5 h-5 text-primary" />
                제3조 (약관의 효력 및 변경)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ol className="list-decimal pl-5 space-y-2">
                <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
                <li>회사는 필요한 경우 관련 법령을 위반하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.</li>
                <li>약관이 변경되는 경우 회사는 변경 내용과 적용일자를 명시하여 서비스 내 공지사항을 통해 최소 7일 전에 공지합니다.</li>
                <li>회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
              </ol>
            </CardContent>
          </Card>

          {/* 제4조 회원가입 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                제4조 (회원가입)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ol className="list-decimal pl-5 space-y-2">
                <li>회원가입은 이용자가 본 약관에 동의하고 회사가 정한 가입 절차를 완료함으로써 성립됩니다.</li>
                <li>회사는 다음 각 호에 해당하는 경우 회원가입을 거부하거나 사후에 이용계약을 해지할 수 있습니다:
                  <ul className="list-disc pl-5 mt-2">
                    <li>타인의 정보를 도용한 경우</li>
                    <li>허위 정보를 기재한 경우</li>
                    <li>기타 회원으로 등록하는 것이 회사의 서비스 운영에 현저히 지장이 있다고 판단되는 경우</li>
                  </ul>
                </li>
                <li>회원은 가입 시 등록한 정보에 변경이 있는 경우 즉시 수정하여야 합니다.</li>
              </ol>
            </CardContent>
          </Card>

          {/* 제5조 서비스 이용 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                제5조 (서비스 이용)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ol className="list-decimal pl-5 space-y-2">
                <li>서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 1일 24시간 제공됩니다.</li>
                <li>회사는 시스템 정기점검, 증설 및 교체, 고장 등의 사유로 서비스 제공을 일시적으로 중단할 수 있습니다.</li>
                <li>회사는 서비스의 내용, 이용방법, 이용시간에 대하여 변경이 있는 경우 사전에 공지합니다.</li>
                <li>회사가 제공하는 AI 피드백 및 모범답안은 참고용이며, 실제 면접 결과를 보장하지 않습니다.</li>
              </ol>
            </CardContent>
          </Card>

          {/* 제6조 유료 서비스 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                제6조 (유료 서비스 및 결제)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ol className="list-decimal pl-5 space-y-2">
                <li>회사는 무료 서비스 외에 유료 서비스를 제공할 수 있으며, 유료 서비스 이용 시 해당 요금을 결제해야 합니다.</li>
                <li>유료 서비스의 이용요금, 결제방법, 환불정책 등은 서비스 내 별도 안내에 따릅니다.</li>
                <li>자동 갱신 상품은 결제 전에 갱신 주기·금액·해지 방법을 명시하고 이용자가 동의한 경우에만 갱신합니다.</li>
                <li>환불은 관련 법령 및 회사의 환불정책에 따라 처리됩니다.</li>
              </ol>
            </CardContent>
          </Card>

          {/* 제7조 회원의 의무 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                제7조 (회원의 의무)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>회원은 다음 각 호의 행위를 하여서는 안 됩니다:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
                <li>서비스에서 제공하는 콘텐츠를 무단으로 복제, 배포, 상업적으로 이용하는 행위</li>
                <li>회사의 서비스 운영을 방해하거나 시스템에 부하를 주는 행위</li>
                <li>다른 회원의 서비스 이용을 방해하거나 개인정보를 침해하는 행위</li>
                <li>회사의 직원이나 관계자를 사칭하는 행위</li>
                <li>기타 관련 법령에 위반되는 행위</li>
              </ol>
            </CardContent>
          </Card>

          {/* 제8조 회사의 의무 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                제8조 (회사의 의무)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ol className="list-decimal pl-5 space-y-2">
                <li>회사는 관련 법령과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않습니다.</li>
                <li>회사는 계속적이고 안정적인 서비스 제공을 위해 최선을 다합니다.</li>
                <li>회사는 회원의 개인정보를 보호하기 위해 개인정보처리방침을 수립하고 이를 준수합니다.</li>
                <li>회사는 회원의 불만이나 피해구제 요청을 적절하게 처리하기 위한 시스템을 운영합니다.</li>
              </ol>
            </CardContent>
          </Card>

          {/* 제9조 계약 해지 및 이용 제한 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ban className="w-5 h-5 text-primary" />
                제9조 (계약 해지 및 이용 제한)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ol className="list-decimal pl-5 space-y-2">
                <li>회원은 언제든지 서비스 내 설정 메뉴를 통해 탈퇴를 요청할 수 있으며, 회사는 즉시 처리합니다.</li>
                <li>회사는 회원이 본 약관을 위반한 경우 사전 통보 후 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.</li>
                <li>회원 탈퇴 시 개인정보 및 이용 기록은 개인정보처리방침에 따라 처리됩니다.</li>
              </ol>
            </CardContent>
          </Card>

          {/* 제10조 면책조항 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-primary" />
                제10조 (면책조항)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ol className="list-decimal pl-5 space-y-2">
                <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인해 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
                <li>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
                <li>회사가 제공하는 AI 피드백, 예시 답변, 답변 준비도 등은 연습용 참고 정보이며, 실제 채용 결과나 사람의 성격·감정을 판단하지 않습니다.</li>
                <li>회사는 회원이 서비스를 통해 얻은 정보로 인해 발생한 손해에 대해 책임을 지지 않습니다.</li>
              </ol>
            </CardContent>
          </Card>

          {/* 제11조 분쟁 해결 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scale className="w-5 h-5 text-primary" />
                제11조 (분쟁 해결)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ol className="list-decimal pl-5 space-y-2">
                <li>회사와 회원 간에 발생한 분쟁에 관한 소송은 대한민국 법을 준거법으로 합니다.</li>
                <li>서비스 이용으로 발생한 분쟁에 대해 소송이 제기될 경우 회사의 본사 소재지를 관할하는 법원을 전속 관할법원으로 합니다.</li>
              </ol>
            </CardContent>
          </Card>

          {/* 부칙 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">부칙</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>본 약관은 {EFFECTIVE_DATE}부터 시행됩니다.</p>
            </CardContent>
          </Card>

          {/* 회사 정보 */}
          <Card className="bg-secondary/30">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">서비스 제공자 정보</h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">상호명</p>
                  <p className="font-medium">{COMPANY_INFO.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">대표자</p>
                  <p className="font-medium">{COMPANY_INFO.ceo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">사업자등록번호</p>
                  <p className="font-medium">{COMPANY_INFO.businessNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">통신판매업신고</p>
                  <p className="font-medium">{COMPANY_INFO.salesNumber}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">주소</p>
                  <p className="font-medium">{COMPANY_INFO.address}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">대표전화</p>
                  <p className="font-medium">{COMPANY_INFO.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">이메일</p>
                  <p className="font-medium">{COMPANY_INFO.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 하단 버튼 */}
          <div className="flex justify-center pt-4">
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                홈으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
