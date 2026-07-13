import { useEffect, useRef, useState } from 'react';
import styles from './PrincessCompanionControls.module.css';

const COPY = {
  zh: {
    title: 'Companion 設定', open: '開啟 Companion 設定', close: '關閉',
    visible: '顯示 Princess', autoBehavior: '自動行為', bubbles: '主動語境提示',
    accessories: '顯示配件', interaction: '允許互動', motion: '動畫強度', size: '大小',
    full: '完整', reduced: '簡化', none: '關閉動畫', resetLayout: '恢復位置與大小',
    resetAll: '全部恢復預設', resetConfirm: '確定要恢復所有 Companion 預設嗎？',
    restored: '已恢復預設', on: '開啟', off: '關閉',
  },
  ko: {
    title: 'Companion 설정', open: 'Companion 설정 열기', close: '닫기',
    visible: 'Princess 표시', autoBehavior: '자동 행동', bubbles: '상황 안내 말풍선',
    accessories: '액세서리 표시', interaction: '상호작용 허용', motion: '애니메이션 강도', size: '크기',
    full: '전체', reduced: '간소화', none: '애니메이션 끄기', resetLayout: '위치 및 크기 초기화',
    resetAll: '전체 기본값 복원', resetConfirm: 'Companion 설정을 모두 기본값으로 복원할까요?',
    restored: '기본값으로 복원했습니다', on: '켜짐', off: '꺼짐',
  },
  en: {
    title: 'Companion Settings', open: 'Open Companion settings', close: 'Close',
    visible: 'Show Princess', autoBehavior: 'Automatic behavior', bubbles: 'Proactive context bubbles',
    accessories: 'Show accessories', interaction: 'Allow interaction', motion: 'Motion level', size: 'Size',
    full: 'Full', reduced: 'Reduced', none: 'No animation', resetLayout: 'Reset position and size',
    resetAll: 'Restore all defaults', resetConfirm: 'Restore all Companion defaults?',
    restored: 'Defaults restored', on: 'On', off: 'Off',
  },
};

function SettingSwitch({ checked, label, onChange, onLabel, offLabel }) {
  return (
    <button className={styles.switchRow} type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <span className={styles.switchValue} data-enabled={checked ? 'true' : 'false'}>
        <span className={styles.switchTrack} aria-hidden="true"><span /></span>
        <span>{checked ? onLabel : offLabel}</span>
      </span>
    </button>
  );
}

export default function PrincessCompanionControls({ lang = 'zh', settings, onSettingChange, onResetLayout, onResetAll }) {
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

  const runReset = (reset, confirmFirst = false) => {
    if (confirmFirst && !window.confirm(copy.resetConfirm)) return;
    reset();
    setFeedback(copy.restored);
  };

  const switches = [
    ['visible', copy.visible],
    ['autoBehavior', copy.autoBehavior],
    ['proactiveBubbles', copy.bubbles],
    ['accessoriesEnabled', copy.accessories],
    ['interactionEnabled', copy.interaction],
  ];

  return (
    <div className={styles.controlsRoot} data-testid="princess-controls">
      {isOpen ? (
        <section className={styles.panel} role="dialog" aria-label={copy.title} id="princess-companion-controls-panel">
          <header className={styles.header}>
            <strong>{copy.title}</strong>
            <button className={styles.closeButton} type="button" aria-label={copy.close} onClick={() => setIsOpen(false)}>×</button>
          </header>

          <div className={styles.switches}>
            {switches.map(([key, label]) => (
              <SettingSwitch key={key} checked={settings[key]} label={label} onChange={(value) => onSettingChange(key, value)} onLabel={copy.on} offLabel={copy.off} />
            ))}
          </div>

          <fieldset className={styles.motionGroup}>
            <legend>{copy.motion}</legend>
            <div>
              {['full', 'reduced', 'none'].map((level) => (
                <label key={level} data-selected={settings.motionLevel === level ? 'true' : 'false'}>
                  <input type="radio" name="companion-motion-level" value={level} checked={settings.motionLevel === level} onChange={() => onSettingChange('motionLevel', level)} />
                  <span>{copy[level]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className={styles.scaleControl}>
            <span><span>{copy.size}</span><span>{Math.round(settings.scale * 100)}%</span></span>
            <input aria-label={copy.size} type="range" min="0.72" max="1.32" step="0.01" value={settings.scale} onChange={(event) => onSettingChange('scale', Number(event.target.value))} />
          </label>

          <div className={styles.actions}>
            <button type="button" onClick={() => runReset(onResetLayout)}>{copy.resetLayout}</button>
            <button className={styles.resetAll} type="button" onClick={() => runReset(onResetAll, true)}>{copy.resetAll}</button>
          </div>
          <p className={styles.feedback} role="status" aria-live="polite">{feedback}</p>
        </section>
      ) : null}

      <button ref={triggerRef} data-princess-settings-trigger="true" className={styles.trigger} type="button" aria-label={copy.open} aria-expanded={isOpen} aria-controls="princess-companion-controls-panel" onClick={() => { setFeedback(''); setIsOpen((current) => !current); }}>
        <span aria-hidden="true">⚙</span>
      </button>
    </div>
  );
}
