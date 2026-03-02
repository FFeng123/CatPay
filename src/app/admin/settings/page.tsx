"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Modal, AlertModal } from "@/components/Modal";
import { useToast } from "@/components/ToastContext";

interface Settings {
  maxOrdersPerUser: number;
  orderExpireMinutes: number;
  penaltyServiceFee: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    maxOrdersPerUser: 3,
    orderExpireMinutes: 15,
    penaltyServiceFee: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      for (const [key, value] of Object.entries(settings)) {
        await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: String(value) }),
        });
      }

      showToast("设置已保存", "success");
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("新密码与确认密码不一致");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("密码长度至少6位");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "修改失败");
      } else {
        setPasswordSuccess(true);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          signOut({ callbackUrl: "/login" });
        }, 2000);
      }
    } catch {
      setPasswordError("修改失败，请重试");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="p-8 text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">系统设置</h1>

      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-sm rounded-xl p-6 space-y-6 mb-6 border border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">订单设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">每个用户最大开启订单数</label>
                <input
                  type="number"
                  value={settings.maxOrdersPerUser}
                  onChange={(e) => setSettings({ ...settings, maxOrdersPerUser: parseInt(e.target.value) })}
                  className="w-full border rounded-md px-3 py-2"
                  min="1"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">用户同时进行中的订单数量上限</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">订单过期时间 (分钟)</label>
                <input
                  type="number"
                  value={settings.orderExpireMinutes}
                  onChange={(e) => setSettings({ ...settings, orderExpireMinutes: parseInt(e.target.value) })}
                  className="w-full border rounded-md px-3 py-2"
                  min="1"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">订单未支付时的有效期</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">服务费设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">惩罚服务费 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.penaltyServiceFee}
                  onChange={(e) => setSettings({ ...settings, penaltyServiceFee: parseFloat(e.target.value) })}
                  className="w-full border rounded-md px-3 py-2"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">用户有进行中订单时的初始服务费（用于解决金额冲突）</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
              {saving ? "保存中..." : "保存设置"}
            </button>
          </div>
        </div>
      </form>

      {/* Password Change Section */}
      <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-medium mb-4">修改密码</h3>

        {passwordSuccess && (
          <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-md">密码修改成功，即将跳转到登录页...</div>
        )}

        {passwordError && <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">{passwordError}</div>}

        <form onSubmit={handlePasswordChange}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">当前密码</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={changingPassword}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {changingPassword ? "修改中..." : "修改密码"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
