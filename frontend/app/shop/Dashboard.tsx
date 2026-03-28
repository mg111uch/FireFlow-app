'use client';

import Link from 'next/link';
import { Shop, Product, Order } from '@/lib/types';

interface DashboardProps {
  products: Product[];
  orders: Order[];
  shop?: Shop | null;
}

export default function Dashboard({ products, orders, shop }: DashboardProps) {
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  
  return (
    <div>
      {shop && (
        <div className="bg-gray-900 p-2 rounded-lg mb-2 mt-2 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{shop.name}</h2>
            <p className="text-gray-400">{shop.description}</p>
          </div>
          <Link href={`/shop/${shop.owner_id}`} className="bg-blue-600 px-4 py-2 rounded text-white">
            View Shop
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-gray-400">Total Products</h3>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-gray-400">Total Orders</h3>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-gray-400">Total Revenue</h3>
          <p className="text-2xl font-bold">₹{totalRevenue}</p>
        </div>
      </div>
    </div>
  );
}