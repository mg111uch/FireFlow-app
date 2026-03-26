'use client';

import { Product } from '@/lib/types';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
  showViewShop?: boolean;
}

export default function ProductCard({ product, showAddToCart = false, showViewShop = false }: ProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    alert(`${product.name} added to cart!`);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg hover:shadow-lg transition">
      {product.image_url && (
        <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded mb-3" />
      )}
      <h4 className="font-semibold text-lg">{product.name}</h4>
      {product.category && (
        <span className="text-xs bg-gray-700 px-2 py-1 rounded inline-block mt-1">{product.category}</span>
      )}
      <p className="text-gray-400 text-sm mt-2">{product.description}</p>
      <div className="flex justify-between items-center mt-3">
        <span className="text-green-400 font-bold text-xl">₹{product.price}</span>
        <span className="text-gray-500 text-sm">Stock: {product.stock}</span>
      </div>
      <div className="flex gap-2 mt-3">
        {showAddToCart && (
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="flex-1 bg-blue-600 py-2 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        )}
        {showViewShop && (
          <Link href={`/shop/${Number(product.shop_id)}`} className="flex-1 bg-gray-700 py-2 rounded text-center hover:bg-gray-600">
            View Shop →
          </Link>
        )}
      </div>
    </div>
  );
}