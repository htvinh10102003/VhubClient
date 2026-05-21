// app/page.tsx
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [sessionId, setSessionId] = useState('');
  const router = useRouter();

  const handleJoin = (e) => {
    e.preventDefault();
    if (sessionId.trim()) {
      router.push(`/s/${sessionId.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center">
        <h1 className="text-4xl font-extrabold text-blue-600 mb-2">VHub</h1>
        <p className="text-gray-500 mb-8">Nhập mã phiên để bắt đầu chia sẻ</p>
        
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="VD: VH-ABC123"
            className="w-full text-center text-lg p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none uppercase"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all"
          >
            Vào phòng
          </button>
        </form>
      </div>
    </div>
  );
}