export type RuntimeEnv = Record<string, unknown> | undefined;

export const getRuntimeEnvValue = (env: RuntimeEnv, key: string): string | undefined => {
  const value = env?.[key];
  return typeof value === "string" ? value : undefined;
};

export const getEnvValue = (env: RuntimeEnv, key: string, fallback?: string): string | undefined =>
  getRuntimeEnvValue(env, key) ?? fallback;
