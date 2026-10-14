export type PageRoute =
  | 'landing'
  | 'workspace'
  | 'text-to-isl'
  | 'image-to-isl'
  | 'video-to-isl'
  | 'camera'
  | 'video-rec'
  | 'dashboard'
  | 'history'
  | 'saved'
  | 'vocabulary'
  | 'accessibility'
  | 'admin'
  | 'admin-vocabulary'
  | 'admin-datasets'
  | 'admin-audit'
  | 'help'
  | 'auth'
  | 'verify-reset';

export const ROUTE_HASH_MAP: Record<PageRoute, string> = {
  landing: '#/',
  workspace: '#/workspace',
  'text-to-isl': '#/text-to-isl',
  'image-to-isl': '#/image-to-isl',
  'video-to-isl': '#/video-to-isl',
  camera: '#/camera',
  'video-rec': '#/video-rec',
  dashboard: '#/dashboard',
  history: '#/history',
  saved: '#/saved',
  vocabulary: '#/vocabulary',
  accessibility: '#/accessibility',
  admin: '#/admin',
  'admin-vocabulary': '#/admin/vocabulary',
  'admin-datasets': '#/admin/datasets',
  'admin-audit': '#/admin/audit',
  help: '#/help',
  auth: '#/auth',
  'verify-reset': '#/verify-reset',
};

export function getRouteFromHash(hash: string): PageRoute {
  let cleanHash = hash.split('?')[0].toLowerCase();
  if (cleanHash.startsWith('#') && !cleanHash.startsWith('#/')) {
    cleanHash = '#/' + cleanHash.slice(1);
  }
  for (const [route, path] of Object.entries(ROUTE_HASH_MAP)) {
    if (path === cleanHash) {
      return route as PageRoute;
    }
  }
  if (cleanHash.startsWith('#/admin/vocabulary')) return 'admin-vocabulary';
  if (cleanHash.startsWith('#/admin/datasets')) return 'admin-datasets';
  if (cleanHash.startsWith('#/admin/audit')) return 'admin-audit';
  if (cleanHash.startsWith('#/admin')) return 'admin';
  return 'landing';
}
