/** Company percentages become stored rates only when a caller omits them. */
export function fetDefaults(
  input: { fetEnabled?: boolean; fetRate?: number },
  settings: { applyFetByDefault: boolean; defaultFetPercent: number },
) {
  return {
    fetEnabled: input.fetEnabled ?? settings.applyFetByDefault,
    fetRate: input.fetRate ?? settings.defaultFetPercent / 100,
  };
}
