"use client";

import { useState, useEffect } from "react";
import { Modal, ConfirmModal } from "@/components/Modal";
import { useToast } from "@/components/ToastContext";

interface ApiKey {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  createdAt: string;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<ApiKey | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    enabled: true,
  });
  const { showToast } = useToast();

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/keys");
      const data = await res.json();
      setKeys(data);
    } catch (error) {
      console.error("Failed to fetch keys:", error);
      showToast("加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newKey = await res.json();
        setShowKey(newKey.key);
        setShowModal(false);
        setFormData({ name: "", enabled: true });
        fetchKeys();
        showToast("API Key 创建成功", "success");
      }
    } catch (error) {
      console.error("Failed to create key:", error);
      showToast("创建失败", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteKey) return;
    try {
      await fetch(`/api/admin/keys?id=${deleteKey.id}`, { method: "DELETE" });
      showToast("删除成功", "success");
      fetchKeys();
    } catch (error) {
      console.error("Failed to delete key:", error);
      showToast("删除失败", "error");
    }
    setDeleteKey(null);
  };

  const toggleEnabled = async (key: ApiKey) => {
    try {
      await fetch("/api/admin/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: key.id, enabled: !key.enabled }),
      });
      fetchKeys();
    } catch (error) {
      console.error("Failed to toggle key:", error);
      showToast("操作失败", "error");
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
        >
          创建 API Key
        </button>
      </div>

      {showKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-amber-800">新 API Key 已创建</p>
              <p className="text-sm text-amber-700 mt-1">请复制以下 key，它只会显示一次：</p>
              <code className="block mt-2 p-3 bg-white border border-amber-200 rounded-lg text-sm font-mono break-all">{showKey}</code>
            </div>
            <button onClick={() => setShowKey(null)} className="text-amber-800 hover:text-amber-900 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-3 text-gray-500">加载中...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-gray-500">暂无 API Keys</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{key.key.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleEnabled(key)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                          key.enabled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {key.enabled ? "启用" : "禁用"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(key.createdAt).toLocaleString("zh-CN")}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => setDeleteKey(key)} className="text-red-600 hover:text-red-800 font-medium">
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="创建 API Key"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              form="key-form"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium transition-all"
            >
              创建
            </button>
          </>
        }
      >
        <form id="key-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="用于标识此 Key"
              required
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">启用</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteKey}
        onClose={() => setDeleteKey(null)}
        onConfirm={handleDelete}
        title="删除 API Key"
        message={`确定要删除 API Key "${deleteKey?.name}" 吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        danger
      />
    </div>
  );
}
