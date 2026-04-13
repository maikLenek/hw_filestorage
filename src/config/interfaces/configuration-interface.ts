export interface AppConfig {
  nodeEnv: string;
  port: number;
  redis: {
    host: string;
    port: number;
  };
  rabbitmq: {
    url: string;
    defaultUser: string;
    defaultPass: string;
  };
  hotStorage: {
    path: string;
  };
  minio: {
    endpoint: string;
    port: number;
    useSsl: boolean;
    accessKey: string;
    secretKey: string;
    archiveBucket: string;
  };
  archival: {
    afterSeconds: number;
    cronExpression: string;
  };
  upload: {
    maxSizeBytes: number;
  };
}
