import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Interview = lazy(() => import("./pages/Interview"));
const InterviewResult = lazy(() => import("./pages/InterviewResult"));
const Pricing = lazy(() => import("./pages/Pricing"));
// Payment pages (legacy - hidden)
// import PaymentSuccess from "./pages/PaymentSuccess";
// import PaymentCancel from "./pages/PaymentCancel";
const CompanyAnalysis = lazy(() => import("./pages/CompanyAnalysis"));
const History = lazy(() => import("./pages/History"));
const MyPage = lazy(() => import("./pages/MyPage"));
const DifficultQuestions = lazy(() => import("./pages/DifficultQuestions"));
const SavedPractices = lazy(() => import("./pages/SavedPractices"));
const AdminLearning = lazy(() => import("./pages/AdminLearning"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Stats = lazy(() => import("./pages/Stats"));
const AdminCoupons = lazy(() => import("./pages/AdminCoupons"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const AdminCouponStats = lazy(() => import("./pages/AdminCouponStats"));
// Legacy payment pages (hidden)
// import PaymentKiwoompay from "./pages/PaymentKiwoompay";
// import TossPayment from "./pages/TossPayment";
// import TossPaymentSuccess from "./pages/TossPaymentSuccess";
// import TossPaymentFail from "./pages/TossPaymentFail";
// import PaymentHistory from "./pages/PaymentHistory";
const SharedQuestions = lazy(() => import("./pages/SharedQuestions"));
const SubscriptionManage = lazy(() => import("./pages/SubscriptionManage"));
const AdminPaymentDashboard = lazy(() => import("./pages/AdminPaymentDashboard"));
const AdminOrganizations = lazy(() => import("./pages/AdminOrganizations"));
const OrganizationApply = lazy(() => import("./pages/OrganizationApply"));
const Statistics = lazy(() => import("./pages/Statistics"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminPaymentLinks = lazy(() => import("./pages/AdminPaymentLinks"));
const Notifications = lazy(() => import("./pages/Notifications"));
const FollowUpHistory = lazy(() => import("./pages/FollowUpHistory"));
const CreditHistory = lazy(() => import("./pages/CreditHistory"));
const CreditRefundHistory = lazy(() => import("./pages/CreditRefundHistory"));
const TTSMonitoring = lazy(() => import("./pages/TTSMonitoring"));
const ExternalPaymentRequest = lazy(() => import("./pages/ExternalPaymentRequest"));
const HowToEarnCoupons = lazy(() => import("./pages/HowToEarnCoupons"));
const GovernmentBudgetGuide = lazy(() => import("./pages/GovernmentBudgetGuide"));
const EmailVerificationPending = lazy(() => import("./pages/EmailVerificationPending"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const GameAssessment = lazy(() => import("./pages/GameAssessment"));
const AIEvaluation = lazy(() => import("./pages/AIEvaluation"));
const ComprehensiveResults = lazy(() => import("./pages/ComprehensiveResults"));
const RealInterview = lazy(() => import("./pages/RealInterview"));

function RouteLoadingFallback() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
          aria-hidden="true"
        />
        화면을 불러오는 중입니다.
      </div>
    </main>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/email-verification-pending" component={EmailVerificationPending} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/interview" component={Interview} />
      <Route path="/interview/:id" component={Interview} />
      <Route path="/real-interview" component={RealInterview} />
      <Route path="/result/:id" component={InterviewResult} />
      <Route path="/pricing" component={Pricing} />
      {/* Legacy payment routes - hidden */}
      {/* <Route path="/payment/success" component={PaymentSuccess} /> */}
      {/* <Route path="/payment/cancel" component={PaymentCancel} /> */}
      {/* <Route path="/payment/kiwoompay" component={PaymentKiwoompay} /> */}
      {/* <Route path="/payment/toss" component={TossPayment} /> */}
      {/* <Route path="/payment/toss/success" component={TossPaymentSuccess} /> */}
      {/* <Route path="/payment/toss/fail" component={TossPaymentFail} /> */}
      <Route path="/company-analysis" component={CompanyAnalysis} />
      <Route path="/history" component={History} />
      <Route path="/mypage" component={MyPage} />
      {/* <Route path="/payment-history" component={PaymentHistory} /> */}
      <Route path="/subscription" component={SubscriptionManage} />
      <Route path="/payment/external" component={ExternalPaymentRequest} />
      <Route path="/how-to-earn-coupons" component={HowToEarnCoupons} />
      <Route path="/government-budget-guide" component={GovernmentBudgetGuide} />
      <Route path="/game-assessment" component={GameAssessment} />
      <Route path="/ai-evaluation" component={AIEvaluation} />
      <Route path="/admin/payments" component={AdminPaymentDashboard} />
      <Route path="/admin/payment-links" component={AdminPaymentLinks} />
      <Route path="/admin/organizations" component={AdminOrganizations} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/tts-monitoring" component={TTSMonitoring} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/organization/apply" component={OrganizationApply} />
      <Route path="/statistics" component={Statistics} />
      <Route path="/comprehensive-results" component={ComprehensiveResults} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/follow-up-history" component={FollowUpHistory} />
      <Route path="/credit-history" component={CreditHistory} />
      <Route path="/credit-refund-history" component={CreditRefundHistory} />
      <Route path="/difficult-questions" component={DifficultQuestions} />
      <Route path="/saved-practices" component={SavedPractices} />
      <Route path="/admin/learning" component={AdminLearning} />
      <Route path="/admin/coupons" component={AdminCoupons} />
      <Route path="/admin/reviews" component={AdminReviews} />
      <Route path="/admin/coupon-stats" component={AdminCouponStats} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/stats" component={Stats} />
      <Route path="/shared/:shareCode" component={SharedQuestions} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - AI Interview Coach uses dark theme by default for futuristic cyber aesthetic
// - Color palette is configured in index.css with Bruvi-inspired cyber blue/cyan colors
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<RouteLoadingFallback />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
