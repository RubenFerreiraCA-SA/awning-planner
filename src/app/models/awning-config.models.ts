export type EdgeRole = 'wall' | 'gutter' | 'open-side' | 'unassigned';

export interface AwningConfig {
  edgeRoles: Record<string, EdgeRole>;
  purlinCountOverride: number | null;
  /** Edge the water drains toward. null = auto-detect from gutter role. */
  fallToEdgeId: string | null;
}

export const DEFAULT_AWNING_CONFIG: AwningConfig = {
  edgeRoles: {},
  purlinCountOverride: null,
  fallToEdgeId: null,
};
