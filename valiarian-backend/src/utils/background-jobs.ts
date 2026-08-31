export const areBackgroundJobsEnabled = (): boolean =>
  process.env.NODE_ENV?.trim().toLowerCase() !== 'test' &&
  process.env.BACKGROUND_JOBS_ENABLED?.trim().toLowerCase() !== 'false';
