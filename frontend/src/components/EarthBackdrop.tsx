import { useEffect, useRef, useState } from 'react';
import { createMoonRenderer } from './moonRenderer';
import styles from '../pages/StartPage.module.css';

// Illustrative time compression: 1 degree/second, one full turn in six minutes.
export const EARTH_DEGREES_PER_SECOND = 1;
const TEXTURE = '/images/title/earth-blue-marble.png';

export function EarthBackdrop({
  animate,
  onUnavailable,
}: {
  animate: boolean;
  onUnavailable: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const renderer = useRef<ReturnType<typeof createMoonRenderer> | null>(null);
  const longitude = useRef(-25);
  const [size, setSize] = useState(180);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);

  useEffect(() => {
    const target = container.current;
    if (!target || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) =>
      setSize(Math.max(1, Math.round(entry.contentRect.width)))
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const target = canvas.current;
    const unavailable = () => {
      if (cancelled) return;
      setFallback(true);
      setReady(false);
      onUnavailable();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      unavailable();
    };
    target?.addEventListener('webglcontextlost', contextLost);
    const image = new Image();
    image.onload = () => {
      if (cancelled || !canvas.current) return;
      try {
        renderer.current = createMoonRenderer(canvas.current, image);
        setReady(true);
      } catch {
        unavailable();
      }
    };
    image.onerror = unavailable;
    image.src = TEXTURE;
    return () => {
      cancelled = true;
      target?.removeEventListener('webglcontextlost', contextLost);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [onUnavailable]);

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (!ready || fallback || !visible) return;
    const pixels = Math.round(size * Math.min(window.devicePixelRatio || 1, 2));
    const draw = () =>
      renderer.current?.draw(
        { longitude: longitude.current, latitude: 12, zoom: 1.13 },
        pixels
      );
    draw();
    if (!animate) return;
    let frame = 0;
    let previous = performance.now();
    let lastDraw = previous;
    const tick = (now: number) => {
      longitude.current =
        (longitude.current +
          Math.min((now - previous) / 1000, 0.1) * EARTH_DEGREES_PER_SECOND) %
        360;
      previous = now;
      if (now - lastDraw >= 1000 / 30) {
        draw();
        lastDraw = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, ready, fallback, size, visible]);

  return (
    <div
      ref={container}
      className={styles.earth}
      aria-hidden="true"
      data-animated={animate && ready && visible && !fallback}
    >
      <div className={styles.atmosphere} />
      <canvas
        ref={canvas}
        className={styles.earthCanvas}
        style={{ opacity: ready && !fallback ? 1 : 0 }}
      />
      {(!ready || fallback) && <div className={styles.earthFallback} />}
    </div>
  );
}
