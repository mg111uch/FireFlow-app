'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Product } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { shopsApi, productsApi } from '@/lib/api';
import ProductCard from '../ProductCard';
import ShowCart from '../ShowCart';

export default function PublicShopPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { cartCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [shopName, setShopName] = useState('Shop');
  const [shopId, setShopId] = useState<number | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShopData();
  }, [userId]);

  const loadShopData = async () => {
    try {
      setLoading(true);
      const shop = await shopsApi.getByOwner(Number(userId));
      setShopName(shop.name || 'Shop');
      setShopId(shop.id);
      
      const shopProducts = await productsApi.getByShop(shop.id);
      setProducts(shopProducts);
      
      const catsArray = shopProducts.map((p: Product) => p.category).filter((c: string) => c);
      setCategories(Array.from(new Set(catsArray)));
    } catch (err) {
      console.error('Error loading shop:', err);
      setShopName('Shop Not Found');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || p.category === category;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="min-h-screen bg-gray-950 p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 overflow-x-hidden">
      <header className="bg-gray-900 p-2 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold truncate">{shopName}</h1>
          <button onClick={() => setShowCart(true)} className="relative bg-blue-600 px-3 py-2 rounded text-sm">
            🛒 Cart ({cartCount})
          </button>
        </div>
      </header>

      <div className="container mx-auto p-2">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 w-full sm:w-auto" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="p-3 rounded bg-gray-800 border border-gray-700 w-full sm:w-auto min-w-[140px]">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} showAddToCart={true} showViewShop={false} />
          ))}
        </div>

        {filteredProducts.length === 0 && <p className="text-center text-gray-400 mt-10">No products found</p>}
      </div>

      <ShowCart showCart={showCart} setShowCart={setShowCart} shopId={shopId} />
    </div>
  );
}