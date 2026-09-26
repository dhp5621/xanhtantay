"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Portal } from "./Portal";
import { Icon } from "./Icon";
import { SmartVideo } from "./SmartVideo";

export interface LightboxItem { url: string; kind: "image" | "video"; caption?: string }

const MIN = 0.5, MAX = 4;

/**
 * Material-style photo viewer: blurred backdrop, counter + close top-left, tag top-right,
 * large round prev/next, bottom toolbar (zoom −/%/+/reset, Download, Copy link).
 * Zoom: wheel, pinch, double-tap; pan by drag; swipe between items at 100%.
 */
export function MediaLightbox({ items, index, onClose, onDelete, tag }: { items: LightboxItem[]; index: number; onClose: () => void; onDelete?: (index: number) => void; tag?: string }) {
  const [i, setI] = useState(index);
  const [closing, setClosing] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; startX: number; startY: number; posX: number; posY: number; moved: boolean; t: number } | null>(null);
  const lastTap = useRef(0);
  const item = items[i];

  const close = useCallback(() => { setClosing(true); setTimeout(onClose, 220); }, [onClose]);
  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }); }, []);
  const go = useCallback((n: number) => { if (items.length < 2) return; setI(((n % items.length) + items.length) % items.length); reset(); setLoaded(false); }, [items.length, reset]);
  const prev = useCallback(() => go(i - 1), [go, i]);
  const next = useCallback(() => go(i + 1), [go, i]);
  const zoomTo = useCallback((s: number) => { const c = Math.min(MAX, Math.max(MIN, s)); setScale(c); if (c === 1) setPos({ x: 0, y: 0 }); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "+" || e.key === "=") zoomTo(scale * 1.25);
      if (e.key === "-") zoomTo(scale / 1.25);
      if (e.key === "0") reset();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [close, prev, next, zoomTo, reset, scale]);

  // Wheel zoom (trackpad / mouse)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { if (item?.kind !== "image") return; e.preventDefault(); zoomTo(scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale, zoomTo, item?.kind]);

  if (!item) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());
    if (pts.length === 2) {
      gesture.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), scale, startX: 0, startY: 0, posX: pos.x, posY: pos.y, moved: true, t: Date.now() };
    } else if (pts.length === 1) {
      gesture.current = { dist: 0, scale, startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y, moved: false, t: Date.now() };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());
    const g = gesture.current;
    if (pts.length === 2 && g.dist > 0) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      zoomTo(g.scale * (d / g.dist));
      g.moved = true;
    } else if (pts.length === 1) {
      const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;
      if (scale > 1) setPos({ x: g.posX + dx, y: g.posY + dy });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (!g) return;
    if (pointers.current.size === 0) {
      const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
      const quick = Date.now() - g.t < 350;
      if (scale === 1 && g.dist === 0 && quick && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { (dx > 0 ? prev : next)(); }
      else if (!g.moved && g.dist === 0 && item.kind === "image") {
        const now = Date.now();
        if (now - lastTap.current < 320) { zoomTo(scale > 1 ? 1 : 2); lastTap.current = 0; } else lastTap.current = now;
      }
      gesture.current = null;
    }
  };


  return (
    <Portal>
      {/* The viewer is portaled to <body>, but React events still bubble through the component tree:
          stop them here so a viewer opened from inside a <Link> never triggers that link's navigation. */}
      <div className={`m3-viewer ${closing ? "closing" : ""}`} role="dialog" aria-modal="true" aria-label="Xem ảnh / video" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
        {/* blurred backdrop of the current image */}
        <div className="m3-viewer-backdrop" style={item.kind === "image" ? { backgroundImage: `url(${item.url})` } : undefined} aria-hidden />

        <div className="m3-viewer-top">
          <button className="m3-icon-btn m3-viewer-btn" onClick={close} aria-label="Đóng"><Icon name="close" /></button>
          <span className="label-lg" style={{ color: "#fff" }}>{i + 1} / {items.length}</span>
          <span style={{ flex: 1 }} />
          {tag && <span className="m3-chip sm round" style={{ background: "var(--md-primary)", color: "var(--md-on-primary)", boxShadow: "none" }}>{tag}</span>}
          {onDelete && (
            <button className="m3-icon-btn m3-viewer-btn" onClick={() => { onDelete(i); if (items.length <= 1) close(); else setI((x) => Math.min(x, items.length - 2)); }} aria-label="Xoá tệp này" style={{ color: "var(--md-error)" }}><Icon name="delete" /></button>
          )}
        </div>

        <div
          ref={stageRef}
          className="m3-viewer-stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget && scale === 1) close(); }}
          style={{ cursor: item.kind === "image" ? (scale > 1 ? "grab" : "zoom-in") : "default", touchAction: "none" }}
        >
          {item.kind === "video" ? (
            <div className="m3-viewer-fit anim-in-scale"><SmartVideo src={item.url} controls autoPlay objectFit="contain" style={{ background: "transparent" }} /></div>
          ) : (
            <div className="m3-viewer-fit">
              {!loaded && <span className="m3-loader" style={{ position: "absolute" }} />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={item.url}
                src={item.url}
                alt={item.caption ?? ""}
                draggable={false}
                onLoad={() => setLoaded(true)}
                className="m3-viewer-img"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, opacity: loaded ? 1 : 0, transition: gesture.current ? "none" : "transform var(--dur-medium-2) var(--ease-standard), opacity var(--dur-medium-2) var(--ease-standard)" }}
              />
            </div>
          )}
        </div>

        {items.length > 1 && (
          <>
            <button className="m3-viewer-nav left" onClick={prev} aria-label="Trước"><Icon name="chevron_left" size={28} /></button>
            <button className="m3-viewer-nav right" onClick={next} aria-label="Sau"><Icon name="chevron_right" size={28} /></button>
          </>
        )}

        <div className="m3-viewer-bottom">
          {item.caption && <p className="body-sm m3-viewer-caption">{item.caption}</p>}
          <div className="m3-viewer-tools">
            {item.kind === "image" && (
              <div className="m3-viewer-zoom">
                <button className="m3-icon-btn" onClick={() => zoomTo(scale / 1.25)} aria-label="Thu nhỏ" disabled={scale <= MIN}><Icon name="remove" size={20} /></button>
                <button className="label-lg tabular" onClick={reset} style={{ minWidth: 52, background: "none", border: "none", color: "inherit", cursor: "pointer" }} aria-label="Về 100%">{Math.round(scale * 100)}%</button>
                <button className="m3-icon-btn" onClick={() => zoomTo(scale * 1.25)} aria-label="Phóng to" disabled={scale >= MAX}><Icon name="add" size={20} /></button>
                <button className="m3-icon-btn" onClick={reset} aria-label="Đặt lại"><Icon name="restart_alt" size={20} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
