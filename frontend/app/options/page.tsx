'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { APP_NAME } from '@/lib/config';

export default function OptionsPage() {
  const router = useRouter();

  const settingsOptions = [
    { id: 'account', name: 'Account Settings', description: 'Manage your profile, email, and password.', href: '/profile' }, // Example linking to existing profile
    // { id: 'notifications', name: 'Notification Preferences', description: 'Control how you receive alerts and updates.', href: '#' }, // Placeholder link
    // { id: 'privacy', name: 'Privacy Settings', description: 'Adjust your privacy controls and data sharing.', href: '#' },
    // { id: 'display', name: 'Display & Accessibility', description: 'Customize the app theme, font size, and accessibility features.', href: '#' },
    // { id: 'security', name: 'Security', description: 'Review security activity and connected devices.', href: '#' },
    // { id: 'help', name: 'Help & Support', description: 'Find answers to common questions or contact support.', href: '#' },
    { id: 'saved', name: 'Saved Posts', description: 'View posts you have bookmarked.', href: '/options/saved-posts' },
    { id: 'generative-ui', name: 'Generative UI', description: 'Create custom UI layouts using AI', href: '/options/generative-ui' },
    { id: 'about', name: 'About App', description: 'Information about the application version and terms of service.', href: '#' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="container mx-auto p-2">

      <h1 className="text-lg font-bold mb-6">Options & Settings</h1>

      <div className="bg-gray-900 rounded-lg shadow-md overflow-hidden">
        <ul>
          {settingsOptions.map((option, index) => (
            <li key={option.id} className={`${index > 0 ? 'border-t border-gray-200' : ''}`}>
              <Link href={option.href} className="block p-4 hover:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-300">{option.name}</h2>
                <p className="text-sm text-gray-400">{option.description}</p>
              </Link>
            </li>
          ))}
          {/* Add a logout option directly here */}
          <li className="border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full text-left p-4 text-lg font-semibold text-red-600 hover:bg-red-50 transition-colors duration-200 focus:outline-none"
            >
              Log Out
            </button>
          </li>
        </ul>
      </div>
      <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        <p className="text-xs mt-1">
          Built with Next.js, Tailwind CSS, and ❤️
        </p>
      </div>
    </div>
  );
}