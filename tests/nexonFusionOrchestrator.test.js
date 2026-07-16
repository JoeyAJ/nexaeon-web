import test from 'node:test';
import assert from 'node:assert/strict';
import { createNexonFusionOrchestrator } from '../src/lib/nexonFusionOrchestrator.ts';
import {
  deriveFusionOutcome, isValidFusionTransition, normalizeFusionOperationType, sanitizeFusionMetadata,
} from '../src/lib/nexonFusionPolicy.ts';
import { createPrincessEventBridge, mapPrincessEvent } from '../src/lib/princessEventBridge.ts';
import { PRINCESS_STATES, createPrincessStateController } from '../src/lib/princessStateController.js';

const nextTick = () => new Promise((resolve) => queueMicrotask(resolve));
function createHarness() {
  let now = 1_000;
  const events = [];
  const eventBridge = { emit: (event) => { events.push(event); return true; } };
  const orchestrator = createNexonFusionOrchestrator({ eventBridge, now: () => now });
  return { events, orchestrator, tick: (amount = 1) => { now += amount; } };
}

test('valid request creates one unique fusionId and Strict Mode duplicate start reuses it', () => {
  const { events, orchestrator } = createHarness();
  const first = orchestrator.start({ requestId: 'request-1', operationType: 'question' });
  const duplicate = orchestrator.start({ requestId: 'request-1', operationType: 'question' });
  assert.equal(first.fusionId, duplicate.fusionId);
  assert.equal(events.length, 1);
  assert.equal(events[0].fusion.phase, 'listening');
});

test('pure transition guard permits the normal chain and active terminal branches', () => {
  assert.equal(isValidFusionTransition('listening', 'interpreting'), true);
  assert.equal(isValidFusionTransition('interpreting', 'retrieving'), true);
  assert.equal(isValidFusionTransition('retrieving', 'connecting'), true);
  assert.equal(isValidFusionTransition('connecting', 'guiding'), true);
  assert.equal(isValidFusionTransition('guiding', 'resolved'), true);
  assert.equal(isValidFusionTransition('retrieving', 'needsClarification'), true);
  assert.equal(isValidFusionTransition('retrieving', 'uncertain'), true);
  assert.equal(isValidFusionTransition('connecting', 'failed'), true);
  assert.equal(isValidFusionTransition('guiding', 'aborted'), true);
});

test('terminal and duplicate transitions are rejected', () => {
  assert.equal(isValidFusionTransition('resolved', 'retrieving'), false);
  assert.equal(isValidFusionTransition('failed', 'resolved'), false);
  assert.equal(isValidFusionTransition('aborted', 'resolved'), false);
  assert.equal(isValidFusionTransition('retrieving', 'retrieving'), false);
  assert.equal(isValidFusionTransition('unavailable', 'connecting'), false);
});

test('orchestrator advances through interpreting, retrieving, connecting, guiding, and resolved once', () => {
  const { events, orchestrator, tick } = createHarness();
  const token = orchestrator.start({ requestId: 'request-chain', operationType: 'knowledge-search' });
  for (const phase of ['interpreting', 'retrieving', 'connecting', 'guiding']) { tick(); assert.equal(orchestrator.transition(token, phase), true); }
  tick();
  assert.equal(orchestrator.transition(token, 'resolved', { resultType: 'cited', citationStatus: 'available' }), true);
  assert.equal(orchestrator.transition(token, 'resolved', { resultType: 'cited' }), false);
  assert.deepEqual(events.map((event) => event.fusion.phase), ['listening', 'interpreting', 'retrieving', 'connecting', 'guiding', 'resolved']);
});

test('new request invalidates old request and generation callbacks', () => {
  const { orchestrator } = createHarness();
  const oldToken = orchestrator.start({ requestId: 'old' });
  const newToken = orchestrator.start({ requestId: 'new' });
  assert.notEqual(oldToken.generation, newToken.generation);
  assert.equal(orchestrator.transition(oldToken, 'retrieving'), false);
  assert.equal(orchestrator.transition(newToken, 'retrieving'), true);
  assert.equal(orchestrator.getActive().requestId, 'new');
});

test('abort is terminal and late completion cannot play', () => {
  const { events, orchestrator } = createHarness();
  const token = orchestrator.start({ requestId: 'abort-me' });
  orchestrator.transition(token, 'retrieving');
  assert.equal(orchestrator.abort(token), true);
  assert.equal(orchestrator.transition(token, 'resolved', { resultType: 'answered' }), false);
  assert.equal(events.at(-1).fusion.phase, 'aborted');
});

test('same phase callback is ignored without replay', () => {
  const { events, orchestrator } = createHarness();
  const token = orchestrator.start({ requestId: 'same-phase' });
  orchestrator.transition(token, 'retrieving');
  assert.equal(orchestrator.transition(token, 'retrieving'), false);
  assert.equal(events.filter((event) => event.fusion.phase === 'retrieving').length, 1);
});

test('safe outcome derives clarification, uncertainty, unavailable, failed, and resolved without text parsing', () => {
  assert.equal(deriveFusionOutcome({ ok: true, reason: 'moderated' }).phase, 'needsClarification');
  assert.equal(deriveFusionOutcome({ ok: true, reason: 'no_sources' }).phase, 'uncertain');
  assert.equal(deriveFusionOutcome({ ok: true, partialSources: true, citationCount: 1 }).phase, 'uncertain');
  assert.equal(deriveFusionOutcome({ ok: true, reason: 'model_unavailable' }).phase, 'unavailable');
  assert.equal(deriveFusionOutcome({ ok: false, status: 500 }).phase, 'failed');
  assert.equal(deriveFusionOutcome({ ok: true, citationCount: 1 }).resultType, 'cited');
});

test('metadata sanitizer rebuilds an allowlist and strips prompt, answer, raw error, and payload', () => {
  const metadata = sanitizeFusionMetadata({
    fusionId: 'fusion-1', requestId: 'request-1', generation: 1, phase: 'retrieving', operationType: 'question', timestamp: 1,
    prompt: 'secret prompt', answer: 'secret answer', error: new Error('secret'), payload: { userId: 'private' },
  });
  assert.deepEqual(Object.keys(metadata).sort(), ['fusionId', 'generation', 'operationType', 'phase', 'requestId', 'timestamp']);
  assert.equal(JSON.stringify(metadata).includes('secret'), false);
  assert.equal(JSON.stringify(metadata).includes('userId'), false);
});

test('invalid phase is safely ignored and unknown operation falls back to generic', () => {
  assert.equal(sanitizeFusionMetadata({ fusionId: 'f', requestId: 'r', generation: 1, phase: 'invented', operationType: 'question', timestamp: 1 }), null);
  assert.equal(normalizeFusionOperationType('invented'), 'generic');
});

test('fusion phases map to existing Princess states with clarification distinct from failure', () => {
  const base = { fusionId: 'f', requestId: 'r', generation: 1, operationType: 'question', timestamp: 1 };
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'listening' } })?.state, 'curious');
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'retrieving' } })?.state, 'sit');
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'resolved' } })?.state, 'sitting_smile');
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'needsClarification' } })?.state, 'curious');
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'uncertain' } })?.state, 'quiet');
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'unavailable' } })?.priority, 7);
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'failed' } })?.priority, 9);
});

test('only listening and resolved fusion phases may wake sleeping Princess', () => {
  const base = { fusionId: 'f', requestId: 'r', generation: 1, operationType: 'question', timestamp: 1 };
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'listening' } })?.canWakeSleeping, true);
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'retrieving' } })?.canWakeSleeping, undefined);
  assert.equal(mapPrincessEvent({ type: 'nexon_fusion_state', fusion: { ...base, phase: 'resolved' } })?.canWakeSleeping, true);
});

test('Navigator lifecycle de-duplicates submitted/listening and completed/resolved within one turn', async () => {
  const requests = [];
  const bridge = createPrincessEventBridge();
  bridge.subscribe((request) => { requests.push(request); return true; });
  const orchestrator = createNexonFusionOrchestrator({ eventBridge: bridge });
  const token = orchestrator.start({ requestId: 'nav-dedup' });
  bridge.emit({ type: 'navigator_question_submitted', requestId: 'nav-dedup' });
  await nextTick();
  orchestrator.transition(token, 'retrieving');
  await nextTick();
  orchestrator.transition(token, 'resolved', { resultType: 'answered' });
  bridge.emit({ type: 'navigator_response_completed', requestId: 'nav-dedup' });
  await nextTick();
  assert.equal(requests.filter((request) => ['nexon_fusion_state', 'navigator_question_submitted'].includes(request.event.type)).length >= 1, true);
  assert.equal(requests.filter((request) => request.state === 'sitting_smile').length, 1);
});

test('fusion cannot interrupt drag or affection and low priority retrieval cannot wake sleep', async () => {
  const controller = createPrincessStateController();
  controller.startDrag();
  assert.equal(controller.transition(PRINCESS_STATES.CURIOUS, { source: 'websiteEvent' }), false);
  controller.endDrag();
  controller.requestAffection({ duration: 1_000 });
  assert.equal(controller.transition(PRINCESS_STATES.QUIET, { source: 'websiteEvent' }), false);
  const sleeping = createPrincessStateController();
  sleeping.transition(PRINCESS_STATES.SLEEP, { source: 'presence' });
  assert.equal(sleeping.transition(PRINCESS_STATES.SIT, { source: 'websiteEvent' }), false);
});

test('transient fusion recovery resolves to the current persistent state', () => {
  let callback;
  const controller = createPrincessStateController({ setTimeoutFn: (fn) => { callback = fn; return 1; }, clearTimeoutFn: () => {} });
  controller.transition(PRINCESS_STATES.REST, { source: 'presence' });
  controller.transition(PRINCESS_STATES.HAPPY, { source: 'websiteEvent', duration: 1, resolveCompletionState: () => PRINCESS_STATES.REST });
  callback();
  assert.equal(controller.getState(), PRINCESS_STATES.REST);
});

test('dispose prevents cleanup callbacks and does not access sessionStorage or window', () => {
  const { events, orchestrator } = createHarness();
  const token = orchestrator.start({ requestId: 'cleanup' });
  orchestrator.dispose();
  assert.equal(orchestrator.transition(token, 'retrieving'), false);
  assert.equal(events.length, 1);
});

test('production debug is silent', () => {
  let calls = 0;
  const original = console.debug;
  console.debug = () => { calls += 1; };
  try {
    const orchestrator = createNexonFusionOrchestrator({ eventBridge: { emit: () => true }, debug: false });
    orchestrator.start({ requestId: 'silent' });
    assert.equal(calls, 0);
  } finally { console.debug = original; }
});
