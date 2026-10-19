import React from 'react';
import { MessageSquare, Compass, User, Sparkles } from 'lucide-react';

export type NavTab = 'home' | 'discover' | 'profile';

interface BottomNavProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  unreadCount = 0,
}) => {
  const tabs = [
    {
      id: 'home' as NavTab,
      label: 'Home',
      icon: MessageSquare,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null,
    },
    {
      id: 'discover' as NavTab,
      label: 'Discover',
      icon: Compass,
      badge: null,
    },
    {
      id: 'profile' as NavTab,
      label: 'Profile',
      icon: User,
      badge: null,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:pb-4 pointer-events-none flex justify-center">
      <div className="pointer-events-auto liquid-glass rounded-full px-3 py-2 shadow-xl border border-white/80 flex items-center gap-1 sm:gap-4 max-w-md w-full justify-around backdrop-blur-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 scale-[1.03]'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white ring-2 ring-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
