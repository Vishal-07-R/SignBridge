import { useEffect, useState } from 'react';
import { PageRoute, getRouteFromHash, ROUTE_HASH_MAP } from './types/navigation.ts';
import { AccessibilityProvider } from './context/AccessibilityContext.tsx';
import { Navbar } from './components/nav/Navbar.tsx';
import { AuthModal } from './components/AuthModal.tsx';

// Pages
import { LandingPage } from './pages/LandingPage.tsx';
import { WorkspacePage } from './pages/WorkspacePage.tsx';
import { TextToIslPage } from './pages/TextToIslPage.tsx';
import { ImageToIslPage } from './pages/ImageToIslPage.tsx';
import { VideoToIslPage } from './pages/VideoToIslPage.tsx';
import { CameraRecognitionPage } from './pages/CameraRecognitionPage.tsx';
import { VideoRecognitionPage } from './pages/VideoRecognitionPage.tsx';
import { UserDashboardPage } from './pages/UserDashboardPage.tsx';
import { TranslationHistoryPage } from './pages/TranslationHistoryPage.tsx';
import { SavedSignsPage } from './pages/SavedSignsPage.tsx';
import { VocabularyPage } from './pages/VocabularyPage.tsx';
import { AccessibilityPage } from './pages/AccessibilityPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { VocabularyReviewPage } from './pages/VocabularyReviewPage.tsx';
import { DatasetImportPage } from './pages/DatasetImportPage.tsx';
import { SystemAuditPage } from './pages/SystemAuditPage.tsx';
import { HelpPrivacyPage } from './pages/HelpPrivacyPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { VerifyResetPage } from './pages/VerifyResetPage.tsx';

interface HealthData {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  timestamp: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  permissions: string[];
}

interface SignItem {
  id: string;
  gloss: string;
  category: string;
  description: string;
  is_demo: boolean;
  is_reviewed: boolean;
  linguist_notes: string;
}

export function AppContent() {
  const [currentRoute, setCurrentRoute] = useState<PageRoute>(() =>
    typeof window !== 'undefined' ? getRouteFromHash(window.location.hash) : 'landing'
  );

  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthStatus, setHealthStatus] = useState<'loading' | 'connected' | 'offline'>('loading');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [demoSigns, setDemoSigns] = useState<SignItem[]>([]);

  // Hash change routing
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(getRouteFromHash(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (route: PageRoute) => {
    const hash = ROUTE_HASH_MAP[route] || '#/';
    window.location.hash = hash;
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let isMounted = true;

    // Fetch Health
    fetch('/api/v1/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthData | null) => {
        if (!isMounted) return;
        if (data) {
          setHealth(data);
          setHealthStatus('connected');
        } else {
          setHealthStatus('offline');
        }
      })
      .catch(() => {
        if (isMounted) setHealthStatus('offline');
      });

    // Check active session
    fetch('/api/v1/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user: UserProfile | null) => {
        if (!isMounted) return;
        if (user && user.email) {
          setCurrentUser(user);
          const match = document.cookie.match(/signbridge_csrf=([^;]+)/);
          if (match) setCsrfToken(match[1]);
        }
      })
      .catch(() => {});

    // Fetch DEMO vocabulary seed
    fetch('/api/v1/signs?limit=12')
      .then((res) => (res.ok ? res.json() : null))
      .then((signs: unknown) => {
        if (isMounted && Array.isArray(signs)) {
          setDemoSigns(signs as SignItem[]);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
    } catch {
      // Ignored
    } finally {
      setCurrentUser(null);
      setCsrfToken(null);
    }
  };

  const handleAuthSuccess = (user: UserProfile, token: string) => {
    setCurrentUser(user);
    setCsrfToken(token);
    setIsAuthModalOpen(false);
  };

  // Render current page component
  const renderCurrentPage = () => {
    switch (currentRoute) {
      case 'landing':
        return <LandingPage onNavigate={navigateTo} demoSigns={demoSigns} />;
      case 'workspace':
        return <WorkspacePage />;
      case 'text-to-isl':
        return <TextToIslPage />;
      case 'image-to-isl':
        return <ImageToIslPage />;
      case 'video-to-isl':
        return <VideoToIslPage />;
      case 'camera':
        return <CameraRecognitionPage />;
      case 'video-rec':
        return <VideoRecognitionPage />;
      case 'dashboard':
        return <UserDashboardPage currentUser={currentUser} onLogout={handleLogout} />;
      case 'history':
        return <TranslationHistoryPage onNavigate={navigateTo} />;
      case 'saved':
        return <SavedSignsPage onNavigate={navigateTo} />;
      case 'vocabulary':
        return <VocabularyPage demoSigns={demoSigns} />;
      case 'accessibility':
        return <AccessibilityPage />;
      case 'admin':
        return <AdminDashboardPage onNavigate={navigateTo} />;
      case 'admin-vocabulary':
        return <VocabularyReviewPage demoSigns={demoSigns} />;
      case 'admin-datasets':
        return <DatasetImportPage />;
      case 'admin-audit':
        return <SystemAuditPage healthStatus={healthStatus} healthVersion={health?.version} />;
      case 'help':
        return <HelpPrivacyPage />;
      case 'auth':
        return <AuthPage onAuthSuccess={handleAuthSuccess} onNavigate={navigateTo} />;
      case 'verify-reset':
        return <VerifyResetPage onNavigate={navigateTo} />;
      default:
        return <LandingPage onNavigate={navigateTo} demoSigns={demoSigns} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans">
      {/* Top Universal Navbar */}
      <Navbar
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        healthStatus={healthStatus}
        healthVersion={health?.version}
      />

      {/* Subheader Stage Badges for Test and Visual Compatibility */}
      <div className="bg-[#111827]/60 border-b border-gray-800/80 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400">
        <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold">SignBridge:</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Stage 1 Scaffold
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
              Stage 2 Foundation
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
              Stage 3 UI & Avatar
            </span>
          </div>

          <div
            aria-label="API Status"
            className="flex items-center gap-1.5 text-gray-400"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                healthStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>
              {healthStatus === 'connected'
                ? `API Connected (${health?.version})`
                : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#111827] px-6 py-4 text-center text-xs text-gray-400">
        AI SignBridge © 2026. Built with integrity, verified schemas, and accessible 3D avatar animation.
      </footer>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export function App() {
  return (
    <AccessibilityProvider>
      <AppContent />
    </AccessibilityProvider>
  );
}

export default App;
