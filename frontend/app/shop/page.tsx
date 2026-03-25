'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shop, Product, Order } from '@/lib/types';
import Tabs from '@/components/ui/Tabs';

const STORAGE_KEY = 'user_shop';
const PRODUCTS_KEY = 'shop_products';
const ORDERS_KEY = 'shop_orders';

export default function ShopPage() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const shopTabs = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: `Products (${products.length})`, value: 'products' },
    { label: `Orders (${orders.length})`, value: 'orders' },
  ];

  useEffect(() => {
    const savedShop = localStorage.getItem(STORAGE_KEY);
    const savedProducts = localStorage.getItem(PRODUCTS_KEY);
    const savedOrders = localStorage.getItem(ORDERS_KEY);
    
    if (savedShop) setShop(JSON.parse(savedShop));
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
  }, []);

  const createShop = (name: string, description: string) => {
    const newShop: Shop = {
      id: Date.now().toString(),
      name,
      description,
      owner_id: 1,
      created_at: new Date().toISOString()
    };
    setShop(newShop);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newShop));
  };

  const getShopLink = () => {
    if (!shop) return '#';
    return `/shop/${shop.owner_id}`;
  };

  return (
    <div className="container mx-auto p-2">
      
      {!shop ? (
        <CreateShopForm onCreate={createShop} />
      ) : (
        <>
          <div className="bg-gray-900 p-4 rounded-lg mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">{shop.name}</h2>
              <p className="text-gray-400">{shop.description}</p>
            </div>
            <Link href={getShopLink()} className="bg-green-600 px-4 py-2 rounded text-white">
              View Public Shop
            </Link>
          </div>
          
          <Tabs
            tabs={shopTabs}
            activeTab={activeTab}
            onChange={(value) => setActiveTab(value)}
          />

          {activeTab === 'dashboard' && <Dashboard shop={shop} products={products} orders={orders} />}
          {activeTab === 'products' && <ProductsTab products={products} setProducts={setProducts} />}
          {activeTab === 'orders' && <OrdersTab orders={orders} setOrders={setOrders} />}
        </>
      )}
    </div>
  );
}

function CreateShopForm({ onCreate }: { onCreate: (name: string, desc: string) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Create Your Shop</h2>
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Shop Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700" placeholder="My Awesome Store" />
      </div>
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700" rows={3} placeholder="Tell customers about your shop..." />
      </div>
      <button onClick={() => name && onCreate(name, desc)} className="bg-blue-600 px-6 py-2 rounded text-white">Create Shop</button>
    </div>
  );
}

function Dashboard({ shop, products, orders }: { shop: Shop; products: Product[]; orders: Order[] }) {
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
  );
}

function ProductsTab({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: 0, stock: 10, category: '', image_url: '' });

  const saveProduct = () => {
    if (!form.name) return;
    if (editingId) {
      setProducts(products.map(p => p.id === editingId ? { ...p, ...form } : p));
      setEditingId(null);
    } else {
      const newProduct: Product = { id: Date.now().toString(), shop_id: '', ...form, created_at: new Date().toISOString() };
      setProducts([...products, newProduct]);
    }
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(editingId ? products.map(p => p.id === editingId ? { ...p, ...form } : p) : [...products, { id: Date.now().toString(), shop_id: '', ...form, created_at: new Date().toISOString() }]));
    setForm({ name: '', description: '', price: 0, stock: 10, category: '', image_url: '' });
    setShowForm(false);
  };

  const deleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
  };

  const editProduct = (p: Product) => {
    setForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock, category: p.category || '', image_url: p.image_url || '' });
    setEditingId(p.id);
    setShowForm(true);
  };

  return (
    <div>
      <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', description: '', price: 0, stock: 10, category: '', image_url: '' }); }} className="bg-blue-600 px-4 py-2 rounded text-white mb-4">
        {showForm ? 'Cancel' : '+ Add Product'}
      </button>
      
      {showForm && (
        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-3">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Product Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="number" placeholder="Stock" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input placeholder="Category" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="p-2 rounded bg-gray-700 border border-gray-600" />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2 rounded bg-gray-700 border border-gray-600 mt-3" rows={2} />
          <button onClick={saveProduct} className="bg-green-600 px-4 py-2 rounded text-white mt-3">{editingId ? 'Update' : 'Save'}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-gray-800 p-4 rounded-lg flex justify-between">
            <div>
              <h4 className="font-semibold">{p.name}</h4>
              <p className="text-gray-400 text-sm">{p.description}</p>
              <p className="text-green-400 font-bold">₹{p.price}</p>
              <p className="text-gray-500 text-sm">Stock: {p.stock}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => editProduct(p)} className="text-blue-400 text-sm">Edit</button>
              <button onClick={() => deleteProduct(p.id)} className="text-red-400 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab({ orders, setOrders }: { orders: Order[]; setOrders: (o: Order[]) => void }) {
  const updateStatus = (id: string, status: Order['status']) => {
    const updated = orders.map(o => o.id === id ? { ...o, status } : o);
    setOrders(updated);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  };

  return (
    <div className="space-y-3">
      {orders.length === 0 ? <p className="text-gray-400">No orders yet</p> : orders.map(o => (
        <div key={o.id} className="bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Order #{o.id.slice(-6)}</span>
            <span className={`px-2 py-1 rounded text-sm ${o.status === 'pending' ? 'bg-yellow-600' : o.status === 'processing' ? 'bg-blue-600' : o.status === 'shipped' ? 'bg-purple-600' : 'bg-green-600'}`}>{o.status}</span>
          </div>
          <p className="text-gray-400 text-sm">Customer: {o.customer_username || 'User ' + o.customer_id}</p>
          <p className="text-gray-400 text-sm">Items: {o.items.length} | Total: ₹{o.total}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => updateStatus(o.id, 'processing')} className="text-blue-400 text-sm">Mark Processing</button>
            <button onClick={() => updateStatus(o.id, 'shipped')} className="text-purple-400 text-sm">Mark Shipped</button>
            <button onClick={() => updateStatus(o.id, 'delivered')} className="text-green-400 text-sm">Mark Delivered</button>
          </div>
        </div>
      ))}
    </div>
  );
}
