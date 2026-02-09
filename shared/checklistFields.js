export const DEFAULT_FORM_DATA = {
  propertyAddress: '',
  homesteadExemption: false,
  homesteadAmount: '',
  veteransExemption: false,
  veteransAmount: '',
  treeGrowthExemption: false,
  treeGrowthAmount: '',
  noExemptions: false,
  propertyDataCard: false,
  taxMap: false,
  dateVisited: '',
  currentZoning: '',
  floodZone: '',
  zoningOverlay: '',
  conformsToZoning: '',
  dwellingUnits: '',
  septicInShoreland: '',
  permitsDescription: '',
  codeEnforcementDocs: false,
  zoneOverlays: false,
  recordedSurvey: false,
  easements: false,
  associationDocs: false,
  associationFinancials: false,
  condoCertificate: false,
  septicDesign: false,
  completedBy: '',
  attachments: [],
};

export const CHECKLIST_STATUSES = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

export const STATUS_LABELS = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

export const STATUS_COLORS = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  archived: { bg: 'bg-red-100', text: 'text-red-700' },
};
