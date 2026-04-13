import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

// Export configuration namespace
export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    defaultUser: process.env.RABBITMQ_DEFAULT_USER,
    defaultPass: process.env.RABBITMQ_DEFAULT_PASS,
  },
  hotStorage: {
    path: process.env.HOT_STORAGE_PATH,
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSsl: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    archiveBucket: process.env.MINIO_ARCHIVE_BUCKET || 'filestorage-archive',
  },
  archival: {
    afterSeconds: parseInt(process.env.ARCHIVE_AFTER_SECONDS || '604800', 10),
    cronExpression: process.env.ARCHIVAL_CRON || '0 * * * * *',
  },
  upload: {
    maxSizeBytes: parseInt(
      process.env.UPLOAD_MAX_SIZE_BYTES || '104857600',
      10,
    ),
  },
}));

// Joi validation schema - applied globally in AppModule
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Redis — Required
  REDIS_HOST: Joi.string().required().messages({
    'any.required':
      'REDIS_HOST is required. Set it to "filestorage_redis" for Docker Compose.',
  }),
  REDIS_PORT: Joi.number().default(6379),

  // RabbitMQ — Required
  RABBITMQ_URL: Joi.string().uri().required().messages({
    'any.required':
      'RABBITMQ_URL is required (e.g., "amqp://user:pass@host:5672")',
    'string.uri': 'RABBITMQ_URL must be a valid AMQP URI',
  }),
  RABBITMQ_DEFAULT_USER: Joi.string().required().messages({
    'any.required': 'RABBITMQ_DEFAULT_USER is required',
  }),
  RABBITMQ_DEFAULT_PASS: Joi.string().required().messages({
    'any.required': 'RABBITMQ_DEFAULT_PASS is required',
  }),

  // Hot Storage — Required
  HOT_STORAGE_PATH: Joi.string().required().messages({
    'any.required':
      'HOT_STORAGE_PATH is required (e.g., "/hot-storage" in Docker)',
  }),

  // MinIO — Required
  MINIO_ENDPOINT: Joi.string().required().messages({
    'any.required': 'MINIO_ENDPOINT is required (e.g., "filestorage_minio")',
  }),
  MINIO_PORT: Joi.number().default(9000),
  MINIO_USE_SSL: Joi.string().valid('true', 'false').default('false'),
  MINIO_ACCESS_KEY: Joi.string().required().messages({
    'any.required': 'MINIO_ACCESS_KEY is required',
  }),
  MINIO_SECRET_KEY: Joi.string().required().messages({
    'any.required': 'MINIO_SECRET_KEY is required',
  }),
  MINIO_ARCHIVE_BUCKET: Joi.string().default('filestorage-archive'),

  // Archival Policy — Required
  ARCHIVE_AFTER_SECONDS: Joi.number().required().messages({
    'any.required':
      'ARCHIVE_AFTER_SECONDS is required (e.g., 604800 for 7 days)',
  }),

  // Archival Cron — Optional
  ARCHIVAL_CRON: Joi.string().default('0 * * * * *'),

  // Upload limits — Optional
  UPLOAD_MAX_SIZE_BYTES: Joi.number().default(104857600), // 100 MB
}).unknown(true); // Allow extra env vars not defined in schema
