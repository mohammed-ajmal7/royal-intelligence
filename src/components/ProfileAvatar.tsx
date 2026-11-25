"use client";

import { useEffect, useState } from "react";
import { Camera, Crown, RotateCcw } from "lucide-react";
import { profileArtwork } from "../lib/profileArt";

type Props = { playerTag: string; playerName: string; rawPlayer: unknown };

/**
 * The official public player API does not return a Supercell ID avatar.
 * Show official in-game badge/favourite-card art by default. The account owner
 * can supply their exact Supercell ID avatar as an image, saved locally only.
 */
export function ProfileAvatar({ playerTag, playerName, rawPlayer }: Props) {
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [error, setError] = useState("");
  const art = profileArtwork(rawPlayer);
  const key = "ri-supercell-avatar:" + playerTag.toUpperCase();
  const src = uploaded || art?.src || null;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      setUploaded(saved?.startsWith("data:image/") ? saved : null);
    } catch {
      setUploaded(null);
    }
    setError("");
    setBroken(false);
  }, [key]);

  useEffect(() => setBroken(false), [src]);

  function upload(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024) {
      setError("Choose a PNG, JPG or WebP image smaller than 8 MB.");
      return;
    }
    setError("");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Image processing is unavailable.");
        const edge = Math.min(img.naturalWidth, img.naturalHeight);
        ctx.drawImage(img,
          (img.naturalWidth - edge) / 2,
          (img.naturalHeight - edge) / 2,
          edge, edge, 0, 0, 240, 240);
        const image = canvas.toDataURL("image/webp", 0.84);
        localStorage.setItem(key, image);
        setUploaded(image);
      } catch {
        setError("Could not save the avatar in this browser.");
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      setError("The selected image could not be opened.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function reset() {
    try { localStorage.removeItem(key); } catch { /* Storage unavailable */ }
    setUploaded(null);
    setBroken(false);
    setError("");
  }

  return (
    <div className="ri-profile-avatar-wrap">
      <div className="ri-profile-icon ri-profile-avatar">
        {src && !broken
          ? <img src={src} alt={uploaded
            ? playerName + "'s chosen Supercell ID avatar"
            : art?.alt || "Clash Royale profile artwork"}
            loading="eager" onError={() => setBroken(true)}/>
          : <Crown size={28} aria-label="Clash Royale profile" />}
      </div>
      <label className="ri-avatar-edit" title="Choose your Supercell ID avatar (stored on this device)"
        aria-label="Upload Supercell ID avatar">
        <Camera size={13} aria-hidden="true"/>
        <input type="file" accept="image/png,image/jpeg,image/webp"
          aria-label="Upload Supercell ID avatar image"
          onChange={event => {
            upload(event.target.files?.[0]);
            event.target.value = "";
          }}/>
      </label>
      {uploaded && <button type="button" className="ri-avatar-reset"
        onClick={reset} aria-label="Reset avatar to official game artwork"
        title="Use game profile artwork"><RotateCcw size={13}/></button>}
      {error && <small className="ri-avatar-error" role="alert">{error}</small>}
    </div>
  );
}
