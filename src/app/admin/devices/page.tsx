"use client";

import { useState, useEffect, useRef } from "react";
import { Modal, ConfirmModal, AlertModal } from "@/components/Modal";
import { useToast } from "@/components/ToastContext";

interface Device {
  id: string;
  name: string;
  deviceKey: string;
  wechatPaymentLink: string | null;
  alipayPaymentLink: string | null;
  enabled: boolean;
  createdAt: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    deviceKey: "",
    wechatPaymentLink: "",
    alipayPaymentLink: "",
    enabled: true,
  });
  const [qrCodeTarget, setQrCodeTarget] = useState<"wechat" | "alipay">("wechat");
  const [alert, setAlert] = useState<{ title: string; message: string; type: "info" | "success" | "error" | "warning" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/devices");
      const data = await res.json();
      setDevices(data);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      showToast("加载设备失败", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.wechatPaymentLink && !formData.alipayPaymentLink) {
      setAlert({ title: "提示", message: "至少需要填写微信或支付宝支付链接之一", type: "warning" });
      return;
    }

    try {
      const payload = {
        name: formData.name,
        wechatPaymentLink: formData.wechatPaymentLink || null,
        alipayPaymentLink: formData.alipayPaymentLink || null,
        enabled: formData.enabled,
      };

      const res = await fetch("/api/admin/devices", {
        method: editingDevice ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDevice ? { id: editingDevice.id, ...payload } : payload),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "保存失败", "error");
        return;
      }

      showToast(editingDevice ? "设备更新成功" : "设备创建成功", "success");
      setShowModal(false);
      setEditingDevice(null);
      setFormData({
        name: "",
        deviceKey: "",
        wechatPaymentLink: "",
        alipayPaymentLink: "",
        enabled: true,
      });
      fetchDevices();
    } catch (error) {
      console.error("Failed to save device:", error);
      showToast("保存失败", "error");
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      deviceKey: device.deviceKey,
      wechatPaymentLink: device.wechatPaymentLink || "",
      alipayPaymentLink: device.alipayPaymentLink || "",
      enabled: device.enabled,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteDevice) return;
    try {
      await fetch(`/api/admin/devices?id=${deleteDevice.id}`, { method: "DELETE" });
      showToast("设备删除成功", "success");
      fetchDevices();
    } catch (error) {
      console.error("Failed to delete device:", error);
      showToast("删除失败", "error");
    }
    setDeleteDevice(null);
  };

  const toggleEnabled = async (device: Device) => {
    try {
      await fetch("/api/admin/devices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id, enabled: !device.enabled }),
      });
      fetchDevices();
    } catch (error) {
      console.error("Failed to toggle device:", error);
      showToast("操作失败", "error");
    }
  };

  const handleQrImageSelect = (target: "wechat" | "alipay") => {
    setQrCodeTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const formData_ = new FormData();
        formData_.append("file", file);

        const response = await fetch("https://api.qrserver.com/v1/read-qr-code/", {
          method: "POST",
          body: formData_,
        });

        const data = await response.json();
        if (data && data[0] && data[0].symbol && data[0].symbol[0]) {
          const decoded = data[0].symbol[0].data;
          if (qrCodeTarget === "wechat") {
            setFormData({ ...formData, wechatPaymentLink: decoded });
          } else {
            setFormData({ ...formData, alipayPaymentLink: decoded });
          }
        } else {
          setAlert({ title: "提示", message: "无法识别二维码，请重试或手动输入", type: "warning" });
        }
      } catch (error) {
        console.error("QR decode error:", error);
        setAlert({ title: "错误", message: "识别二维码失败，请手动输入", type: "error" });
      }
    };
    reader.readAsDataURL(file);
  };

  const openCreateModal = () => {
    setEditingDevice(null);
    setFormData({
      name: "",
      deviceKey: "",
      wechatPaymentLink: "",
      alipayPaymentLink: "",
      enabled: true,
    });
    setShowModal(true);
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">设备管理</h1>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
        >
          添加设备
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-3 text-gray-500">加载中...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <p className="text-gray-500">暂无设备</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备Key</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">微信</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支付宝</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{device.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{device.deviceKey}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{device.wechatPaymentLink || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{device.alipayPaymentLink || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleEnabled(device)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                          device.enabled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {device.enabled ? "启用" : "禁用"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => handleEdit(device)} className="text-blue-600 hover:text-blue-800 mr-3 font-medium">
                        编辑
                      </button>
                      <button onClick={() => setDeleteDevice(device)} className="text-red-600 hover:text-red-800 font-medium">
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDevice ? "编辑设备" : "添加设备"}
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
              form="device-form"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium transition-all"
            >
              保存
            </button>
          </>
        }
      >
        <form id="device-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设备名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">微信支付链接</label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={formData.wechatPaymentLink}
                onChange={(e) => setFormData({ ...formData, wechatPaymentLink: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="https://qr.weixin.qq.com/xxx"
              />
              <button
                type="button"
                onClick={() => handleQrImageSelect("wechat")}
                className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                title="上传二维码图片"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="hidden">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">支付宝支付链接</label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={formData.alipayPaymentLink}
                onChange={(e) => setFormData({ ...formData, alipayPaymentLink: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="https://qr.alipay.com/xxx"
              />
              <button
                type="button"
                onClick={() => handleQrImageSelect("alipay")}
                className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                title="上传二维码图片"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">启用设备</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteDevice}
        onClose={() => setDeleteDevice(null)}
        onConfirm={handleDelete}
        title="删除设备"
        message={`确定要删除设备 "${deleteDevice?.name}" 吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        danger
      />

      {/* Alert Modal */}
      {alert && (
        <AlertModal
          isOpen={true}
          onClose={() => setAlert(null)}
          title={alert.title}
          message={alert.message}
          type={alert.type}
        />
      )}
    </div>
  );
}
