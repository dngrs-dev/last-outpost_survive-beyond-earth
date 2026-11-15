import { useEffect, useRef, type ReactNode } from 'react';
import { ItemIcon } from './ItemIcon';
import type { ItemDefinition } from '../types/game';
import styles from '../pages/SetupPage.module.css';

export function PackingDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const target = dialog.current;
    if (target?.showModal) target.showModal();
    else target?.setAttribute('open', '');
    close.current?.focus();
    return () => {
      if (target?.open && target.close) target.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      <div className={styles.dialogHeading}>
        <h2>{title}</h2>
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
        >
          Close <span aria-hidden="true">&#215;</span>
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function ItemDetails({
  item,
  onClose,
}: {
  item: ItemDefinition;
  onClose: () => void;
}) {
  const unit = (
    {
      food: 'food',
      water: 'water',
      oxygen: 'oxygen',
      electricity: 'power',
    } as Record<string, string>
  )[item.resource];
  return (
    <PackingDialog title={item.name} onClose={onClose}>
      <div className={styles.itemHero}>
        <ItemIcon id={item.id} />
        <span>
          {item.category === 'maintenance'
            ? 'Repair supplies'
            : item.category === 'provisions'
              ? 'Station supplies'
              : 'Crew equipment'}
        </span>
      </div>
      <p className={styles.itemDescription}>{item.description}</p>
      <dl className={styles.itemFacts}>
        <div>
          <dt>Weight each</dt>
          <dd>{item.weight_kg} kg</dd>
        </div>
        <div>
          <dt>Space each</dt>
          <dd>{item.volume_l} L</dd>
        </div>
        <div>
          <dt>{unit ? 'Adds on arrival' : 'Pack size'}</dt>
          <dd>
            {item.resource_amount} {unit || item.unit}
            {unit ? ' units' : ''}
          </dd>
        </div>
        {item.max_quantity === 1 && (
          <div>
            <dt>Packing limit</dt>
            <dd>One per mission</dd>
          </div>
        )}
      </dl>
      {item.resource === 'electricity' && (
        <p className={styles.note}>
          Starting charge is limited by the outpost battery. Extra cells do not
          increase its capacity.
        </p>
      )}
      <p className={styles.note}>
        Fictional lunar equipment and game values, inspired by real engineering.
      </p>
      <a
        className={styles.source}
        href={item.inspiration_source}
        target="_blank"
        rel="noreferrer"
      >
        Equipment inspiration <span aria-hidden="true">&#8599;</span>
      </a>
    </PackingDialog>
  );
}
