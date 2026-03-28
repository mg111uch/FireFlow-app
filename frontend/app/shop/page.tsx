'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import Tabs from '@/components/ui/Tabs';
import ProductCard from './ProductCard';
import ShowCart from './ShowCart';
import ShopHeaderCard from './ShopHeaderCard';
import Dashboard from './Dashboard';
import ProductsTab from './ProductsTab';
import OrdersTab from './OrdersTab';
import CreateShopForm from './CreateShopForm';
import { useShop } from './useShop';

export default function ShopPage() {
  const { currentUser } = useAuth();
  const { cartCount } = useCart();
  const router = useRouter();
  const [outerTab, setOuterTab] = useState('all-products');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCart, setShowCart] = useState(false);

  const {
    shop,
    products,
    orders,
    allShops,
    allProducts,
    loading,
    error,
    createShop,
    saveProduct: saveProductFn,
    deleteProduct,
    updateStatus,
    resetStatus,
  } = useShop(currentUser);

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
    }
  }, [currentUser, router]);

  const shopTabs = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: `Products (${products.length})`, value: 'products' },
    { label: `Orders (${orders.length})`, value: 'orders' },
  ];

  const outerTabs = [
    { label: 'All products', value: 'all-products' },
    { label: 'Shops list', value: 'shops-list' },
    { label: 'My shop', value: 'my-shop' },
  ];

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-2">
      <header className="bg-gray-900 p-2 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-start">
          <h2 className="text-xm text-gray-400 flex-1 pr-2">Create and manage your custom store with products.</h2>
          <button onClick={() => setShowCart(true)} className="bg-blue-600 px-3 py-2 rounded text-sm">🛒 Cart ({cartCount})</button>
        </div>
      </header>
      
      <Tabs
        tabs={outerTabs}
        activeTab={outerTab}
        onChange={(value) => setOuterTab(value)}
      />

      {error && <div className="bg-red-500 text-white p-2 rounded mb-3">{error}</div>}

      {outerTab === 'all-products' ? (
        <div className="mt-2">
          {allProducts.length === 0 ? (
            <p className="text-gray-400">No products available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {allProducts.map((p) => (
                <ProductCard key={p.id} product={p} showAddToCart={true} showViewShop={true} />
              ))}
            </div>
          )}
        </div>
      ) : outerTab === 'shops-list' ? (
        <div className="mt-2">
          {allShops.length === 0 ? (
            <p className="text-gray-400">No shops available yet.</p>
          ) : (
            <div className="space-y-3">
              {allShops.map((s) => (
                <ShopHeaderCard key={s.id} shop={s} />
              ))}
            </div>
          )}
        </div>
      ) : (
        !shop ? (
          <CreateShopForm onCreate={createShop} />
        ) : (
          <>
            <Tabs
              tabs={shopTabs}
              activeTab={activeTab}
              onChange={(value) => setActiveTab(value)}
            />

            {activeTab === 'dashboard' && <Dashboard products={products} orders={orders} shop={shop} />}
            {activeTab === 'products' && (
              <ProductsTab 
                products={products} 
                saveProduct={saveProductFn}
                deleteProduct={deleteProduct}
              />
            )}
            {activeTab === 'orders' && <OrdersTab orders={orders} updateStatus={updateStatus} resetStatus={resetStatus} />}
          </>
        )
      )}

      <ShowCart showCart={showCart} setShowCart={setShowCart} />
    </div>
  );
}