import { createApiResponse } from '../../api/_response.js';

const FALLBACK_IDENTITY_PROFILES = [
  {
    id: 'fallback-nexaeon',
    name: 'NexAeon',
    identityType: 'Digital Institute',
    shortPositioning: 'A living digital institute for research, learning, knowledge systems, and practice.',
    fullIntroduction: 'Fallback identity node used only when the Notion Identity Profiles source is unavailable.',
    corePhilosophy: 'AI should expand research judgment, learning design, and reflective practice.',
    roleTags: ['Digital Institute', 'Research System'],
    relatedModules: ['Identity', 'Knowledge System'],
    featured: true,
    displayOrder: 1,
    externalUrl: '',
    image: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-joey-research-identity',
    name: 'Joey Research Identity',
    identityType: 'Research Identity',
    shortPositioning: 'AI education researcher, learning coach, and system builder.',
    fullIntroduction: 'Fallback identity node preserving the Identity Profiles page during temporary backend issues.',
    corePhilosophy: 'Research becomes useful when it connects theory, classroom practice, and durable knowledge infrastructure.',
    roleTags: ['AI Education', 'Researcher'],
    relatedModules: ['Identity', 'Research'],
    featured: true,
    displayOrder: 2,
    externalUrl: '',
    image: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-nexaeon-navigator',
    name: 'NexAeon Navigator',
    identityType: 'AI Assistant',
    shortPositioning: 'A language mediator for research, teaching, and knowledge navigation.',
    fullIntroduction: 'Fallback identity node for the NexAeon Navigator assistant role.',
    corePhilosophy: 'The assistant should help people understand questions before rushing toward answers.',
    roleTags: ['NexAeon Navigator', 'AI Assistant'],
    relatedModules: ['Identity', 'Learning Coaching'],
    featured: false,
    displayOrder: 3,
    externalUrl: '',
    image: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-research-practice',
    name: 'Research × Practice',
    identityType: 'Research Role',
    shortPositioning: 'A bridge between doctoral inquiry, MVP experiments, and field learning.',
    fullIntroduction: 'Fallback identity node for the practical research bridge inside NexAeon.',
    corePhilosophy: 'Ideas become stronger when they are tested in learning, products, and field contexts.',
    roleTags: ['Practice', 'Field Experiment'],
    relatedModules: ['Research', 'Field Experiment'],
    featured: false,
    displayOrder: 4,
    externalUrl: '',
    image: null,
    createdAt: '',
    updatedAt: '',
  },
];

export function createFallbackIdentityProfilesResponse(reason = 'upstream_failed') {
  const items = FALLBACK_IDENTITY_PROFILES.map((item) => ({ ...item }));

  return createApiResponse({
    source: 'fallback',
    reason,
    items,
    extra: { meta: { module: 'identity' } },
  });
}
