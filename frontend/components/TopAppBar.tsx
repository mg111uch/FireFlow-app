'use client'; 

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/config';
import { useNotification } from '@/context/NotificationContext';
import { NotificationIcon, MenuIcon, BackIcon } from '@/lib/icons';

// Define main tab routes
const MAIN_TABS = ['/', '/chats', '/search', '/services', '/profile'];

export default function TopAppBar() {
    const { unreadCount } = useNotification();
    const pathname = usePathname();
    
    // Check if current route is a main tab
    const isMainTab = MAIN_TABS.includes(pathname);
    const isInSubPage = !isMainTab;
  
  const handleBack = () => {
    window.history.back();
  };
  
  return (
    <nav className="fixed w-full bg-gray-900  border-b border-gray-200 text-white px-2 py-3 flex justify-between items-center z-10">
        
        <div className="relative flex items-center">
            {isInSubPage ? (
                <button onClick={handleBack} className="p-1 hover:bg-gray-700 rounded-md">
                    <BackIcon className="size-8" />
                </button>
            ) : (
                <img src="/favicon.ico" alt="Description" className="self-center size-8 rounded-md " />
            )}
            <div className="text-xl font-bold ml-2">{APP_NAME}</div>
        </div>

        <div className="flex items-center space-x-3">
        
            {/* <Link href="/services" 
                className="w-28 text-center text-lg text-white font-bold py-1 rounded-full mb-1 mr-3         
                bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]
                ">
                ₹ Services             
            </Link>   */}

            <Link href="/notifications" className="relative">
                <NotificationIcon className="size-7" />
                {/* <span className="absolute top-0 right-0 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span> */}
                {unreadCount > 0 && (
                <span className="absolute top-1 right-5 sm:right-7 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
                )}
            </Link>

            <Link href="/options" >
                <MenuIcon className="size-8" />
            </Link>

        </div>
    </nav>
  );
}

