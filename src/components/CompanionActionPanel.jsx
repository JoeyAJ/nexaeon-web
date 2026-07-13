import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getCompanionActionPanelCopy } from '../lib/companionActionConfig.js';
import styles from './CompanionActionPanel.module.css';

export default function CompanionActionPanel({ actions, lang, motionLevel, onAction, onClose }) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ visibility: 'hidden' });
  const copy = getCompanionActionPanelCopy(lang);

  useEffect(() => {
    const panel = panelRef.current;
    const focusable = [...(panel?.querySelectorAll('button:not([disabled])') || [])];
    focusable[0]?.focus();

    const onPointerDown = (event) => {
      if (panel?.contains(event.target) || event.target?.closest?.('[data-testid="princess-interactive"]')) return;
      onClose({ returnFocus: false });
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose({ returnFocus: true });
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    let frame = 0;
    const positionPanel = () => {
      frame = 0;
      const panel = panelRef.current;
      const root = panel?.parentElement;
      if (!panel || !root) return;
      const rootRect = root.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const margin = 14;
      let viewportLeft = rootRect.left - panelRect.width - 10;
      if (viewportLeft < margin) viewportLeft = rootRect.right + 8;
      viewportLeft = Math.min(Math.max(margin, viewportLeft), window.innerWidth - panelRect.width - margin);
      const viewportTop = Math.min(
        Math.max(margin, rootRect.bottom - panelRect.height - rootRect.height * 0.18),
        window.innerHeight - panelRect.height - margin,
      );
      setPosition({ left: viewportLeft - rootRect.left, top: viewportTop - rootRect.top, right: 'auto', bottom: 'auto', visibility: 'visible' });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(positionPanel);
    };
    schedule();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
    };
  }, []);

  return (
    <section
      ref={panelRef}
      className={styles.panel}
      style={position}
      role="dialog"
      aria-modal="false"
      aria-label={copy.title}
      data-motion-level={motionLevel}
      data-testid="companion-action-panel"
    >
      <header className={styles.header}>
        <strong>{copy.title}</strong>
        <button type="button" aria-label={copy.close} onClick={() => onClose({ returnFocus: true })}>×</button>
      </header>
      <div className={styles.actions}>
        {actions.slice(0, 3).map((action) => (
          <button key={action.id} type="button" data-action-id={action.id} onClick={() => onAction(action)}>
            <span>{action.label}</span><span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}
