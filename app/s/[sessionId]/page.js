// src/app/s/[sessionId]/page.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';

export default function SessionPage() {
  // Lấy URL từ Vercel, nếu chạy ở máy tính thì dùng mặc định IP LAN
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.0.102:3000';
  const params = useParams();
  const sessionId = params.sessionId;
  
  const [code, setCode] = useState('');
  const [deviceName, setDeviceName] = useState(''); // MỚI: Quản lý tên thiết bị
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  const [chatData, setChatData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { if (chatData) scrollToBottom(); }, [chatData]);

  // Load tên thiết bị đã lưu từ lần trước
  useEffect(() => {
    const savedName = localStorage.getItem('vhub_device_name');
    if (savedName) setDeviceName(savedName);
  }, []);

  // Socket khởi tạo mang theo Device Name
  useEffect(() => {
    if (!isVerified) return;

    const newSocket = io(API_URL);
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      // Gửi object chứa cả Session ID và Tên Thiết Bị
      const finalName = deviceName.trim() || 'Khách Web';
      newSocket.emit('join-session', { sessionId, deviceName: finalName });
    });

    newSocket.on('incoming-file', (data) => {
      setChatData(prev => {
        const isExist = prev.webFiles.some(f => f.filename === data.filename);
        if (isExist) return prev;
        return {
          ...prev,
          webFiles: [...prev.webFiles, {
            originalName: data.filename,
            size: data.size,
            sender: data.sender
          }]
        };
      });
    });

    return () => newSocket.disconnect();
  }, [isVerified, sessionId, deviceName]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Vui lòng nhập đủ 6 số!');
      return;
    }
    
    const finalName = deviceName.trim() || 'Khách';
    localStorage.setItem('vhub_device_name', finalName); // Lưu tên lại cho lần sau
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('${API_URL}/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, code })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra!');
      } else {
        setChatData(data.chatRoom);
        setIsVerified(true); 
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadBack = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    const finalName = deviceName.trim() || 'Khách';

    try {
      const res = await fetch(`${API_URL}/upload-back/${sessionId}`, {
        method: 'POST',
        headers: {
          // Bắn tên thiết bị qua Header để Backend đọc cho lẹ
          'x-device-name': encodeURIComponent(finalName)
        },
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setChatData(prev => ({ ...prev, webFiles: [...prev.webFiles, data.fileInfo] }));
        if (socket) {
          socket.emit('file-uploaded-back', {
            sessionId: sessionId,
            fileInfo: data.fileInfo,
            downloadUrl: data.downloadUrl
          });
        }
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi gửi file!');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // GIAO DIỆN NHẬP MÃ BỔ SUNG Ô TÊN
  if (!isVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">VHub</h1>
          <p className="text-gray-500 mb-8 text-sm">Điền thông tin để vào phòng tải file</p>
          
          <div className="mb-4 text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Tên hiển thị của bạn</label>
            <input 
              type="text" 
              maxLength="30"
              className="w-full text-lg border-2 border-gray-300 rounded-xl p-3 focus:border-blue-500 focus:outline-none"
              placeholder="VD: iPhone của Vinh"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="mb-4 text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Mã PIN (6 số)</label>
            <input 
              type="number" 
              maxLength="6"
              className="w-full text-center text-4xl tracking-[0.3em] font-bold border-2 border-gray-300 rounded-xl p-4 focus:border-blue-500 focus:outline-none"
              placeholder="------"
              value={code}
              onChange={(e) => { setCode(e.target.value.slice(0, 6)); setError(''); }}
              disabled={loading}
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium mb-4">{error}</p>}
          
          <button 
            onClick={handleVerify}
            disabled={loading || code.length < 6}
            className={`w-full mt-2 text-white font-bold py-4 px-4 rounded-xl transition-all text-lg shadow-md 
              ${loading || code.length < 6 ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
          >
            {loading ? 'Đang kết nối...' : 'Vào Phòng'}
          </button>
        </div>
      </div>
    );
  }

  // Giao diện phòng Chat giữ nguyên như bản trước
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 max-w-2xl mx-auto border-x border-gray-200 shadow-xl">
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Phòng {sessionId}</h1>
          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Đã kết nối an toàn
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Hủy phòng lúc</p>
          <p className="text-sm font-semibold text-gray-700">{formatTime(chatData?.expireAt)}</p>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        <div className="text-center my-4">
          <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
            Phiên chia sẻ bắt đầu lúc {formatTime(chatData?.createdAt)}
          </span>
        </div>

        {chatData?.androidFiles?.map((file, index) => (
          <div key={`android-${index}`} className="flex flex-col items-start">
            <p className="text-xs text-gray-500 ml-2 mb-1">Máy Host (Android)</p>
            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-xl">📄</div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-gray-800 truncate">{file.filename}</p>
                  <p className="text-xs text-gray-500">{file.size}</p>
                </div>
              </div>
              <a href={`${API_URL}/download/${sessionId}/${encodeURIComponent(file.filename)}`} className="w-full mt-2 bg-blue-50 text-blue-600 text-center py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors" download>Tải xuống</a>
            </div>
          </div>
        ))}

        {chatData?.webFiles?.map((file, index) => (
          <div key={`web-${index}`} className="flex flex-col items-end">
            <p className="text-xs text-gray-500 mr-2 mb-1">{file.sender === (deviceName || 'Khách') ? 'Bạn' : file.sender}</p>
            <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-xl">⬆️</div>
              <div className="overflow-hidden text-left">
                <p className="text-sm font-semibold truncate">{file.originalName}</p>
                <p className="text-xs text-blue-200">{file.size} • Đã gửi</p>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-4 border-t border-gray-200 sticky bottom-0">
        <input type="file" ref={fileInputRef} onChange={handleUploadBack} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
          {uploading ? <span className="animate-pulse">⏳ Đang đẩy file lên...</span> : <><span>📎</span> Chọn File Gửi Trả</>}
        </button>
      </div>
    </div>
  );
}