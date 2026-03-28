'use client';

import Link from 'next/link';
import { Shop } from '@/lib/types';

interface ShopHeaderCardProps {
  shop: Shop;
}

export default function ShopHeaderCard({ shop }: ShopHeaderCardProps) {
  return (
    <div className="bg-gray-900 p-2 rounded-lg mb-1 flex justify-between items-center">
      <div>
        <h2 className="text-xl font-semibold">{shop.name}</h2>
        <p className="text-gray-400">{shop.description}</p>
      </div>
      <Link href={`/shop/${shop.owner_id}`} className="bg-blue-600 px-4 py-2 rounded text-white">
        View Shop
      </Link>
    </div>
  );
}