import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  BookOpen, 
  Settings,
  Building2,
  Moon,
  Sun,
  Pin,
  PinOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import LanguageToggle from './LanguageToggle';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  // Load pinned state from localStorage
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved ? JSON.parse(saved) : false;
  });

  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered;

  // Save pinned state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(isPinned));
  }, [isPinned]);

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutGrid },
    { name: t('nav.mapBuilder'), href: '/map-builder', icon: Building2 },
    { name: t('nav.reservations'), href: '/reservations', icon: BookOpen },
  ];

  const isActive = (path: string) => location.pathname === path;

  const togglePin = () => {
    setIsPinned(!isPinned);
  };

  // Get page title based on current route
  const getPageTitle = () => {
    if (location.pathname === '/dashboard') {
      return t('nav.dashboard');
    } else if (location.pathname === '/reservations') {
      return t('nav.reservations');
    } else if (location.pathname === '/map-builder') {
      return t('nav.mapBuilder');
    }
    return t('nav.dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-primary-600" />
                <h1 className="ml-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Space Reserved
                </h1>
              </div>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {getPageTitle()}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              <button 
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 transition-colors"
                title={`Switch to ${theme === 'light' ? t('theme.dark') : t('theme.light')} mode`}
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav
          className={`bg-white dark:bg-gray-800 shadow-sm min-h-screen border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out relative ${
            isExpanded ? 'w-64' : 'w-16'
          }`}
          onMouseEnter={() => !isPinned && setIsHovered(true)}
          onMouseLeave={() => !isPinned && setIsHovered(false)}
        >
          {/* Pin/Unpin button */}
          <button
            onClick={togglePin}
            className={`absolute top-2 right-2 p-1.5 rounded-md transition-colors z-10 ${
              isPinned
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={isPinned ? t('nav.unpinSidebar') : t('nav.pinSidebar')}
          >
            {isPinned ? (
              <Pin className="h-4 w-4" />
            ) : (
              <PinOff className="h-4 w-4" />
            )}
          </button>

          <div className="p-4 pt-10">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                        isActive(item.href)
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                      title={!isExpanded ? item.name : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span
                        className={`ml-3 transition-opacity duration-200 ${
                          isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                        }`}
                      >
                        {item.name}
                      </span>
                      {!isExpanded && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;