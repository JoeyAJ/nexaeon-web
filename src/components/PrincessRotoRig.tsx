import { type CSSProperties, type ReactNode, useEffect, useId, useMemo, useRef } from 'react';
import { getPrincessRotoProfile, supportsPrincessMotion } from '../lib/princessRotoProfiles.js';
import styles from './PrincessRotoRig.module.css';

type Region = { cx: number; cy: number; rx: number; ry: number; rotate?: number };
type Props = { imageSrc: string; motionLevel: 'full' | 'reduced' | 'none'; autoBehaviorEnabled: boolean; active: boolean; accessory?: ReactNode };

const pct = (value: number, total: number) => value * total / 100;

function MaskEllipse({ region, width, height, scale = 1, fill = 'white' }: { region: Region; width: number; height: number; scale?: number; fill?: string }) {
  const cx = pct(region.cx, width); const cy = pct(region.cy, height);
  return <ellipse cx={cx} cy={cy} rx={pct(region.rx * scale, width)} ry={pct(region.ry * scale, height)} fill={fill} transform={`rotate(${region.rotate || 0} ${cx} ${cy})`} />;
}

export default function PrincessRotoRig({ imageSrc, motionLevel, autoBehaviorEnabled, active, accessory }: Props) {
  const profile = useMemo(() => getPrincessRotoProfile(imageSrc), [imageSrc]);
  const { width, height } = profile.sourceSize;
  const id = useId().replaceAll(':', '');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const headRef = useRef<SVGGElement | null>(null);
  const leftEarRef = useRef<SVGGElement | null>(null);
  const rightEarRef = useRef<SVGGElement | null>(null);
  const eyesRef = useRef<SVGGElement | null>(null);
  const tailRef = useRef<SVGGElement | null>(null);
  const accessoryRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const syncVisibility = () => { svg.dataset.rotoPaused = document.hidden || !active ? 'true' : 'false'; };
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, [active]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !active || motionLevel !== 'full' || matchMedia('(pointer: coarse)').matches) return undefined;
    const onPointerMove = (event: PointerEvent) => {
      const rect = svg.getBoundingClientRect(); const margin = Math.max(90, rect.width * 1.2);
      if (event.clientX < rect.left - margin || event.clientX > rect.right + margin || event.clientY < rect.top - margin || event.clientY > rect.bottom + margin) pointerRef.current = { x: 0, y: 0 };
      else pointerRef.current = { x: Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / margin)), y: Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / margin)) };
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => { frameRef.current = null; svg.style.setProperty('--roto-look-x', `${(pointerRef.current.x * 0.7).toFixed(2)}px`); svg.style.setProperty('--roto-look-y', `${(pointerRef.current.y * 0.42).toFixed(2)}px`); });
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onPointerMove); if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [active, motionLevel]);

  useEffect(() => {
    const clear = () => { timersRef.current.forEach(window.clearTimeout); timersRef.current = []; };
    clear();
    if (!active || motionLevel === 'none' || !autoBehaviorEnabled) return clear;
    let disposed = false; let earSide = Math.random() > 0.5;
    const later = (fn: () => void, min: number, max: number) => { const timer = window.setTimeout(() => { timersRef.current = timersRef.current.filter((item) => item !== timer); if (!disposed && !document.hidden) fn(); else if (!disposed) later(fn, min, max); }, min + Math.random() * (max - min)); timersRef.current.push(timer); };
    const blink = () => { const el = eyesRef.current; if (el && supportsPrincessMotion(profile, 'blink')) { const once = () => el.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)', offset: .48 }, { transform: 'scaleY(1)' }], { duration: 150, easing: 'ease-in-out' }); once(); if (Math.random() < .18) later(once, 170, 260); } later(blink, motionLevel === 'reduced' ? 6500 : 4000, motionLevel === 'reduced' ? 11000 : 9000); };
    const ear = () => { const el = (earSide = !earSide) ? leftEarRef.current : rightEarRef.current; el?.animate([{ transform: 'rotate(0)' }, { transform: `rotate(${earSide ? -2.6 : 2.6}deg)` }, { transform: 'rotate(0)' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.3,1)' }); later(ear, 5200, 11500); };
    const head = () => { const degrees = (Math.random() > .5 ? 1 : -1) * profile.headAmplitude; const options: KeyframeAnimationOptions = { duration: 1500, easing: 'ease-in-out' }; headRef.current?.animate([{ transform: 'rotate(0)' }, { transform: `rotate(${degrees}deg)` }, { transform: 'rotate(0)' }], options); accessoryRef.current?.animate([{ transform: 'rotate(0)' }, { transform: `rotate(${degrees}deg)` }, { transform: 'rotate(0)' }], options); later(head, 7200, 15000); };
    later(blink, 1800, 4300); if (motionLevel === 'full') { later(ear, 3200, 7600); later(head, 4800, 9200); }
    return () => { disposed = true; clear(); };
  }, [active, autoBehaviorEnabled, motionLevel, profile]);

  const r = profile.regions as Record<string, Region | undefined>;
  const eyeRegions = [r.leftEye, r.rightEye].filter(Boolean) as Region[];
  const style = { '--body-origin-x': `${profile.bodyAnchor.x}%`, '--body-origin-y': `${profile.bodyAnchor.y}%`, '--head-origin-x': `${profile.headAnchor.x}%`, '--head-origin-y': `${profile.headAnchor.y}%`, '--roto-breath-duration': profile.poseType === 'prone' ? '6.8s' : '4.4s' } as CSSProperties;
  const image = (mask: string, className?: string) => <image href={imageSrc} width={width} height={height} preserveAspectRatio="none" mask={`url(#${id}-${mask})`} className={className} />;

  return <>
    <svg ref={svgRef} className={styles.rig} style={style} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true" data-testid="princess-roto-rig" data-roto-profile={profile.imageKey}>
      <defs>
        <mask id={`${id}-body`} maskUnits="userSpaceOnUse"><rect width={width} height={height} fill="white" /><MaskEllipse region={r.head!} width={width} height={height} scale={0.88} fill="black" />{r.tail ? <MaskEllipse region={r.tail} width={width} height={height} scale={0.82} fill="black" /> : null}</mask>
        <mask id={`${id}-head`} maskUnits="userSpaceOnUse"><rect width={width} height={height} fill="black" /><MaskEllipse region={r.head!} width={width} height={height} scale={1.04} />{r.leftEar ? <MaskEllipse region={r.leftEar} width={width} height={height} scale={0.82} fill="black" /> : null}{r.rightEar ? <MaskEllipse region={r.rightEar} width={width} height={height} scale={0.82} fill="black" /> : null}{eyeRegions.map((region, index) => <MaskEllipse key={index} region={region} width={width} height={height} scale={0.78} fill="black" />)}</mask>
        {r.leftEar ? <mask id={`${id}-left-ear`} maskUnits="userSpaceOnUse"><MaskEllipse region={r.leftEar} width={width} height={height} scale={1.1} /></mask> : null}
        {r.rightEar ? <mask id={`${id}-right-ear`} maskUnits="userSpaceOnUse"><MaskEllipse region={r.rightEar} width={width} height={height} scale={1.1} /></mask> : null}
        <mask id={`${id}-eyes`} maskUnits="userSpaceOnUse">{eyeRegions.map((region, index) => <MaskEllipse key={index} region={region} width={width} height={height} scale={1.16} />)}</mask>
        <mask id={`${id}-muzzle`} maskUnits="userSpaceOnUse"><MaskEllipse region={r.muzzle!} width={width} height={height} scale={1.04} /></mask>
        {r.tail ? <mask id={`${id}-tail`} maskUnits="userSpaceOnUse"><MaskEllipse region={r.tail} width={width} height={height} scale={1.12} /></mask> : null}
      </defs>
      <g className={styles.body}>{image('body')}</g>
      <g className={styles.headLook}><g ref={headRef} className={styles.headMotion}>{image('head')}
        <g opacity=".96" transform={`translate(0 ${pct((r.leftEye?.ry || 3) * 1.4, height)})`}>{image('eyes')}</g>
        <g ref={eyesRef} className={styles.eyes}>{image('eyes')}</g>
        <g className={styles.muzzle}>{image('muzzle')}</g>
      </g></g>
      {r.leftEar ? <g ref={leftEarRef} className={styles.ear}>{image('left-ear')}</g> : null}
      {r.rightEar ? <g ref={rightEarRef} className={styles.ear}>{image('right-ear')}</g> : null}
      {r.tail ? <g ref={tailRef} className={styles.tail}>{image('tail')}</g> : null}
    </svg>
    {accessory ? <div ref={accessoryRef} className={styles.accessorySlot} style={style}>{accessory}</div> : null}
  </>;
}
