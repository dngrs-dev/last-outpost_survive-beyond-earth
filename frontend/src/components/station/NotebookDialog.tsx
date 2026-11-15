import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './NotebookDialog.module.css';

export function NotebookDialog({ title, subtitle, onClose, children, controls }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode; controls?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.showModal(); heading.current?.focus();
    return () => {
      element.close();
      if (previous?.isConnected) previous.focus();
      else document.querySelector<HTMLButtonElement>('[data-open-journal]')?.focus();
    };
  }, []);
  useEffect(() => { heading.current?.focus(); }, [title]);
  return <dialog className={styles.dialog} ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close.current(); }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]')].filter(element => !element.hidden && !element.closest('[hidden]'));
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className={styles.binding} aria-hidden="true" />
    <header className={styles.header}><div><small>{subtitle || 'OUTPOST FIELD JOURNAL'}</small><h1 id={titleId} ref={heading} tabIndex={-1}>{title}</h1></div>
      <button type="button" aria-label="Close notebook" onClick={onClose}>×</button></header>
    <div className={styles.page} aria-live="polite">{children}</div>
    <div className={styles.controls}>{controls || <button type="button" className="btn btn-primary" onClick={onClose}>Return to station</button>}</div>
  </dialog>;
}

export function PageTurns({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  return <div className={styles.turns} aria-label="Notebook pages">
    <button type="button" aria-label="Previous page" disabled={page <= 0} onClick={() => onChange(page - 1)}>‹</button>
    <span aria-live="polite">{page + 1} / {Math.max(1, count)}</span>
    <button type="button" aria-label="Next page" disabled={page >= count - 1} onClick={() => onChange(page + 1)}>›</button>
  </div>;
}

export function textPages(text: string, max = 210): string[] {
  const words = text.trim().split(/\s+/);
  const pages: string[] = [];
  let page = '';
  for (const word of words) {
    if (page && `${page} ${word}`.length > max) { pages.push(page); page = ''; }
    page += `${page ? ' ' : ''}${word}`;
  }
  if (page) pages.push(page);
  return pages.length ? pages : [''];
}
