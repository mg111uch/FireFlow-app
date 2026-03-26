'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

import { Post } from '../../lib/types';
import PostCard from '../../components/PostCard';
import { API_URL } from '@/lib/config';

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setSearched(true);
        const token = localStorage.getItem('token');

        try {
            const res = await axios.get(`${API_URL}/api/search?q=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResults(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to perform search.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-2">
            <form onSubmit={handleSearch} className="space-y-2 space-x-2 mb-6 flex justify-center">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for titles or content..."
                    className="border p-2 w-full rounded-l-md"
                />
                <button type="submit" 
                    className="bg-blue-500 text-white px-4 rounded-md" 
                    disabled={loading}>
                    {loading ? '...' : 'Search'}
                </button>
            </form>

            {loading && <p className="text-center">Searching...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}

            {!loading && searched && results.length === 0 && (
                <p className="text-center text-gray-400">No posts found for "{query}".</p>
            )}

            {results.length > 0 && (
                <div className="grid grid-cols-1 gap-6">
                    {results.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
}