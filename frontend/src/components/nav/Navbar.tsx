import { useState } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  Eye,
  Languages,
  Layers,
  LogOut,
  Menu,
  Shield,
  Sliders,
  Upload,
  User as UserIcon,
  Video,
  Wind,
  X,
} from 'lucide-react';
import { PageRoute } from '../../types/navigation.ts';
import { useAccessibility } from '../../context/AccessibilityContext.tsx';

interface NavbarProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  currentUser: {
    id: string;
    email: string;
    full_name: string;
    roles: string[];
    is_verified: boolean;
  } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  healthStatus: 'loading' | 'connected' | 'offline';
  healthVersion?: string;
}

export function Navbar({
  currentRoute,
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
  healthStatus,
  healthVersion,
}: NavbarProps) {
  const { reducedMotion, highContrast, setReducedMotion, setHighContrast } = useAccessibility();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const handleNav = (route: PageRoute) => {
    onNavigate(route);
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  const isAdmin = currentUser?.roles?.includes('admin');

  return (
    <header className="border-b border-gray-800 bg-[#111827]/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Branding & Stage Badges */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNav('landing')}>
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
            SB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white hover:text-cyan-300 transition-colors">
                AI SignBridge
              </span>
              <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-medium">
                Stage 3 UI & Avatar
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Two-Way Indian Sign Language Communication Platform
            </p>
          </div>
        </div>

        {/* Primary Action Buttons (Prominently Featured per REQUIREMENTS.md) */}
        <div className="hidden lg:flex items-center space-x-2">
          <button
            type="button"
            aria-label="Translate Workspace"
            onClick={() => handleNav('workspace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentRoute === 'workspace'
                ? 'bg-cyan-400 text-gray-950 shadow-md shadow-cyan-400/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-gray-950'
            }`}
          >
            <span>Start Translating</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            aria-label="Live Camera Stream"
            onClick={() => handleNav('camera')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
              currentRoute === 'camera'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                : 'bg-[#1f2937] hover:bg-gray-700 border-gray-700 text-gray-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Camera</span>
          </button>

          <button
            type="button"
            aria-label="Video File Processing"
            onClick={() => handleNav('video-to-isl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
              currentRoute === 'video-to-isl'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                : 'bg-[#1f2937] hover:bg-gray-700 border-gray-700 text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Video</span>
          </button>
        </div>

        {/* Center Desktop Navigation Dropdowns */}
        <nav className="hidden xl:flex items-center space-x-1 text-xs">
          {/* Translate Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('translate')}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1 font-medium transition-colors ${
                ['workspace', 'text-to-isl', 'image-to-isl', 'video-to-isl'].includes(currentRoute)
                  ? 'text-cyan-400 bg-cyan-950/50'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>Translate</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {activeDropdown === 'translate' && (
              <div className="absolute top-full mt-1 w-48 rounded-lg bg-[#111827] border border-gray-700 shadow-2xl py-1 z-50">
                <button
                  type="button"
                  onClick={() => handleNav('workspace')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200 flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Main Workspace (Two-Way)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('text-to-isl')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200 flex items-center gap-2"
                >
                  <Languages className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Text to ISL</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('image-to-isl')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200 flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Image / OCR to ISL</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('video-to-isl')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200 flex items-center gap-2"
                >
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Video Speech to ISL</span>
                </button>
              </div>
            )}
          </div>

          {/* Recognize Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('recognize')}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1 font-medium transition-colors ${
                ['camera', 'video-rec'].includes(currentRoute)
                  ? 'text-cyan-400 bg-cyan-950/50'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>Recognize</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {activeDropdown === 'recognize' && (
              <div className="absolute top-full mt-1 w-48 rounded-lg bg-[#111827] border border-gray-700 shadow-2xl py-1 z-50">
                <button
                  type="button"
                  onClick={() => handleNav('camera')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200 flex items-center gap-2"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Live Camera ISL</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('video-rec')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200 flex items-center gap-2"
                >
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Uploaded Sign Video</span>
                </button>
              </div>
            )}
          </div>

          {/* Learn Link */}
          <button
            type="button"
            onClick={() => handleNav('vocabulary')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              currentRoute === 'vocabulary'
                ? 'text-cyan-400 bg-cyan-950/50'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
          >
            Vocabulary Centre
          </button>

          {/* History & Saved */}
          <button
            type="button"
            onClick={() => handleNav('history')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              currentRoute === 'history'
                ? 'text-cyan-400 bg-cyan-950/50'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
          >
            History
          </button>

          {/* Admin Dropdown */}
          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('admin')}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1 font-medium transition-colors ${
                  currentRoute.startsWith('admin')
                    ? 'text-cyan-400 bg-cyan-950/50'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Admin</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {activeDropdown === 'admin' && (
                <div className="absolute top-full mt-1 w-52 rounded-lg bg-[#111827] border border-gray-700 shadow-2xl py-1 z-50">
                  <button
                    type="button"
                    onClick={() => handleNav('admin')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200"
                  >
                    Admin Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('admin-vocabulary')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200"
                  >
                    Vocabulary Review
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('admin-datasets')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200"
                  >
                    Dataset Import Centre
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('admin-audit')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200"
                  >
                    System Health & Audit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Accessibility Settings */}
          <button
            type="button"
            onClick={() => handleNav('accessibility')}
            title="Accessibility Settings"
            className={`p-1.5 rounded-md font-medium transition-colors ${
              currentRoute === 'accessibility'
                ? 'text-cyan-400 bg-cyan-950/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </nav>

        {/* Right Section: A11y Toggles, API Status, Auth */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Reduced Motion Toggle */}
          <button
            type="button"
            onClick={() => setReducedMotion(!reducedMotion)}
            title={reducedMotion ? 'Reduced Motion: ON' : 'Reduced Motion: OFF'}
            className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
              reducedMotion
                ? 'bg-cyan-950 border-cyan-800 text-cyan-400'
                : 'bg-[#1f2937] border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
          </button>

          {/* Quick High Contrast Toggle */}
          <button
            type="button"
            onClick={() => setHighContrast(!highContrast)}
            title={highContrast ? 'High Contrast: ON' : 'High Contrast: OFF'}
            className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
              highContrast
                ? 'bg-cyan-950 border-cyan-800 text-cyan-400'
                : 'bg-[#1f2937] border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* API Status Pill */}
          <div
            aria-label="API Status"
            className="hidden sm:flex items-center space-x-2 text-[11px] bg-[#1f2937] px-2.5 py-1 rounded-md border border-gray-700 font-mono"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                healthStatus === 'connected'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : healthStatus === 'loading'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-400'
              }`}
            />
            <span className="text-gray-300">
              {healthStatus === 'connected'
                ? `API Online${healthVersion ? ` (${healthVersion})` : ''}`
                : healthStatus === 'loading'
                ? 'Checking...'
                : 'Offline'}
            </span>
          </div>

          {/* User Profile / Auth Button */}
          {currentUser ? (
            <div className="flex items-center space-x-2 bg-[#1f2937] px-2.5 py-1 rounded-md border border-gray-700 text-xs">
              <button
                type="button"
                onClick={() => handleNav('dashboard')}
                className="flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold text-white truncate max-w-[100px]">
                  {currentUser.full_name}
                </span>
                {currentUser.is_verified && (
                  <span title="Email Verified">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="text-gray-400 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-600 text-gray-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="xl:hidden p-1.5 rounded-md bg-[#1f2937] border border-gray-700 text-gray-300 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile / Tablet Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-800 mt-3 pt-3 flex flex-col gap-2 pb-3 animate-in fade-in duration-150 text-xs">
          {/* Primary Action Buttons in Mobile Drawer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-gray-800">
            <button
              type="button"
              onClick={() => handleNav('workspace')}
              className="w-full py-2 px-3 rounded-lg bg-cyan-500 text-gray-950 font-bold flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Start Translating</span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('camera')}
              className="w-full py-2 px-3 rounded-lg bg-[#1f2937] border border-gray-700 text-gray-200 font-semibold flex items-center justify-center gap-2"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Camera</span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('video-to-isl')}
              className="w-full py-2 px-3 rounded-lg bg-[#1f2937] border border-gray-700 text-gray-200 font-semibold flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Video</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-1 py-1">
            <button
              type="button"
              onClick={() => handleNav('landing')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Landing Overview
            </button>
            <button
              type="button"
              onClick={() => handleNav('workspace')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Two-Way Workspace
            </button>
            <button
              type="button"
              onClick={() => handleNav('text-to-isl')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Text to ISL
            </button>
            <button
              type="button"
              onClick={() => handleNav('image-to-isl')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Image OCR to ISL
            </button>
            <button
              type="button"
              onClick={() => handleNav('video-to-isl')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Video Speech to ISL
            </button>
            <button
              type="button"
              onClick={() => handleNav('camera')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Live Camera ISL
            </button>
            <button
              type="button"
              onClick={() => handleNav('video-rec')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Sign Video Recognition
            </button>
            <button
              type="button"
              onClick={() => handleNav('vocabulary')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Vocabulary Centre
            </button>
            <button
              type="button"
              onClick={() => handleNav('history')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Translation History
            </button>
            <button
              type="button"
              onClick={() => handleNav('saved')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Saved Signs
            </button>
            <button
              type="button"
              onClick={() => handleNav('accessibility')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Accessibility Settings
            </button>
            <button
              type="button"
              onClick={() => handleNav('help')}
              className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300"
            >
              Help & Privacy
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleNav('admin')}
                  className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-cyan-400 font-semibold"
                >
                  Admin Overview
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('admin-vocabulary')}
                  className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-cyan-400 font-semibold"
                >
                  Admin Vocabulary Review
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('admin-datasets')}
                  className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-cyan-400 font-semibold"
                >
                  Admin Dataset Centre
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('admin-audit')}
                  className="text-left px-3 py-2 rounded-md hover:bg-gray-800 text-cyan-400 font-semibold"
                >
                  System Health & Audit
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
