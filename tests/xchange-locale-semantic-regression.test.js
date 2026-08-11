import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryAuditRepository } from '../lib/agent/auditRepository.js';
import { buildShadowQualityDiagnostic } from '../lib/agent/xchangeQualityDiagnostics.js';
import {
  applyExtractedRequirements,
  extractStructuredRequirements,
  generateCourseContent,
  validateStructuredContent,
} from '../lib/agent/xchangeStructuredContent.js';
import {
  AI_MARKETING_TOPIC_CONCEPTS,
  getSemanticTerms,
  matchMeasurableObjectiveVerb,
  matchSemanticConcept,
  normalizeLocale,
} from '../lib/agent/xchangeSemanticRegistry.js';
import { createXchangeDraftPreview, resetXchangePreviewStoreForTests } from '../lib/agent/xchangeWriteContract.js';

const CASES = Object.freeze({
  zh: Object.freeze({
    title: '生成式 AI 與行銷策略', audience: '大學生', languageValue: 'zh-TW',
    summary: '請建立給大學生的 90 分鐘「生成式 AI 與行銷策略」Workshop，使用繁體中文，包含學習目標、課程流程、小組活動、評量、AI 風險與倫理。',
  }),
  ko: Object.freeze({
    title: '생성형 AI와 마케팅 전략', audience: '대학생', languageValue: 'ko-KR',
    summary: '대학생을 대상으로 하는 90분 「생성형 AI와 마케팅 전략」수업 초안을 만들어 주세요. 한국어로 학습 목표, 수업 시간, 그룹 활동, 평가, 윤리와 위험을 포함해 주세요.',
  }),
  en: Object.freeze({
    title: 'Generative AI and Marketing Strategy', audience: 'University students', languageValue: 'en-US',
    summary: 'Create a 90 minute “Generative AI and Marketing Strategy” workshop in English for university students with learning objectives, a session plan, group activity, assessment, AI risks, and ethics.',
  }),
});

function fixture(locale) {
  const item = CASES[locale];
  const raw = {
    title: item.title, summary: item.summary, teachingCategory: 'Course', format: ['Workshop'],
    targetAudience: [item.audience], durationMinutes: 90, difficulty: 'Beginner', language: [item.languageValue], tags: ['AI', 'marketing'],
  };
  const requirements = extractStructuredRequirements('course', raw);
  const payload = applyExtractedRequirements('course', raw, requirements);
  const content = generateCourseContent(payload, requirements);
  const quality = validateStructuredContent('course', content, { requirements, sourcePrompt: item.summary });
  return { raw, payload, requirements, content, quality };
}

function checks(quality) {
  const diagnostic = buildShadowQualityDiagnostic(quality);
  return {
    topic: quality.topicRelevance.valid,
    objectives: !diagnostic.failedChecks.includes('ai_marketing_objectives') && !diagnostic.failedChecks.includes('learning_objective_verbs'),
    groupActivity: !diagnostic.failedChecks.includes('ai_marketing_group_activity'),
    assessment: !diagnostic.failedChecks.includes('assessment_structure') && !diagnostic.failedChecks.includes('ai_marketing_assessment'),
    risks: !diagnostic.failedChecks.includes('ai_risk_coverage'),
    genericTemplate: !diagnostic.failedChecks.includes('topic_specificity'),
  };
}

test('canonical semantic registry normalizes supported locale tags without cross-locale fallback', () => {
  assert.equal(normalizeLocale('zh-TW'), 'zh'); assert.equal(normalizeLocale('zh-CN'), 'zh');
  assert.equal(normalizeLocale('ko-KR'), 'ko'); assert.equal(normalizeLocale('en-US'), 'en'); assert.equal(normalizeLocale('en-GB'), 'en');
  assert.equal(matchSemanticConcept('受眾分析 提示詞 品牌語調', 'CUSTOMER_SEGMENTATION', 'ko').matched, false);
  assert.equal(matchSemanticConcept('고객 세분화와 프롬프트 설계', 'CUSTOMER_SEGMENTATION', 'ko').matched, true);
  assert.notDeepEqual(getSemanticTerms('GENERATIVE_AI', 'zh'), getSemanticTerms('GENERATIVE_AI', 'ko'));
});

test('zh, ko, and en 90-minute AI marketing rules candidates pass the same six quality checks', () => {
  for (const locale of ['zh', 'ko', 'en']) {
    const { requirements, content, quality } = fixture(locale);
    assert.equal(requirements.language, locale); assert.equal(requirements.durationMinutes, 90);
    assert.deepEqual(requirements.subjectConcepts, AI_MARKETING_TOPIC_CONCEPTS);
    assert.equal(content.sessionPlan.reduce((total, stage) => total + stage.durationMinutes, 0), 90);
    assert.match(quality.status, /^Complete/u, `${locale}: ${quality.errors.join('; ')}`);
    assert.deepEqual(checks(quality), { topic: true, objectives: true, groupActivity: true, assessment: true, risks: true, genericTemplate: true });
    assert.equal(quality.semanticDiagnostics.topic.matchedConcepts.length, 12);
    assert.equal(quality.semanticDiagnostics.topic.missingConcepts.length, 0);
  }
});

test('Korean measurable verbs accept safe lexical forms and reject non-observable objectives', () => {
  for (const objective of ['결과를 분석하다', '결과를 분석한다', '결과를 분석할 수 있다', '결과를 분석하도록 한다', '고객을 식별한다', '전략을 적용할 수 있다']) {
    assert.equal(matchMeasurableObjectiveVerb(objective, 'ko-KR').valid, true, objective);
  }
  for (const objective of ['생성형 AI 마케팅 이해', '마케팅 전략에 대한 지식', '브랜드 개념을 안다']) {
    assert.equal(matchMeasurableObjectiveVerb(objective, 'ko').valid, false, objective);
  }
});

test('Korean generic non-topic template fails topic relevance and generic-template rejection', () => {
  const { requirements, content } = fixture('ko');
  const generic = structuredClone(content);
  generic.overview.purpose = '문제를 정의하고 선택지를 제안하는 일반 수업입니다.';
  generic.learningObjectives = ['문제를 식별한다', '두 선택지를 비교한다', '일반 계획을 설계한다'];
  generic.learningOutcomes = ['문제, 선택지, 실행 단계를 담은 일반 계획서를 완성한다.'];
  generic.coreContent = [{ title: '일반 문제 해결', explanation: '문제를 정의하고 목표, 제약, 증거를 정리한 뒤 선택지를 제안합니다.', keyPoints: ['문제 정의', '선택지 제안', '실행'] }];
  generic.activities = [{ title: '일반 조별 활동', purpose: '일반 사례를 해결합니다.', durationMinutes: 40, groupFormat: '조별 활동', steps: ['읽기', '논의하기', '제출하기'], teacherGuidance: '절차를 안내합니다.', learnerOutput: '일반 계획서', completionCriteria: ['명확성'] }];
  generic.assessment = { method: '평가', criteria: ['명확성', '근거', '완성도'], feedbackMethod: '평가 기준에 따라 피드백합니다.' };
  generic.risksAndNotes = ['일반적인 오류를 확인한다.'];
  const diagnostic = buildShadowQualityDiagnostic(validateStructuredContent('course', generic, { requirements, sourcePrompt: '' }));
  assert.equal(diagnostic.failedChecks.includes('topic_relevance'), true);
  assert.equal(diagnostic.failedChecks.includes('topic_specificity'), true);
});

test('Korean assessment, group activity, risk, and measurable-objective omissions fail independently', () => {
  const mutations = [
    ['ai_marketing_assessment', (content) => { content.assessment = { method: '결과 검토', criteria: ['명확성', '완성도'], feedbackMethod: '기준에 따라 피드백한다.' }; }],
    ['ai_marketing_group_activity', (content) => { content.activities[0].groupFormat = '개인 활동'; }],
    ['ai_risk_coverage', (content) => { content.risksAndNotes = ['학습자는 최종 결과를 확인한다.']; }],
    ['learning_objective_verbs', (content) => { content.learningObjectives = ['생성형 AI 마케팅 개념 이해', '고객 세분화와 프롬프트 지식', '브랜드 보이스와 콘텐츠 생성 원리']; }],
  ];
  for (const [failedCheck, mutate] of mutations) {
    const { requirements, content } = fixture('ko'); mutate(content);
    const diagnostic = buildShadowQualityDiagnostic(validateStructuredContent('course', content, { requirements, sourcePrompt: '' }));
    assert.equal(diagnostic.failedChecks.includes(failedCheck), true, `${failedCheck}: ${diagnostic.failedChecks.join(', ')}`);
  }
});

test('locale=ko does not pass topic relevance from unrelated Chinese-only semantic keywords', () => {
  const { requirements, content } = fixture('ko');
  const leakage = structuredClone(content);
  leakage.overview.purpose = '受眾分析 內容生成 提示詞 品牌語調 行銷漏斗 顧客旅程 成效指標 AI 產出驗證 風險 倫理';
  leakage.learningObjectives = ['일반 문제를 식별한다', '두 선택지를 비교한다', '일반 계획을 설계한다'];
  leakage.learningOutcomes = ['일반 문제에 대한 선택 근거와 실행 단계를 담은 계획서를 완성한다.'];
  leakage.sessionPlan = leakage.sessionPlan.map((stage) => ({ ...stage, teacherActions: ['일반 사례를 안내하고 질문한다.'], learnerActions: ['일반 사례를 검토하고 기록한다.'], output: '일반 기록' }));
  leakage.coreContent = [{ title: '일반 내용', explanation: leakage.overview.purpose, keyPoints: ['문제 확인', '근거 확인', '결과 확인'] }];
  leakage.activities = [{ title: '일반 팀 활동', purpose: '일반 사례를 논의한다.', durationMinutes: 40, groupFormat: '팀 활동', steps: ['읽기', '논의', '제출'], teacherGuidance: '절차를 안내한다.', learnerOutput: '일반 기록', completionCriteria: ['완료'] }];
  leakage.assessment = { method: '결과 검토', criteria: ['명확성'], feedbackMethod: '피드백한다.' };
  leakage.resources = { teacherPreparation: ['사례'], learnerPreparation: ['질문'], materials: ['자료'], tools: ['종이'], contingencyPlan: '종이를 사용한다.' };
  leakage.risksAndNotes = ['일반 오류를 확인한다.'];
  leakage.extension = { followUpTask: '다른 사례를 검토한다.', reflectionQuestions: ['무엇을 바꿀까요?'] };
  const quality = validateStructuredContent('course', leakage, { requirements, sourcePrompt: '' });
  assert.equal(quality.topicRelevance.valid, false);
  for (const conceptId of ['CUSTOMER_SEGMENTATION', 'PROMPT_DESIGN', 'BRAND_VOICE', 'CUSTOMER_JOURNEY']) assert.equal(quality.topicRelevance.matchedConcepts.includes(conceptId), false);
});

test('CONTENT_VALIDATION_FAILED Failure Audit stores bounded locale semantic diagnostics with zero writes', async () => {
  resetXchangePreviewStoreForTests();
  const { raw, content } = fixture('ko');
  content.risksAndNotes = ['일반적인 결과를 확인한다.'];
  const auditRepository = createMemoryAuditRepository();
  const body = { agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials', draftType: 'course', language: 'ko', payload: raw, contractVersion: 'v1', schemaVersion: 'v1' };
  await assert.rejects(() => createXchangeDraftPreview({
    body, req: { headers: {} }, actor: { actorId: 'admin', role: 'admin', sessionId: 'session' }, auditRepository,
    env: { NEXAEON_TOOL_EXECUTION_SECRET: 'test-secret', NEXAEON_XCHANGE_MODEL_MODE: 'live', NEXAEON_MODEL_PROVIDER: 'openai', NEXAEON_MODEL_FALLBACK: 'none' },
    modelGateway: { structuredGenerate: async () => ({ output: content, metadata: { provider: 'openai', actualProvider: 'openai', requestedProvider: 'openai', model: 'test', requestId: 'test-request', fallbackUsed: false } }) },
  }), { code: 'CONTENT_VALIDATION_FAILED' });
  const [audit] = await auditRepository.listAuditRecords({ limit: 1 });
  assert.equal(audit.errorCode, 'CONTENT_VALIDATION_FAILED'); assert.equal(audit.sanitizedOutput.writesPerformed, 0);
  assert.equal(audit.sanitizedOutput.qualityDiagnostic.locale, 'ko');
  assert.equal(audit.sanitizedOutput.qualityDiagnostic.failedChecks.includes('ai_risk_coverage'), true);
  assert.equal(audit.sanitizedOutput.qualityDiagnostic.validatorVersion, 'locale-semantic-v1');
  assert.equal(JSON.stringify(audit).includes(raw.summary), false);
});
