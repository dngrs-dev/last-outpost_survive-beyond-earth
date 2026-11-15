import { useEffect, useRef, useState } from 'react';
import type { MoonSite, OutpostOption } from '../types/moon';
import {
  clamp,
  INITIAL_VIEW,
  surfaceLabels,
  type MoonView,
} from './moonProjection';
import { createMoonRenderer } from './moonRenderer';
import styles from '../pages/MoonPage.module.css';

interface Props {
  options: OutpostOption[];
  selected: MoonSite;
  texture: string;
  onSelect: (id: string) => void;
}

export function MoonGlobe({ options, selected, texture, onSelect }: Props) {
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
      setSize(Math.max(0, Math.floor(Math.min(width, height))));
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setFallback(false);
    const target = canvas.current;
    const contextLost = (event: Event) => {
      event.preventDefault();
      setFallback(true);
    };
    target?.addEventListener('webglcontextlost', contextLost);
    const image = new Image();
    image.onload = () => {
      if (cancelled || !canvas.current) return;
      try {
        renderer.current = createMoonRenderer(canvas.current, image);
        setReady(true);
      } catch {
        setFallback(true);
      }
    };
    image.onerror = () => {
      if (!cancelled) setFallback(true);
    };
    image.src = texture;
    return () => {
      cancelled = true;
      target?.removeEventListener('webglcontextlost', contextLost);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [texture]);

  useEffect(() => {
    if (ready && !fallback && size > 0)
      renderer.current?.draw(
        view,
        Math.round(size * Math.min(window.devicePixelRatio || 1, 2))
      );
  }, [view, size, ready, fallback]);

  useEffect(() => {
    setView((previous) => ({
      ...previous,
      longitude: selected.longitude,
      latitude: selected.latitude,
    }));
  }, [selected.id, selected.longitude, selected.latitude]);

  const rotate = (longitude: number, latitude = 0) =>
    setView((previous) => ({
      ...previous,
      longitude: previous.longitude + longitude,
      latitude: clamp(previous.latitude + latitude, -85, 85),
    }));
  const labels =
    size > 0
      ? surfaceLabels(
          options.map((option) => option.site),
          view,
          size
        )
      : [];
  const recenter = () =>
    setView({
      ...INITIAL_VIEW,
      longitude: selected.longitude,
      latitude: selected.latitude,
    });

  return (
    <div className={styles.globeWrap} ref={wrap}>
      <div className={styles.stage} style={{ width: size, height: size }}>
        <canvas
          ref={canvas}
          className={styles.globe}
          role="img"
          tabIndex={0}
          aria-label={`Moon map, ${selected.name} selected. Arrow keys rotate; plus and minus zoom; Home returns to your outpost.`}
          onKeyDown={(event) => {
            if (fallback) return;
            if (event.key === 'ArrowLeft') rotate(-15);
            else if (event.key === 'ArrowRight') rotate(15);
            else if (event.key === 'ArrowUp') rotate(0, 15);
            else if (event.key === 'ArrowDown') rotate(0, -15);
            else if (event.key === '+' || event.key === '=')
              setView((v) => ({ ...v, zoom: clamp(v.zoom + 0.15, 0.7, 1.3) }));
            else if (event.key === '-')
              setView((v) => ({ ...v, zoom: clamp(v.zoom - 0.15, 0.7, 1.3) }));
            else if (event.key === 'Home') recenter();
            else return;
            event.preventDefault();
          }}
          onPointerDown={(event) => {
            if (fallback) return;
            drag.current = { x: event.clientX, y: event.clientY, view };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (start)
              setView({
                ...start.view,
                longitude:
                  start.view.longitude - (event.clientX - start.x) * 0.3,
                latitude: clamp(
                  start.view.latitude + (event.clientY - start.y) * 0.3,
                  -85,
                  85
                ),
              });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        />
        <>
          <svg
            className={styles.leaders}
            viewBox={`0 0 ${size} ${size}`}
            aria-hidden="true"
          >
            {labels.map((point) => (
              <g
                key={point.site.id}
                data-selected={point.site.id === selected.id}
              >
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={point.labelX}
                  y2={point.labelY}
                />
                <circle
                  data-site={point.site.id}
                  cx={point.x}
                  cy={point.y}
                  r={point.site.id === selected.id ? 5 : 3}
                  onClick={() => onSelect(point.site.id)}
                />
              </g>
            ))}
          </svg>
          {labels.map((point) => {
            const option = options.find((o) => o.site.id === point.site.id)!;
            const active = point.site.id === selected.id;
            const name = option.station.name
              .replace('Station ', '')
              .replace(' Outpost', '')
              .split(' \u2014')[0];
            return (
              <button
                type="button"
                key={point.site.id}
                className={`${styles.surfacePoint} ${active ? styles.activePoint : ''}`}
                style={{
                  left: `${(point.labelX / size) * 100}%`,
                  top: `${(point.labelY / size) * 100}%`,
                }}
                aria-label={`Choose ${name} mission, ${option.mission.duration_weeks} weeks`}
                aria-pressed={active}
                onClick={() => onSelect(point.site.id)}
              >
                <span className={styles.markerIcon} aria-hidden="true">
                  {active ? '\u2691' : '+'}
                </span>
                <span>
                  {name}
                  {active && (
                    <small>{option.mission.duration_weeks}-week mission</small>
                  )}
                </span>
              </button>
            );
          })}
        </>
        {!ready && !fallback && (
          <p className={styles.globeMessage} role="status">
            Preparing your Moon…
          </p>
        )}
        {fallback && (
          <div className={styles.fallback}>
            <div className={styles.fallbackMoon} aria-hidden="true" />
            <p>Simple Moon view. Every mission is still playable.</p>
          </div>
        )}
      </div>
      <div className={styles.orbitControls} aria-label="Moon view controls">
        <button
          type="button"
          onClick={() => rotate(-20)}
          disabled={fallback}
          aria-label="Rotate Moon west"
          title="Rotate left"
        >
          {'\u21b6'}
        </button>
        <button
          type="button"
          onClick={() => rotate(20)}
          disabled={fallback}
          aria-label="Rotate Moon east"
          title="Rotate right"
        >
          {'\u21b7'}
        </button>
        <button
          type="button"
          onClick={() =>
            setView((v) => ({ ...v, zoom: clamp(v.zoom + 0.15, 0.7, 1.3) }))
          }
          disabled={fallback}
          aria-label="Zoom Moon in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() =>
            setView((v) => ({ ...v, zoom: clamp(v.zoom - 0.15, 0.7, 1.3) }))
          }
          disabled={fallback}
          aria-label="Zoom Moon out"
        >
          {'\u2212'}
        </button>
        <button
          type="button"
          onClick={recenter}
          aria-label="Find selected outpost"
          title="Find your outpost"
        >
          {'\u25ce'}
        </button>
      </div>
    </div>
  );
}
