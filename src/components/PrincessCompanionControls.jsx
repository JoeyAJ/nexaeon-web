import { useEffect, useRef, useState } from 'react';
import styles from './PrincessCompanionControls.module.css';

const COPY = {
  zh: {
    title: 'Princess Companion',
    open: '開啟 Companion 控制',
    close: '關閉',
    visible: '顯示 Princess',
    autoBehavior: '自動行為',
    interaction: '互動',
    interactionNote: '關閉互動後仍可拖曳。',
    resetPosition: '恢復位置',
    resetSize: '恢復大小',
    resetAll: '全部恢復預設',
    restored: '已恢復預設',
    on: '開啟',
    off: '關閉',
  },
  ko: {
    title: 'Princess Companion',
    open: 'Companion 컨트롤 열기',
    close: '닫기',
    visible: 'Princess 표시',
    autoBehavior: '자동 행동',
    interaction: '상호작용',
    interactionNote: '상호작용을 꺼도 드래그는 사용할 수 있습니다.',
    resetPosition: '위치 초기화',
    resetSize: '크기 초기화',
    resetAll: '모두 기본값으로',
    restored: '기본값으로 복원했습니다',
    on: '켜짐',
    off: '꺼짐',
  },
  en: {
    title: 'Princess Companion',
    open: 'Open Companion controls',
    close: 'Close',
    visible: 'Show Princess',
    autoBehavior: 'Automatic behavior',
    interaction: 'Interaction',
    interactionNote: 'Dragging remains available when interaction is off.',
    resetPosition: 'Reset position',
    resetSize: 'Reset size',
    resetAll: 'Reset all defaults',
    restored: 'Defaults restored',
    on: 'On',
    off: 'Off',
  },
};

function SettingSwitch({ checked, label, onChange, onLabel, offLabel }) {
  return (
    <button
      className={styles.switchRow}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <span className={styles.switchValue} data-enabled={checked ? 'true' : 'false'}>
        <span className={styles.switchTrack} aria-hidden="true"><span /></span>
        <span>{checked ? onLabel : offLabel}</span>
      </span>
    </button>
  );
}

export default function PrincessCompanionControls({
  lang = 'zh',
  settings,
  onSettingChange,
  onResetPosition,
  onResetSize,
  onResetAll,
}) {
  const copy = COPY[lang] || COPY.en;
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const runReset = (reset) => {
    reset();
    setFeedback(copy.restored);
  };

  return (
    <div className={styles.controlsRoot} data-testid="princess-controls">
      {isOpen ? (
        <section
          className={styles.panel}
          role="dialog"
          aria-label={copy.title}
          id="princess-companion-controls-panel"
        >
          <header className={styles.header}>
            <strong>{copy.title}</strong>
            <button
              className={styles.closeButton}
              type="button"
              aria-label={copy.close}
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </header>

          <div className={styles.switches}>
            <SettingSwitch
              checked={settings.visible}
              label={copy.visible}
              onChange={(value) => onSettingChange('visible', value)}
              onLabel={copy.on}
              offLabel={copy.off}
            />
            <SettingSwitch
              checked={settings.autoBehaviorEnabled}
              label={copy.autoBehavior}
              onChange={(value) => onSettingChange('autoBehaviorEnabled', value)}
              onLabel={copy.on}
              offLabel={copy.off}
            />
            <SettingSwitch
              checked={settings.interactionEnabled}
              label={copy.interaction}
              onChange={(value) => onSettingChange('interactionEnabled', value)}
              onLabel={copy.on}
              offLabel={copy.off}
            />
          </div>

          <p className={styles.note}>{copy.interactionNote}</p>

          <div className={styles.actions}>
            <button type="button" onClick={() => runReset(onResetPosition)}>{copy.resetPosition}</button>
            <button type="button" onClick={() => runReset(onResetSize)}>{copy.resetSize}</button>
            <button className={styles.resetAll} type="button" onClick={() => runReset(onResetAll)}>
              {copy.resetAll}
            </button>
          </div>

          <p className={styles.feedback} role="status" aria-live="polite">{feedback}</p>
        </section>
      ) : null}

      <button
        ref={triggerRef}
        data-princess-settings-trigger="true"
        className={styles.trigger}
        type="button"
        aria-label={copy.open}
        aria-expanded={isOpen}
        aria-controls="princess-companion-controls-panel"
        onClick={() => {
          setFeedback('');
          setIsOpen((current) => !current);
        }}
      >
        <span aria-hidden="true">⚙</span>
      </button>
    </div>
  );
}
