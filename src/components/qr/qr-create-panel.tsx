"use client";

import { useState, type ChangeEvent, type FormEvent, useRef } from "react";
import { validateAndSanitizeUrl } from "@/lib/security";
import { DURATION_LABELS } from "@/features/dynamic-qr/dynamic-qr-service";
import type { QRExpirationOption, QRBehaviorMode, DynamicQRRecord } from "@/models/qr-slot";

interface QRCreatePanelProps {
  onFileSelect: (file?: File) => Promise<void> | void;
  onCreateFromUrl: (options: {
    targetUrl: string;
    durationKey: QRExpirationOption;
    mode: QRBehaviorMode;
    title?: string;
  }) => Promise<DynamicQRRecord | void>;
  currentDynamicRecord?: DynamicQRRecord | null;
  busy?: boolean;
}

const DURATION_OPTIONS: Array<{ key: QRExpirationOption; label: string; tag?: string }> = [
  { key: "1m", label: "1 mes", tag: "30 días" },
  { key: "3m", label: "3 meses", tag: "90 días" },
  { key: "6m", label: "6 meses", tag: "180 días" },
  { key: "1y", label: "12 meses", tag: "1 año" },
];

export function QRCreatePanel({
  onFileSelect,
  onCreateFromUrl,
  currentDynamicRecord,
  busy = false,
}: QRCreatePanelProps) {
  const [activeTab, setActiveTab] = useState<"url" | "file">("url");
  const [targetUrl, setTargetUrl] = useState("");
  const [title, setTitle] = useState("");
  const [durationKey, setDurationKey] = useState<QRExpirationOption>("1y");
  const [mode, setMode] = useState<QRBehaviorMode>("direct");
  const [urlError, setUrlError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTargetUrl(val);
    if (urlError && val.trim()) {
      setUrlError("");
    }
  };

  const handleSubmitUrl = async (e: FormEvent) => {
    e.preventDefault();
    setUrlError("");
    setSuccessMessage("");

    const validation = validateAndSanitizeUrl(targetUrl);
    if (!validation.isValid || !validation.sanitizedUrl) {
      setUrlError(validation.error || "Por favor ingresa una URL válida.");
      return;
    }

    setIsSubmitting(true);
    try {
      const record = await onCreateFromUrl({
        targetUrl: validation.sanitizedUrl,
        durationKey,
        mode,
        title: title.trim() || undefined,
      });

      if (record) {
        setSuccessMessage(`¡QR creado exitosamente! Vigencia: ${DURATION_LABELS[record.durationKey]}`);
      }
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Error al crear el código QR.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="qrCreateContainer">
      {currentDynamicRecord && (
        <div className="qrCurrentNotice">
          <span className="noticeIcon">ℹ️</span>
          <span>Al generar o subir un QR, reemplazarás el jardín actual de la escena.</span>
        </div>
      )}

      {/* Selector de modo: URL vs Archivo */}
      <div className="qrCreateTabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "url"}
          className={`qrCreateTab ${activeTab === "url" ? "active" : ""}`}
          onClick={() => setActiveTab("url")}
        >
          <span className="tabIcon">🔗</span>
          <span>Crear desde URL</span>
          <span className="tabBadge">Temporal</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "file"}
          className={`qrCreateTab ${activeTab === "file" ? "active" : ""}`}
          onClick={() => setActiveTab("file")}
        >
          <span className="tabIcon">📁</span>
          <span>Subir imagen QR</span>
        </button>
      </div>

      {activeTab === "url" ? (
        <form className="qrUrlForm" onSubmit={handleSubmitUrl}>
          <div className="formGroup">
            <label htmlFor="target-url-input" className="formLabel">
              <span>URL de destino:</span>
              <span className="labelHint">A dónde dirigirá este código QR</span>
            </label>
            <div className="inputWithIcon">
              <span className="inputIcon">🌐</span>
              <input
                id="target-url-input"
                type="text"
                className={`textInput ${urlError ? "inputError" : ""}`}
                placeholder="https://tu-sitio-web.com/oferta"
                value={targetUrl}
                onChange={handleUrlChange}
                disabled={isSubmitting || busy}
                autoComplete="off"
              />
            </div>
            {urlError && <p className="fieldErrorMessage">{urlError}</p>}
          </div>

          <div className="formGroup">
            <label htmlFor="title-input" className="formLabel">
              <span>Título o etiqueta (opcional):</span>
            </label>
            <input
              id="title-input"
              type="text"
              className="textInput"
              placeholder="Ej. Menú primavera, Entrada evento"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting || busy}
              maxLength={60}
            />
          </div>

          {/* Selector de tipo de comportamiento del QR */}
          <div className="formGroup">
            <label className="formLabel">
              <span>Comportamiento al escanear:</span>
            </label>
            <div className="behaviorModeGrid">
              <label className={`behaviorOption ${mode === "direct" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="qr-mode"
                  value="direct"
                  checked={mode === "direct"}
                  onChange={() => setMode("direct")}
                />
                <div className="optionBody">
                  <div className="optionHeader">
                    <span className="optionEmoji">⚡</span>
                    <strong>QR Directo</strong>
                  </div>
                  <p>Redirige de inmediato a la URL destino sin desvío (valida caducidad).</p>
                </div>
              </label>

              <label className={`behaviorOption ${mode === "voxel" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="qr-mode"
                  value="voxel"
                  checked={mode === "voxel"}
                  onChange={() => setMode("voxel")}
                />
                <div className="optionBody">
                  <div className="optionHeader">
                    <span className="optionEmoji">🌸</span>
                    <strong>QR Dinámico Voxel</strong>
                  </div>
                  <p>Desvía a la experiencia inmersiva del jardín 3D con botón al destino.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Selector de vigencia */}
          <div className="formGroup">
            <label className="formLabel">
              <span>Vigencia del código QR:</span>
              <span className="labelHint">Ambos tipos caducan automáticamente al vencer</span>
            </label>
            <div className="durationButtonsGrid">
              {DURATION_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`durationPill ${durationKey === item.key ? "active" : ""}`}
                  onClick={() => setDurationKey(item.key)}
                >
                  <span className="durationLabel">{item.label}</span>
                  {item.tag && <span className="durationTag">{item.tag}</span>}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btnCreateQR glowButton"
            disabled={isSubmitting || busy || !targetUrl.trim()}
          >
            {isSubmitting ? (
              <span>Generando jardín voxel…</span>
            ) : (
              <span>✨ Generar QR Voxel ({DURATION_OPTIONS.find((o) => o.key === durationKey)?.label})</span>
            )}
          </button>

          {successMessage && (
            <p className="formSuccessMessage">
              ✓ {successMessage}
            </p>
          )}
        </form>
      ) : (
        <div className="qrFileUploadArea">
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.svg,.bmp"
            className="hiddenFileInput"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFileSelect(file);
            }}
          />
          <div
            className="fileDropPrompt"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <span className="dropIcon">📷</span>
            <strong>Selecciona o arrastra una imagen de QR</strong>
            <p>Soporta PNG, JPG, WebP, SVG y mapas de bits estándar.</p>
            <span className="btnSecondary">Explorar archivos</span>
          </div>
        </div>
      )}
    </div>
  );
}
