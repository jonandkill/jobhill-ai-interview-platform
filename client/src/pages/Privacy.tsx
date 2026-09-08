import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Trash2, UserCheck, Mail, Clock, Server } from "lucide-react";
import { Link } from "wouter";
import { PUBLIC_BUSINESS_INFO, displayBusinessValue } from "@/lib/businessInfo";

export default function Privacy() {
  const lastUpdated = "2024년 12월 8일";
  const companyName = PUBLIC_BUSINESS_INFO.name;
  const supportEmail = displayBusinessValue(PUBLIC_BUSINESS_INFO.supportEmail);
  const businessEmail = displayBusinessValue(PUBLIC_BUSINESS_INFO.email);
  const contactPhone = displayBusinessValue(PUBLIC_BUSINESS_INFO.phone);
  const ceoName = displayBusinessValue(PUBLIC_BUSINESS_INFO.representative);
  const businessNumber = displayBusinessValue(PUBLIC_BUSINESS_INFO.businessNumber);
  const address = displayBusinessValue(PUBLIC_BUSINESS_INFO.address);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="잡앤킬 로고" className="h-10 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </header>

      <main className="container py-12 max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <Shield className="w-3 h-3 mr-1" />
            개인정보 보호
          </Badge>
          <h1 className="text-3xl font-bold mb-4">개인정보 처리방침</h1>
          <p className="text-muted-foreground">
            최종 업데이트: {lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-muted-foreground leading-relaxed">
              {companyName}(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 및 관련 법령을 준수하고 있습니다. 
              본 개인정보 처리방침은 회사가 제공하는 AI 면접 코칭 서비스(이하 "서비스")를 이용하는 과정에서 수집되는 개인정보의 
              처리에 관한 사항을 안내합니다.
            </p>
          </CardContent>
        </Card>

        {/* Section 1: 수집하는 개인정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              1. 수집하는 개인정보 항목
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">필수 수집 항목</h4>
              <div className="bg-muted/50 p-4 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">항목</th>
                      <th className="text-left py-2 font-medium">수집 목적</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">이메일 주소</td>
                      <td className="py-2">회원 식별 및 서비스 제공</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">이름(닉네임)</td>
                      <td className="py-2">서비스 내 표시 및 개인화</td>
                    </tr>
                    <tr>
                      <td className="py-2">로그인 방식</td>
                      <td className="py-2">계정 관리 및 보안</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">선택 수집 항목 (서비스 이용 시)</h4>
              <div className="bg-muted/50 p-4 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">항목</th>
                      <th className="text-left py-2 font-medium">수집 목적</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">이력서 내용</td>
                      <td className="py-2">맞춤형 면접 질문 생성</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">자기소개서 내용</td>
                      <td className="py-2">맞춤형 면접 질문 생성</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">면접 답변 내용</td>
                      <td className="py-2">AI 피드백 제공</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">음성 입력(일시 처리)</td>
                      <td className="py-2">답변 텍스트 변환 — 현재 앱은 녹음 파일을 면접 기록에 저장하지 않음</td>
                    </tr>
                    <tr>
                      <td className="py-2">지원 회사/직무 정보</td>
                      <td className="py-2">맞춤형 서비스 제공</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 mb-1">AI 처리 범위</p>
                  <p className="text-sm text-green-700">
                    앱은 이력서, 자기소개서, 면접 답변을 다른 사용자의 피드백에 재사용하지 않습니다. 연결된 AI 제공자의 보관·학습 정책은 운영 계약과 데이터 제어 설정에 따르므로, 운영자는 공개 전 실제 설정과 처리업체 정보를 확인해 고지해야 합니다.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: 개인정보 이용 목적 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Eye className="w-4 h-4 text-purple-600" />
              </div>
              2. 개인정보 수집 및 이용 목적
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">서비스 제공</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• AI 기반 맞춤형 면접 질문 생성</li>
                  <li>• 면접 답변에 대한 AI 피드백 제공</li>
                  <li>• 음성 면접 연습 기능 제공</li>
                  <li>• 면접 연습 기록 저장 및 조회</li>
                </ul>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">회원 관리</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 회원 가입 및 본인 확인</li>
                  <li>• 서비스 이용 기록 관리</li>
                  <li>• 구독 및 결제 관리</li>
                  <li>• 고객 문의 응대</li>
                </ul>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">서비스 개선</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 서비스 품질 향상</li>
                  <li>• 사용자 경험 개선</li>
                  <li>• 통계 분석 (익명화된 데이터)</li>
                </ul>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">법적 의무 이행</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 법령에 따른 의무 이행</li>
                  <li>• 분쟁 해결 및 민원 처리</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: 보유 및 이용 기간 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              3. 개인정보 보유 및 이용 기간
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 
              다만, 관련 법령에 따라 보존할 필요가 있는 경우 아래와 같이 보관합니다.
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">보존 항목</th>
                    <th className="text-left py-2 font-medium">보존 기간</th>
                    <th className="text-left py-2 font-medium">근거 법령</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">계약 또는 청약철회 기록</td>
                    <td className="py-2">5년</td>
                    <td className="py-2">전자상거래법</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">대금결제 및 재화 공급 기록</td>
                    <td className="py-2">5년</td>
                    <td className="py-2">전자상거래법</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">소비자 불만 또는 분쟁처리 기록</td>
                    <td className="py-2">3년</td>
                    <td className="py-2">전자상거래법</td>
                  </tr>
                  <tr>
                    <td className="py-2">웹사이트 방문 기록</td>
                    <td className="py-2">3개월</td>
                    <td className="py-2">통신비밀보호법</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Trash2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 mb-1">삭제 정책 운영 확인 필요</p>
                  <p className="text-sm text-blue-700">
                    면접 기록 삭제 기능은 사용자 소유권을 확인해 처리합니다. 계정 탈퇴와 장기 미이용 데이터의 자동 파기는 공개 운영 전 실제 삭제 API·백업 만료 절차·보존 기간을 확정하고 검증해야 합니다.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: 개인정보 보호 조치 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Lock className="w-4 h-4 text-green-600" />
              </div>
              4. 개인정보 보호 조치
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              회사는 이용자의 개인정보를 안전하게 보호하기 위해 다음과 같은 기술적, 관리적 보호조치를 시행하고 있습니다.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-5 h-5 text-primary" />
                  <h4 className="font-medium">기술적 보호조치</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>전송 보호:</strong> 개인정보는 HTTPS/TLS 연결을 통해 전송합니다. 저장 데이터의 보호 수준은 배포 환경과 연결된 저장소 설정을 포함해 운영자가 정기적으로 검증합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>보안 인증:</strong> OAuth 2.0 기반의 안전한 인증 시스템을 사용합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>접근 제한:</strong> 개인정보에 대한 접근은 최소한의 인원으로 제한됩니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>보안 모니터링:</strong> 24시간 보안 모니터링 시스템을 운영합니다.</span>
                  </li>
                </ul>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <h4 className="font-medium">관리적 보호조치</h4>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>내부 관리계획:</strong> 개인정보 보호를 위한 내부 관리계획을 수립하고 시행합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>직원 교육:</strong> 개인정보 취급 직원에 대한 정기적인 교육을 실시합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>접근 권한 관리:</strong> 개인정보 접근 권한을 최소화하고 정기적으로 검토합니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: 제3자 제공 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-red-600" />
              </div>
              5. 개인정보의 제3자 제공
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 mb-1">외부 처리 고지 원칙</p>
                  <p className="text-sm text-red-700">
                    음성 변환과 AI 피드백을 위해 연결된 서비스 제공자가 입력을 처리할 수 있습니다. 공개 운영 전 실제 처리업체, 처리 목적, 이전 국가, 보유 기간과 거부 방법을 운영 환경 기준으로 확정해 고지해야 합니다.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">예외적 제공 사유</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 이용자가 사전에 동의한 경우</li>
                <li>• 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                <li>• 통계작성, 학술연구 또는 시장조사를 위하여 필요한 경우로서 특정 개인을 식별할 수 없는 형태로 제공하는 경우</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: 사용자 권리 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-indigo-600" />
              </div>
              6. 이용자의 권리와 행사 방법
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">열람 및 정정</h4>
                <p className="text-sm text-muted-foreground">
                  본인의 개인정보를 열람하고, 잘못된 정보가 있는 경우 정정을 요청할 수 있습니다.
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">삭제 요청</h4>
                <p className="text-sm text-muted-foreground">
                  본인의 개인정보 삭제를 요청할 수 있습니다. 단, 법령에 따라 보존이 필요한 정보는 예외입니다.
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">처리 정지</h4>
                <p className="text-sm text-muted-foreground">
                  개인정보 처리의 정지를 요청할 수 있습니다.
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">동의 철회</h4>
                <p className="text-sm text-muted-foreground">
                  개인정보 수집 및 이용에 대한 동의를 철회할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
              <h4 className="font-medium text-indigo-800 mb-2">권리 행사 방법</h4>
              <p className="text-sm text-indigo-700 mb-2">
                위 권리는 다음 방법으로 행사할 수 있습니다:
              </p>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• 서비스 내 "프로필" 메뉴에서 직접 수정 및 삭제</li>
                <li>• 고객지원 이메일: {supportEmail}</li>
                <li>• 회원 탈퇴를 통한 전체 데이터 삭제</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 7: 개인정보 보호책임자 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                <Mail className="w-4 h-4 text-teal-600" />
              </div>
              7. 개인정보 보호책임자 및 문의처
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 
              아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">개인정보 보호책임자</h4>
                  <p className="text-sm text-muted-foreground">성명: {ceoName}</p>
                  <p className="text-sm text-muted-foreground">연락처: {contactPhone}</p>
                  <p className="text-sm text-muted-foreground">고객지원: {supportEmail}</p>
                  <p className="text-sm text-muted-foreground">비즈니스 문의: {businessEmail}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">회사 정보</h4>
                  <p className="text-sm text-muted-foreground">회사명: {companyName}</p>
                  <p className="text-sm text-muted-foreground">사업자등록번호: {businessNumber}</p>
                  <p className="text-sm text-muted-foreground">주소: {address}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-2">권익침해 구제방법</h4>
                <p className="text-sm text-muted-foreground">개인정보침해신고센터: 118 (privacy.kisa.or.kr)</p>
                <p className="text-sm text-muted-foreground">개인정보분쟁조정위원회: 1833-6972 (kopico.go.kr)</p>
                <p className="text-sm text-muted-foreground">대검찰청 사이버범죄수사단: 1301 (spo.go.kr)</p>
                <p className="text-sm text-muted-foreground">경찰청 사이버안전국: 182 (cyberbureau.police.go.kr)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 8: 정책 변경 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-gray-600" />
              </div>
              8. 개인정보 처리방침 변경
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              이 개인정보 처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 수 있으며, 
              변경되는 경우 최소 7일 전에 서비스 내 공지사항을 통해 안내해 드립니다. 
              다만, 이용자의 권리에 중대한 변경이 있는 경우에는 최소 30일 전에 안내해 드립니다.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>본 개인정보 처리방침은 {lastUpdated}부터 적용됩니다.</p>
          <p className="mt-2">
            <Link href="/" className="text-primary hover:underline">홈으로 돌아가기</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
