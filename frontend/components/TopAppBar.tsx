// y
'use client'; 

import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import { useNotification } from '@/context/NotificationContext';

export default function TopAppBar() {
    const { unreadCount } = useNotification();
  return (
    <nav className="fixed w-full bg-gray-800  border-b border-gray-200 text-white px-2 py-3 flex justify-between items-center z-10">
        
        <div className="relative flex items-center">
            <img src="/favicon.ico" alt="Description" className="self-center size-8 rounded-md " />
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                className="size-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </Link>

        </div>
    </nav>
  );
}

