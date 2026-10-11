import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Camera, Upload, LoaderCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { decodePhoto, exportPhoto } from "./smartPhoto";

export default function PhotoUploader({ onSave }) {
  const canTakePhoto =
    typeof navigator !== "undefined" &&
    (navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  const choose = useRef(null),
    camera = useRef(null),
    job = useRef(0),
    sourceRef = useRef(null);
  const [source, setSource] = useState(null),
    [preview, setPreview] = useState(null),
    [area, setArea] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 }),
    [zoom, setZoom] = useState(1),
    [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const clear = useCallback(() => {
    job.current++;
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    sourceRef.current = null;
    setSource(null);
    setPreview(null);
    setArea(null);
    setError("");
    setBusy(false);
  }, []);
  useEffect(
    () => () => {
      job.current++;
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    },
    [],
  );
  const select = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    clear();
    const ticket = job.current;
    setBusy(true);
    let prepared;
    try {
      prepared = await decodePhoto(file);
      prepared.originalArea = prepared.area;
      const result = await exportPhoto(prepared.url, prepared.area);
      if (ticket !== job.current) {
        URL.revokeObjectURL(prepared.url);
        return;
      }
      sourceRef.current = prepared;
      setSource(prepared);
      setArea(prepared.area);
      setPreview(result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setEditing(prepared.manual);
    } catch (e) {
      if (prepared) URL.revokeObjectURL(prepared.url);
      if (ticket === job.current)
        setError(e.message || "Please choose another photo.");
    } finally {
      if (ticket === job.current) setBusy(false);
    }
  };
  const makePreview = async () => {
    const ticket = job.current;
    setBusy(true);
    setError("");
    try {
      const result = await exportPhoto(source.url, area);
      if (ticket !== job.current) return;
      setPreview(result);
      setSource({ ...source, area });
      setEditing(false);
    } catch (e) {
      if (ticket === job.current) setError(e.message);
    } finally {
      if (ticket === job.current) setBusy(false);
    }
  };
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await exportPhoto(source.url, area);
      setPreview(result);
      await onSave(result.dataUrl);
      clear();
      toast.success("Photo saved successfully.");
    } catch (e) {
      setError(
        e.message?.includes("too small")
          ? e.message
          : "Your photo was not saved. Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const updateArea = useCallback((_percent, pixels) => setArea(pixels), []);
  const buttons = (
    <>
      <Button
        size="sm"
        variant="secondary"
        icon={<Upload size={14} />}
        onClick={() => choose.current.click()}
        disabled={busy || saving}
      >
        {source ? "Change Photo" : "Choose Photo"}
      </Button>
      {canTakePhoto && (
        <Button
          size="sm"
          variant="secondary"
          icon={<Camera size={14} />}
          onClick={() => camera.current.click()}
          disabled={busy || saving}
        >
          Take Photo
        </Button>
      )}
    </>
  );
  return (
    <section
      className="w-full space-y-3"
      aria-label="Upload Your Photo"
      aria-busy={busy || saving}
    >
      <h2 className="text-sm font-semibold text-text-primary">
        Upload Your Photo
      </h2>
      <p className="text-xs text-text-muted">
        Choose a clear photo showing your face. We'll automatically adjust it to
        the required size.
      </p>
      <input
        ref={choose}
        aria-label="Choose photo file"
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
        className="sr-only"
        tabIndex={-1}
        disabled={busy || saving}
        onChange={select}
      />
      <input
        ref={camera}
        aria-label="Take photo file"
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        tabIndex={-1}
        disabled={busy || saving}
        onChange={select}
      />
      <div className="flex flex-wrap justify-center gap-2">{buttons}</div>
      {busy && (
        <p
          role="status"
          className="text-sm text-text-secondary flex items-center justify-center gap-2"
        >
          <LoaderCircle size={16} className="animate-spin" />
          Adjusting your photo…
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
      {source && !busy && (
        <>
          {source.notice && (
            <p className="text-xs text-amber-400">{source.notice}</p>
          )}
          {editing ? (
            <>
              <div
                className={`relative h-72 sm:h-80 bg-surface-bg rounded-lg overflow-hidden ${saving ? "pointer-events-none" : ""}`}
              >
                <Cropper
                  key={resetKey}
                  image={source.url}
                  aspect={7 / 9}
                  crop={crop}
                  zoom={zoom}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropAreaChange={updateArea}
                  initialCroppedAreaPixels={source.area}
                  maxZoom={6}
                  cropperProps={{
                    tabIndex: saving ? -1 : 0,
                    "aria-label": "Adjust photo crop using arrow keys",
                    "aria-disabled": saving,
                  }}
                />
              </div>
              <p className="text-xs text-text-muted">
                Drag to move your photo, or use the arrow keys. Pinch or use the
                slider to zoom.
              </p>
              <label className="block text-xs text-text-secondary">
                Zoom
                <input
                  aria-label="Photo zoom"
                  className="w-full accent-brand-gold"
                  type="range"
                  min="1"
                  max="6"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  disabled={saving}
                />
              </label>
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    setArea(source.originalArea);
                    setSource({ ...source, area: source.originalArea });
                    setResetKey((key) => key + 1);
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={saving}
                  onClick={makePreview}
                >
                  Use This Crop
                </Button>
              </div>
            </>
          ) : (
            <>
              <img
                src={preview?.dataUrl}
                alt="Your photo preview"
                className="mx-auto w-40 aspect-[7/9] object-cover rounded-lg border border-surface-border"
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => setEditing(true)}
              >
                Adjust Photo
              </Button>
            </>
          )}
          {preview?.warning && (
            <p className="text-xs text-amber-400">{preview.warning}</p>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button size="sm" loading={saving} disabled={!area} onClick={save}>
              Save Photo
            </Button>
            <Button size="sm" variant="ghost" disabled={saving} onClick={clear}>
              Cancel
            </Button>
          </div>
        </>
      )}
      {busy && (
        <Button size="sm" variant="ghost" onClick={clear}>
          Cancel
        </Button>
      )}
    </section>
  );
}
