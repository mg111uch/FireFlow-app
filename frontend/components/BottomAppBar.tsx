'use client'; 

import Link from 'next/link';
import { usePathname } from 'next/navigation'; 
import { HomeIcon, ChatsIcon, SearchIcon, ServicesIcon, ProfileIcon } from '../lib/icons';

// Define main tab routes
const MAIN_TABS = ['/', '/chats', '/search', '/services', '/profile'];

export default function BottomAppBar() {
  const pathname = usePathname(); // Get the current path
  
  // Check if current route is a main tab
  const isMainTab = MAIN_TABS.includes(pathname);

  // Don't render bottom bar when in sub-page
  if (!isMainTab) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Home', icon: <HomeIcon className="size-6" />},
    { href: '/chats', label: 'Chats', icon: (
      <>
        <ChatsIcon className="size-6" />
        {/* You can add a badge here for unread messages */}
        <span className="absolute top-2 left-25 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      </>
    )},    
    { href: '/search', label: 'Showcase', icon: <SearchIcon className="size-6" />},
    { href: '/services', label: 'Services', icon: <ServicesIcon className="size-6" />},
    { href: '/profile', label: 'Profile', icon: <ProfileIcon className="size-6" />},
  ];

  return (
    <nav className="fixed flex justify-around items-center bottom-0 left-0 w-full bg-gray-900 border-t border-gray-700">
      {navItems.map((item) => {
        // For root path, exact match, otherwise check if path starts with href
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <div key={item.href} >
            <Link href={item.href}
              // Conditionally apply classes for highlighting
              className={`flex flex-col items-center text-center p-2 rounded-md transition-colors duration-200
                ${isActive ? 'text-gray-200 font-semibold bg-gray-600' : 'text-gray-400'}
              `}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
            
          </div>
        );
      })}
    </nav>
  );
}