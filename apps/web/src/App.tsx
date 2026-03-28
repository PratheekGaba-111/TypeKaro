import React, { Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./state/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { TypingPage } from "./pages/TypingPage";
import { PianoTilesPage } from "./pages/PianoTilesPage";

const ResultsPage = React.lazy(() =>
  import("./pages/ResultsPage").then((module) => ({ default: module.ResultsPage }))
);
const DashboardPage = React.lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage }))
);
const HistoryPage = React.lazy(() =>
  import("./pages/HistoryPage").then((module) => ({ default: module.HistoryPage }))
);
const HistoryDetailPage = React.lazy(() =>
  import("./pages/HistoryDetailPage").then((module) => ({ default: module.HistoryDetailPage }))
);

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isHydrating } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Layout>{children}</Layout>;
};

const PageLoader: React.FC = () => (
  <div className="panel-solid rounded-3xl border border-white/10 px-6 py-8 text-sm text-cloud/70">
    Loading...
  </div>
);

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/typing"
        element={
          <Protected>
            <TypingPage />
          </Protected>
        }
      />
      <Route
        path="/piano"
        element={
          <Protected>
            <PianoTilesPage />
          </Protected>
        }
      />
      <Route
        path="/results"
        element={
          <Protected>
            <Suspense fallback={<PageLoader />}>
              <ResultsPage />
            </Suspense>
          </Protected>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          </Protected>
        }
      />
      <Route
        path="/history"
        element={
          <Protected>
            <Suspense fallback={<PageLoader />}>
              <HistoryPage />
            </Suspense>
          </Protected>
        }
      />
      <Route
        path="/history/:id"
        element={
          <Protected>
            <Suspense fallback={<PageLoader />}>
              <HistoryDetailPage />
            </Suspense>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/typing" replace />} />
    </Routes>
  );
};

export default App;
