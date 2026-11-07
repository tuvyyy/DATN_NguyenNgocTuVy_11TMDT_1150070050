import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import {
  BadgeCheck,
  Camera,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";

const AUTH_API_BASES = ["https://localhost:7007", "http://localhost:5006"];
const AUTH_API_BASE_KEY = "tiuv_auth_api_base";

const TEXT = {
  brand: "TIUV CLINIC",
  title: "T\u00e0i kho\u1ea3n c\u00e1 nh\u00e2n",
  subtitle:
    "C\u1eadp nh\u1eadt th\u00f4ng tin h\u1ed3 s\u01a1 c\u1ee7a b\u1ea1n. D\u1eef li\u1ec7u s\u1ebd \u0111\u01b0\u1ee3c d\u00f9ng xuy\u00ean su\u1ed1t trong to\u00e0n b\u1ed9 h\u1ec7 th\u1ed1ng.",
  profileCardTitle: "H\u1ed3 s\u01a1 hi\u1ec7n t\u1ea1i",
  contactTitle: "Th\u00f4ng tin li\u00ean h\u1ec7",
  roleTitle: "Vai tr\u00f2",
  editTitle: "Ch\u1ec9nh s\u1eeda th\u00f4ng tin",
  editSubtitle:
    "B\u1ea1n c\u00f3 th\u1ec3 \u0111\u1ed5i h\u1ecd t\u00ean, t\u00ean t\u00e0i kho\u1ea3n, email v\u00e0 s\u1ed1 \u0111i\u1ec7n tho\u1ea1i.",
  hoTen: "H\u1ecd v\u00e0 t\u00ean",
  tenDangNhap: "T\u00ean t\u00e0i kho\u1ea3n",
  email: "Email",
  soDienThoai: "S\u1ed1 \u0111i\u1ec7n tho\u1ea1i",
  refresh: "L\u00e0m m\u1edbi",
  refreshing: "\u0110ang l\u00e0m m\u1edbi...",
  save: "L\u01b0u thay \u0111\u1ed5i",
  saving: "\u0110ang l\u01b0u...",
  reset: "Ho\u00e0n t\u00e1c",
  active: "\u0110ang ho\u1ea1t \u0111\u1ed9ng",
  inactive: "T\u1ea1m kh\u00f3a",
  noRole: "Ch\u01b0a c\u00f3 vai tr\u00f2",
  noData: "Ch\u01b0a c\u1eadp nh\u1eadt",
  noUserId: "Kh\u00f4ng t\u00ecm th\u1ea5y ID t\u00e0i kho\u1ea3n trong phi\u00ean \u0111\u0103ng nh\u1eadp.",
  loadFailPrefix: "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c h\u1ed3 s\u01a1",
  loadApiFail:
    "Kh\u00f4ng k\u1ebft n\u1ed1i \u0111\u01b0\u1ee3c API h\u1ed3 s\u01a1. \u0110ang hi\u1ec3n th\u1ecb d\u1eef li\u1ec7u t\u1ea1m.",
  invalidImageType: "Vui l\u00f2ng ch\u1ecdn \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng \u1ea3nh.",
  invalidImageSize: "\u1ea2nh v\u01b0\u1ee3t qu\u00e1 5MB. Vui l\u00f2ng ch\u1ecdn \u1ea3nh nh\u1ecf h\u01a1n.",
  avatarSuccess: "C\u1eadp nh\u1eadt \u1ea3nh \u0111\u1ea1i di\u1ec7n th\u00e0nh c\u00f4ng.",
  avatarUploadFailPrefix: "T\u1ea3i \u1ea3nh th\u1ea5t b\u1ea1i",
  avatarApiFail: "Kh\u00f4ng k\u1ebft n\u1ed1i \u0111\u01b0\u1ee3c API t\u1ea3i \u1ea3nh \u0111\u1ea1i di\u1ec7n.",
  avatarPending: "\u1ea2nh m\u1edbi \u0111ang ch\u1edd l\u01b0u",
  avatarPick: "Ch\u1ecdn \u1ea3nh",
  avatarSavePending: "L\u01b0u \u1ea3nh \u0111\u1ea1i di\u1ec7n",
  avatarClearPending: "H\u1ee7y \u1ea3nh m\u1edbi",
  avatarDropHint: "K\u00e9o th\u1ea3 \u1ea3nh v\u00e0o \u0111\u00e2y",
  avatarDropSubHint:
    "H\u1ed7 tr\u1ee3 JPG, PNG, WEBP, GIF. Sau khi ch\u1ecdn, b\u1ea1n c\u00f3 th\u1ec3 crop tr\u00f2n tr\u01b0\u1edbc khi l\u01b0u.",
  avatarCropTitle: "C\u1eaft \u1ea3nh \u0111\u1ea1i di\u1ec7n",
  avatarCropHint:
    "Di chuy\u1ec3n \u1ea3nh v\u00e0 zoom \u0111\u1ec3 ch\u1ecdn v\u00f9ng hi\u1ec3n th\u1ecb t\u1ed1t nh\u1ea5t.",
  avatarCropCancel: "H\u1ee7y",
  avatarCropApply: "D\u00f9ng \u1ea3nh n\u00e0y",
  avatarCropping: "\u0110ang x\u1eed l\u00fd...",
  avatarPreviewReady: "\u0110\u00e3 t\u1ea1o xem tr\u01b0\u1edbc \u1ea3nh. B\u1ea5m \"L\u01b0u \u1ea3nh \u0111\u1ea1i di\u1ec7n\" \u0111\u1ec3 c\u1eadp nh\u1eadt.",
  avatarCropFail: "Kh\u00f4ng c\u1eaft \u0111\u01b0\u1ee3c \u1ea3nh. Vui l\u00f2ng th\u1eed l\u1ea1i.",
  avatarNoPending: "H\u00e3y ch\u1ecdn \u1ea3nh v\u00e0 crop tr\u01b0\u1edbc khi l\u01b0u.",
  avatarDropActive: "Th\u1ea3 \u1ea3nh t\u1ea1i \u0111\u00e2y",
  usernameRequired: "T\u00ean t\u00e0i kho\u1ea3n kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng.",
  saveSuccess: "C\u1eadp nh\u1eadt t\u00e0i kho\u1ea3n th\u00e0nh c\u00f4ng.",
  saveFailPrefix: "L\u01b0u th\u1ea5t b\u1ea1i",
  saveApiFail: "Kh\u00f4ng k\u1ebft n\u1ed1i \u0111\u01b0\u1ee3c API c\u1eadp nh\u1eadt t\u00e0i kho\u1ea3n.",
  uploading: "\u0110ang t\u1ea3i \u1ea3nh...",
  upload: "T\u1ea3i \u1ea3nh \u0111\u1ea1i di\u1ec7n",
};

const decodeEscapedUnicode = (value) => {
  if (typeof value !== "string") return "";
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
};

const normalizeText = (value) => decodeEscapedUnicode((value ?? "").toString());

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || "");
    reader.onerror = () => reject(new Error("read_file_failed"));
    reader.readAsDataURL(file);
  });

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("load_image_failed"));
    image.src = url;
  });

const getCroppedBlob = async (imageSrc, cropPixels) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("no_canvas_context");

  const size = Math.min(cropPixels.width, cropPixels.height);
  canvas.width = size;
  canvas.height = size;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    size,
    size,
    0,
    0,
    size,
    size
  );
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("crop_blob_failed"));
          return;
        }
        resolve(blob);
      },
      "image/png",
      0.96
    );
  });
};

const getOrderedApiBases = () => {
  const preferred = localStorage.getItem(AUTH_API_BASE_KEY);
  if (preferred && AUTH_API_BASES.includes(preferred)) {
    return [preferred, ...AUTH_API_BASES.filter((base) => base !== preferred)];
  }
  return AUTH_API_BASES;
};

const resolveAvatarUrl = (anhDaiDien) => {
  const cleaned = normalizeText(anhDaiDien);
  if (!cleaned) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;

  const base = localStorage.getItem(AUTH_API_BASE_KEY) || AUTH_API_BASES[0];
  return `${base}${cleaned}`;
};

const requestAuthApi = async (
  method,
  path,
  { params, data, headers, stopOnClientError = true } = {}
) => {
  let lastErr;

  for (const baseUrl of getOrderedApiBases()) {
    try {
      const res = await axios({
        method,
        url: `${baseUrl}${path}`,
        params,
        data,
        headers,
        timeout: 8000,
      });
      localStorage.setItem(AUTH_API_BASE_KEY, baseUrl);
      return res;
    } catch (err) {
      if (
        stopOnClientError &&
        err?.response?.status >= 400 &&
        err?.response?.status < 500
      ) {
        throw err;
      }
      lastErr = err;
    }
  }

  throw lastErr;
};

const toNullableString = (value) => {
  const trimmed = normalizeText(value).trim();
  return trimmed ? trimmed : null;
};

const normalizeProfile = (apiUser, storedUser) => {
  const roles = Array.isArray(apiUser?.roles)
    ? apiUser.roles
    : Array.isArray(storedUser?.roles)
    ? storedUser.roles
    : [];

  const hoTen =
    apiUser?.hoTen ||
    storedUser?.fullName ||
    storedUser?.hoTen ||
    storedUser?.tenDangNhap ||
    "";

  return {
    id: apiUser?.id ?? storedUser?.userId ?? 0,
    hoTen: normalizeText(hoTen),
    tenDangNhap: normalizeText(apiUser?.tenDangNhap || storedUser?.tenDangNhap || ""),
    email: normalizeText(apiUser?.email || ""),
    soDienThoai: normalizeText(apiUser?.soDienThoai || ""),
    anhDaiDien: normalizeText(apiUser?.anhDaiDien || storedUser?.anhDaiDien || ""),
    hoatDong: apiUser?.hoatDong !== false,
    roles,
  };
};

const profileToForm = (profile) => ({
  hoTen: normalizeText(profile?.hoTen || ""),
  tenDangNhap: normalizeText(profile?.tenDangNhap || ""),
  email: normalizeText(profile?.email || ""),
  soDienThoai: normalizeText(profile?.soDienThoai || ""),
});

const formatRole = (role) => {
  if (!role) return TEXT.noRole;
  return role
    .toString()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const getInitials = (name) => {
  const chunks = normalizeText(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!chunks.length) return "U";
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return `${chunks[0][0]}${chunks[chunks.length - 1][0]}`.toUpperCase();
};

export default function TaiKhoanCaNhan() {
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    hoTen: "",
    tenDangNhap: "",
    email: "",
    soDienThoai: "",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState(null);
  const [cropProcessing, setCropProcessing] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState("");
  const [avatarDragActive, setAvatarDragActive] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const initials = useMemo(() => getInitials(profile?.hoTen), [profile?.hoTen]);
  const avatarUrl = useMemo(
    () => resolveAvatarUrl(profile?.anhDaiDien),
    [profile?.anhDaiDien]
  );
  const displayedAvatar = pendingAvatarPreview || avatarUrl;

  const hasChanges = useMemo(() => {
    if (!profile) return false;

    return (
      normalizeText(formData.hoTen).trim() !== normalizeText(profile.hoTen).trim() ||
      normalizeText(formData.tenDangNhap).trim() !==
        normalizeText(profile.tenDangNhap).trim() ||
      normalizeText(formData.email).trim() !== normalizeText(profile.email).trim() ||
      normalizeText(formData.soDienThoai).trim() !==
        normalizeText(profile.soDienThoai).trim()
    );
  }, [formData, profile]);

  const syncUserInfoToLocal = (nextProfile, oldStoredUser) => {
    localStorage.setItem(
      "userInfo",
      JSON.stringify({
        ...(oldStoredUser || {}),
        userId: nextProfile.id,
        tenDangNhap: normalizeText(nextProfile.tenDangNhap),
        hoTen: normalizeText(nextProfile.hoTen),
        fullName: normalizeText(nextProfile.hoTen),
        anhDaiDien: normalizeText(nextProfile.anhDaiDien || ""),
        roles: nextProfile.roles || [],
      })
    );
  };

  const loadProfile = useCallback(
    async (silent = false) => {
      const storedRaw = localStorage.getItem("userInfo");
      if (!storedRaw) {
        navigate("/login", { replace: true });
        return;
      }

      let storedUser = null;
      try {
        storedUser = JSON.parse(storedRaw);
      } catch {
        localStorage.removeItem("userInfo");
        navigate("/login", { replace: true });
        return;
      }

      const userId = storedUser?.userId;
      if (!userId) {
        const fallback = normalizeProfile(null, storedUser);
        setProfile(fallback);
        setFormData(profileToForm(fallback));
        setNotice({
          type: "warning",
          text: TEXT.noUserId,
        });
        setLoading(false);
        return;
      }

      if (silent) setRefreshing(true);
      else setLoading(true);
      setNotice({ type: "", text: "" });

      try {
        const res = await requestAuthApi("get", "/api/Auth/me", {
          params: { id: userId },
          stopOnClientError: false,
        });

        const normalized = normalizeProfile(res.data, storedUser);
        setProfile(normalized);
        setFormData(profileToForm(normalized));
        syncUserInfoToLocal(normalized, storedUser);
        window.dispatchEvent(new Event("userInfoUpdated"));
      } catch (err) {
        const fallback = normalizeProfile(null, storedUser);
        setProfile(fallback);
        setFormData(profileToForm(fallback));

        const status = err?.response?.status;
        const beMsg =
          err?.response?.data?.message ||
          (typeof err?.response?.data === "string" ? err.response.data : "");

        if (status) {
          setNotice({
            type: "warning",
            text: `${TEXT.loadFailPrefix} (${status})${beMsg ? `: ${beMsg}` : ""}`,
          });
        } else {
          setNotice({
            type: "warning",
            text: TEXT.loadApiFail,
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadProfile(false);
  }, [loadProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData(profileToForm(profile));
    setNotice({ type: "", text: "" });
  };

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCropPixels(croppedAreaPixels);
  }, []);

  const startAvatarCrop = async (file) => {
    if (!file || !profile?.id) return;
    if (!file.type.startsWith("image/")) {
      setNotice({
        type: "error",
        text: TEXT.invalidImageType,
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({
        type: "error",
        text: TEXT.invalidImageSize,
      });
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataURL(file);
      setCropImageSrc(imageDataUrl);
      setCropPosition({ x: 0, y: 0 });
      setCropZoom(1);
      setCropPixels(null);
      setCropModalOpen(true);
      setNotice({ type: "", text: "" });
    } catch {
      setNotice({
        type: "error",
        text: TEXT.avatarCropFail,
      });
    }
  };

  const handleAvatarInputChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await startAvatarCrop(file);
  };

  const handleAvatarDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAvatarDragActive(true);
  };

  const handleAvatarDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAvatarDragActive(false);
  };

  const handleAvatarDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAvatarDragActive(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await startAvatarCrop(file);
  };

  const closeCropModal = () => {
    if (cropProcessing) return;
    setCropModalOpen(false);
    setCropImageSrc("");
    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setCropPixels(null);
  };

  const handleApplyCrop = async () => {
    if (!cropImageSrc || !cropPixels || cropProcessing || !profile?.id) return;

    setCropProcessing(true);
    try {
      const blob = await getCroppedBlob(cropImageSrc, cropPixels);
      const nextFile = new File([blob], `avatar_${profile.id}_${Date.now()}.png`, {
        type: "image/png",
      });
      const preview = await readFileAsDataURL(nextFile);

      setPendingAvatarFile(nextFile);
      setPendingAvatarPreview(preview);
      closeCropModal();
      setNotice({
        type: "success",
        text: TEXT.avatarPreviewReady,
      });
    } catch {
      setNotice({
        type: "error",
        text: TEXT.avatarCropFail,
      });
    } finally {
      setCropProcessing(false);
    }
  };

  const clearPendingAvatar = () => {
    setPendingAvatarFile(null);
    setPendingAvatarPreview("");
  };

  const handleUploadAvatar = async () => {
    if (!profile?.id) return;
    if (!pendingAvatarFile) {
      setNotice({
        type: "warning",
        text: TEXT.avatarNoPending,
      });
      return;
    }

    setAvatarUploading(true);
    setNotice({ type: "", text: "" });

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", pendingAvatarFile);

      const res = await requestAuthApi("post", `/api/Auth/me/${profile.id}/avatar`, {
        data: formDataUpload,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const nextProfile = {
        ...profile,
        anhDaiDien: normalizeText(res?.data?.anhDaiDien || profile.anhDaiDien),
      };

      setProfile(nextProfile);
      clearPendingAvatar();

      const storedRaw = localStorage.getItem("userInfo");
      let storedUser = {};
      if (storedRaw) {
        try {
          storedUser = JSON.parse(storedRaw);
        } catch {
          localStorage.removeItem("userInfo");
        }
      }

      syncUserInfoToLocal(nextProfile, storedUser);
      window.dispatchEvent(new Event("userInfoUpdated"));

      setNotice({
        type: "success",
        text: TEXT.avatarSuccess,
      });
    } catch (err) {
      const status = err?.response?.status;
      const beMsg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : "");

      if (status) {
        setNotice({
          type: "error",
          text: `${TEXT.avatarUploadFailPrefix} (${status})${beMsg ? `: ${beMsg}` : ""}`,
        });
      } else {
        setNotice({
          type: "error",
          text: TEXT.avatarApiFail,
        });
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile) return;

    const tenDangNhap = normalizeText(formData.tenDangNhap).trim();
    if (!tenDangNhap) {
      setNotice({
        type: "error",
        text: TEXT.usernameRequired,
      });
      return;
    }

    setSaving(true);
    setNotice({ type: "", text: "" });

    const payload = {
      hoTen: normalizeText(formData.hoTen).trim(),
      tenDangNhap,
      email: toNullableString(formData.email),
      soDienThoai: toNullableString(formData.soDienThoai),
    };

    try {
      const res = await requestAuthApi("put", `/api/Auth/me/${profile.id}`, {
        data: payload,
      });

      const storedRaw = localStorage.getItem("userInfo");
      let storedUser = {};
      if (storedRaw) {
        try {
          storedUser = JSON.parse(storedRaw);
        } catch {
          localStorage.removeItem("userInfo");
        }
      }

      let serverUser = res?.data?.user;
      try {
        const refreshed = await requestAuthApi("get", "/api/Auth/me", {
          params: { id: profile.id },
          stopOnClientError: false,
        });
        if (refreshed?.data) serverUser = refreshed.data;
      } catch {
        // Keep optimistic payload when immediate re-fetch fails.
      }

      const normalized = normalizeProfile(
        serverUser || {
          id: profile.id,
          hoTen: payload.hoTen,
          tenDangNhap: payload.tenDangNhap,
          email: payload.email,
          soDienThoai: payload.soDienThoai,
          hoatDong: profile.hoatDong,
          roles: profile.roles,
          anhDaiDien: profile.anhDaiDien,
        },
        storedUser
      );

      if (!(normalized.roles || []).length) {
        normalized.roles = profile.roles || [];
      }

      setProfile(normalized);
      setFormData(profileToForm(normalized));
      syncUserInfoToLocal(normalized, storedUser);
      window.dispatchEvent(new Event("userInfoUpdated"));

      setNotice({
        type: "success",
        text: TEXT.saveSuccess,
      });
    } catch (err) {
      const status = err?.response?.status;
      const beMsg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : "");

      if (status) {
        setNotice({
          type: "error",
          text: `${TEXT.saveFailPrefix} (${status})${beMsg ? `: ${beMsg}` : ""}`,
        });
      } else {
        setNotice({
          type: "error",
          text: TEXT.saveApiFail,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const noticeClass =
    notice.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <MainLayout>
      <div className="h-full w-full overflow-y-auto">
        <div className="w-full px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
          <section className="app-card relative overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-cyan-100/65 via-sky-100/60 to-blue-100/70" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
                  {TEXT.brand}
                </p>
                <h1 className="app-heading text-3xl sm:text-4xl">{TEXT.title}</h1>
                <p className="app-subtext mt-2 max-w-3xl text-sm sm:text-base">
                  {TEXT.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadProfile(true)}
                  disabled={refreshing || loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? TEXT.refreshing : TEXT.refresh}
                </button>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                    profile?.hoatDong
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  <BadgeCheck size={14} />
                  {profile?.hoatDong ? TEXT.active : TEXT.inactive}
                </span>
              </div>
            </div>
          </section>

          {notice.text && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${noticeClass}`}>
              {notice.text}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <aside className="app-card p-6 xl:col-span-1">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-16 w-16 rounded-2xl bg-sky-100" />
                  <div className="h-4 w-40 rounded bg-sky-100" />
                  <div className="h-4 w-28 rounded bg-sky-100" />
                  <div className="h-24 rounded-2xl bg-sky-100" />
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-4">
                    {displayedAvatar ? (
                      <img
                        src={displayedAvatar}
                        alt="anh dai dien"
                        className="h-16 w-16 rounded-2xl border border-sky-100 object-cover shadow-md"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 text-xl font-bold text-white shadow-md">
                        {initials}
                      </div>
                    )}

                    <div>
                      <p className="text-base font-bold text-slate-800">
                        {profile?.hoTen || TEXT.noData}
                      </p>
                      <p className="text-sm text-slate-500">
                        @{profile?.tenDangNhap || "unknown"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`mb-5 rounded-2xl border-2 border-dashed p-4 transition ${
                      avatarDragActive
                        ? "border-sky-400 bg-sky-50/80"
                        : "border-sky-200 bg-sky-50/50"
                    }`}
                    onDragOver={handleAvatarDragOver}
                    onDragLeave={handleAvatarDragLeave}
                    onDrop={handleAvatarDrop}
                  >
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarInputChange}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center gap-3 text-center">
                      {displayedAvatar ? (
                        <img
                          src={displayedAvatar}
                          alt="anh xem truoc"
                          className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md ring-2 ring-sky-100"
                        />
                      ) : (
                        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-3xl font-bold text-white shadow-md">
                          {initials}
                        </div>
                      )}

                      {pendingAvatarFile && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          {TEXT.avatarPending}
                        </span>
                      )}

                      <p className="text-sm font-semibold text-slate-700">
                        {avatarDragActive ? TEXT.avatarDropActive : TEXT.avatarDropHint}
                      </p>
                      <p className="text-xs text-slate-500">{TEXT.avatarDropSubHint}</p>

                      <div className="flex w-full flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Camera size={15} />
                          {TEXT.avatarPick}
                        </button>

                        <button
                          type="button"
                          onClick={handleUploadAvatar}
                          disabled={avatarUploading || !pendingAvatarFile}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Camera size={15} />
                          {avatarUploading ? TEXT.uploading : TEXT.avatarSavePending}
                        </button>

                        <button
                          type="button"
                          onClick={clearPendingAvatar}
                          disabled={avatarUploading || !pendingAvatarFile}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {TEXT.avatarClearPending}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">
                      {TEXT.contactTitle}
                    </h3>

                    <div className="space-y-2 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Mail size={15} className="text-sky-600" />
                        <span>{profile?.email || TEXT.noData}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={15} className="text-sky-600" />
                        <span>{profile?.soDienThoai || TEXT.noData}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={15} className="text-sky-600" />
                        <span>ID: {profile?.id || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">
                      {TEXT.roleTitle}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(profile?.roles || []).length ? (
                        profile.roles.map((role) => (
                          <span
                            key={role}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                          >
                            {formatRole(role)}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {TEXT.noRole}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </aside>

            <section className="app-card p-6 xl:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{TEXT.editTitle}</h2>
                  <p className="mt-1 text-sm text-slate-600">{TEXT.editSubtitle}</p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  <ShieldCheck size={14} />
                  <span>{TEXT.profileCardTitle}</span>
                </div>
              </div>

              {loading ? (
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 animate-pulse">
                  <div className="h-11 rounded-xl bg-sky-100" />
                  <div className="h-11 rounded-xl bg-sky-100" />
                  <div className="h-11 rounded-xl bg-sky-100" />
                  <div className="h-11 rounded-xl bg-sky-100" />
                </div>
              ) : (
                <form
                  onSubmit={handleSave}
                  className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {TEXT.hoTen}
                    </span>
                    <input
                      type="text"
                      name="hoTen"
                      value={formData.hoTen}
                      onChange={handleInputChange}
                      className="app-input"
                      placeholder="Nguy\u1ec5n V\u0103n A"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {TEXT.tenDangNhap} <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="text"
                      name="tenDangNhap"
                      value={formData.tenDangNhap}
                      onChange={handleInputChange}
                      className="app-input"
                      placeholder="VD: nhanvien.tiuv"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {TEXT.email}
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="app-input"
                      placeholder="example@tiuv.vn"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {TEXT.soDienThoai}
                    </span>
                    <input
                      type="text"
                      name="soDienThoai"
                      value={formData.soDienThoai}
                      onChange={handleInputChange}
                      className="app-input"
                      placeholder="09xxxxxxxx"
                    />
                  </label>

                  <div className="col-span-full mt-2 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={saving || !hasChanges}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RotateCcw size={15} />
                      {TEXT.reset}
                    </button>

                    <button
                      type="submit"
                      disabled={saving || !hasChanges}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Save size={15} />
                      {saving ? TEXT.saving : TEXT.save}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>

      {cropModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/65 px-4 py-6 backdrop-blur-[1px]">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">{TEXT.avatarCropTitle}</h3>
              <p className="mt-1 text-sm text-slate-600">{TEXT.avatarCropHint}</p>
            </div>

            <div className="relative h-[320px] w-full overflow-hidden rounded-2xl bg-slate-900">
              <Cropper
                image={cropImageSrc}
                crop={cropPosition}
                zoom={cropZoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCropPosition}
                onCropComplete={onCropComplete}
                onZoomChange={setCropZoom}
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Zoom</span>
                <span>{cropZoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={cropZoom}
                onChange={(e) => setCropZoom(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCropModal}
                disabled={cropProcessing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {TEXT.avatarCropCancel}
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                disabled={cropProcessing}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cropProcessing ? TEXT.avatarCropping : TEXT.avatarCropApply}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
