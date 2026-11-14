import { useEffect, useRef, useState } from 'react';
import type { MoonSite } from '../types/moon';
import { clamp, INITIAL_VIEW, surfaceLabels, type MoonView } from './moonProjection';
import { createMoonRenderer } from './moonRenderer';
import styles from '../pages/MoonPage.module.css';

interface Props { sites: MoonSite[]; selected: MoonSite; texture: string; onSelect: (id: string) => void }

export function MoonGlobe({ sites, selected, texture, onSelect }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const renderer = useRef<ReturnType<typeof createMoonRenderer> | null>(null);
  const drag = useRef<{ x: number; y: number; view: MoonView } | null>(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const [size, setSize] = useState(320);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const target = wrap.current;
    if (!target || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(Math.max(0, Math.floor(Math.min(width, height - 78))));
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false); setFallback(false);
    const target = canvas.current;
    const contextLost = (event: Event) => { event.preventDefault(); setFallback(true); };
    target?.addEventListener('webglcontextlost', contextLost);
    const image = new Image();
    image.onload = () => {
      if (cancelled || !canvas.current) return;
      try {
        renderer.current = createMoonRenderer(canvas.current, image);
        setReady(true);
      } catch { setFallback(true); }
    };
    image.onerror = () => { if (!cancelled) setFallback(true); };
    image.src = texture;
    return () => {
      cancelled = true;
      target?.removeEventListener('webglcontextlost', contextLost);
      renderer.current?.dispose(); renderer.current = null;
    };
  }, [texture]);

  useEffect(() => {
    renderer.current?.draw(view, Math.round(size * Math.min(window.devicePixelRatio || 1, 2)));
  }, [view, size, ready]);

  useEffect(() => {
    setView((previous) => ({ ...previous, longitude: selected.longitude, latitude: selected.latitude }));
  }, [selected.id, selected.longitude, selected.latitude]);

  const rotate = (longitude: number, latitude = 0) => setView((previous) => ({
    ...previous, longitude: previous.longitude + longitude, latitude: clamp(previous.latitude + latitude, -85, 85),
  }));
  const labels = surfaceLabels(sites, view, size);

  return <div className={styles.globeWrap} ref={wrap}>
    <div className={styles.stage} style={{ width: size, height: size }}>
      <div className={styles.axisLabel}>N</div>
      <canvas ref={canvas} className={styles.globe} role="img"
        aria-label={`Three-dimensional Moon, centered at ${view.latitude.toFixed(1)} degrees latitude and ${view.longitude.toFixed(1)} degrees longitude. Use rotation controls or the landing-site list to explore.`}
        onPointerDown={(event) => {
          if (fallback) return;
          drag.current = { x: event.clientX, y: event.clientY, view };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (start) setView({ ...start.view,
            longitude: start.view.longitude - (event.clientX - start.x) * 0.3,
            latitude: clamp(start.view.latitude + (event.clientY - start.y) * 0.3, -85, 85),
          });
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }} />
      {!fallback && <>
        <svg className={styles.leaders} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          {labels.map((point) => <g key={point.site.id}>
            <line x1={point.x} y1={point.y} x2={point.labelX} y2={point.labelY} />
            <circle cx={point.x} cy={point.y} r={point.site.id === selected.id ? 5 : 3} />
          </g>)}
        </svg>
        {labels.map((point) => <button type="button" key={point.site.id}
          className={`${styles.surfacePoint} ${point.site.id === selected.id ? styles.activePoint : ''}`}
          style={{ left: `${point.labelX / size * 100}%`, top: `${point.labelY / size * 100}%` }}
          aria-label={`Select ${point.site.name} landing site`} aria-pressed={point.site.id === selected.id}
          onClick={() => onSelect(point.site.id)}>{point.site.name.replace('Apollo ', 'A')}</button>)}
      </>}
      {!ready && !fallback && <p className={styles.globeMessage} role="status">Loading lunar surface…</p>}
      {fallback && <div className={styles.fallback}>
        <div className={styles.fallbackMoon} />
        <p>3D view unavailable. All landing sites and missions remain available in the list.</p>
      </div>}
    </div>
    <div className={styles.orbitControls} aria-label="Moon view controls">
      <button type="button" onClick={() => rotate(-20)} disabled={fallback} aria-label="Rotate Moon west">←</button>
      <button type="button" onClick={() => rotate(20)} disabled={fallback} aria-label="Rotate Moon east">→</button>
      <button type="button" onClick={() => rotate(0, 15)} disabled={fallback} aria-label="Tilt Moon north">↑</button>
      <button type="button" onClick={() => rotate(0, -15)} disabled={fallback} aria-label="Tilt Moon south">↓</button>
      <span className={styles.controlDivider} />
      <button type="button" onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom + 0.15, 0.7, 1.45) }))} disabled={fallback} aria-label="Zoom Moon in">+</button>
      <button type="button" onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom - 0.15, 0.7, 1.45) }))} disabled={fallback} aria-label="Zoom Moon out">−</button>
      <button type="button" onClick={() => setView(INITIAL_VIEW)} disabled={fallback}>Reset</button>
    </div>
    <p className={styles.globeHint}>Drag to rotate · Select a surface marker · North is up</p>
  </div>;
}
