// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6">
      <div className="text-9xl mb-4">🌀</div>
      <h1 className="text-4xl font-bold text-gray-800 mb-2">VHub | 404</h1>
      <p className="text-gray-600 mb-8">Ôi không! Phòng này hoặc đường dẫn này không tồn tại.</p>
      <Link href="/" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
        Về trang chủ
      </Link>
    </div>
  );
}