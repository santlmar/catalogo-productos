export const APP_CONFIG = Symbol('AppConfig');

export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly serviceName: string;
}
