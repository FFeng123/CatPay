'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

interface OrderData {
  orderNo: string;
  expectedAmount: number;
  actualAmount: number;
  serviceFee: number;
  type: 'wechat' | 'alipay';
  status: 'pending' | 'success' | 'expired' | 'cancelled';
  expiredAt: string;
  paymentLink: string;
}

export default function PayPage() {
  const params = useParams();
  const orderNo = params.orderNo as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartedRef = useRef(false);

  // Fetch order data
  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderNo}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '获取订单失败');
        setLoading(false);
        return;
      }

      setOrder(data as OrderData);

      // Calculate time left
      const expiredAt = new Date(data.expiredAt).getTime();
      const now = Date.now();
      const left = Math.max(0, Math.floor((expiredAt - now) / 1000));
      setTimeLeft(left);

      setLoading(false);
    } catch (err) {
      setError('网络错误');
      setLoading(false);
    }
  }, [orderNo]);

  // Initial fetch
  useEffect(() => {
    if (orderNo) {
      fetchOrder();
    }
  }, [orderNo, fetchOrder]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || order?.status !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, order?.status]);

  // Long polling for payment status (10s timeout)
  const startPolling = useCallback(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderNo}/status`);
        const data = await res.json();

        if (data.error) {
          pollingRef.current = setTimeout(poll, 1000);
          return;
        }

        setOrder((prev) => (prev ? { ...prev, status: data.status } : null));

        if (data.changed && data.status !== 'pending') {
          setPolling(false);
          return;
        }

        if (data.changed === false) {
          poll();
        } else {
          poll();
        }
      } catch (err) {
        pollingRef.current = setTimeout(poll, 1000);
      }
    };

    setPolling(true);
    poll();
  }, [orderNo]);

  // Start polling when order is loaded and pending
  useEffect(() => {
    if (order && order.status === 'pending' && !pollingStartedRef.current) {
      pollingStartedRef.current = true;
      startPolling();
    }

    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, [order, startPolling]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate QR code URL
  const getQRCodeUrl = (link: string): string => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(link)}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <p className="text-gray-800 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  // Order expired
  if (order?.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">订单已过期</h1>
          <p className="text-gray-500">该订单已超过支付时限，请重新发起支付</p>
        </div>
      </div>
    );
  }

  // Order cancelled
  if (order?.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">订单已取消</h1>
          <p className="text-gray-500">该订单已被取消，请重新发起支付</p>
        </div>
      </div>
    );
  }

  // Payment success
  if (order?.status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">支付成功</h1>
          <p className="text-gray-500">订单号: {order.orderNo}</p>
          <p className="text-gray-500 mt-2">支付金额: ¥{order.actualAmount.toFixed(2)}</p>
        </div>
      </div>
    );
  }

  // Payment pending - show QR code
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {order?.type === 'wechat' ? '微信支付' : '支付宝支付'}
          </h1>
          <p className="text-gray-500 mt-1">请使用{order?.type === 'wechat' ? '微信' : '支付宝'}扫码完成支付</p>
        </div>

        {/* QR Code Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {/* Countdown Timer */}
          <div className="flex items-center justify-center mb-4">
            <div className={`text-3xl font-mono font-bold ${timeLeft <= 60 ? 'text-red-500' : 'text-gray-800'}`}>
              {formatTime(timeLeft)}
            </div>
            {timeLeft <= 60 && (
              <span className="ml-2 text-red-500 text-sm">后过期</span>
            )}
          </div>

          {/* Warning for exact amount */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-amber-700 text-center text-sm font-medium">
              请支付下方指定金额，一分钱也不能多，一分钱也不能少
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <div className="bg-white p-2 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getQRCodeUrl(order?.paymentLink || '')}
                alt="支付二维码"
                className="w-56 h-56"
              />
            </div>
          </div>

          <p className="text-center text-gray-400 text-sm">
            二维码有效期{formatTime(timeLeft)}
          </p>
        </div>

        {/* Amount Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">支付金额</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">应付金额</span>
              <span className="text-gray-800">¥{order?.expectedAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">服务费</span>
              <span className="text-gray-800">¥{order?.serviceFee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-gray-800 font-semibold">合计</span>
              <span className="text-2xl font-bold text-blue-600">¥{order?.actualAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-red-700 font-medium text-sm">重要提示</p>
              <p className="text-red-600 text-sm mt-1">
                必须支付 <span className="font-bold">¥{order?.actualAmount.toFixed(2)}</span>，
                多付或少付都将导致支付失败
              </p>
            </div>
          </div>
        </div>

        {/* Polling indicator */}
        {polling && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center text-gray-500 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              正在等待支付...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
