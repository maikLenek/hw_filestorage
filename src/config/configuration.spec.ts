import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration, { configValidationSchema } from './configuration';

describe('Configuration', () => {
  let configService: ConfigService;

  beforeEach(async () => {
    // Set minimum required environment variables
    process.env.NODE_ENV = 'development';
    process.env.REDIS_HOST = 'redis-test';
    process.env.RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
    process.env.RABBITMQ_DEFAULT_USER = 'guest';
    process.env.RABBITMQ_DEFAULT_PASS = 'guest';
    process.env.HOT_STORAGE_PATH = '/tmp/hot';
    process.env.MINIO_ENDPOINT = 'minio-test';
    process.env.MINIO_ACCESS_KEY = 'minioadmin';
    process.env.MINIO_SECRET_KEY = 'minioadmin';
    process.env.ARCHIVE_AFTER_SECONDS = '86400';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should validate and return configuration when all required vars are present', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          validationSchema: configValidationSchema,
          validationOptions: { abortEarly: true },
          load: [configuration],
        }),
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    expect(configService.get('REDIS_HOST')).toBe('redis-test');
  });

  it('should throw when RABBITMQ_URL is missing', () => {
    delete process.env.RABBITMQ_URL;
    process.env.REDIS_HOST = 'redis';
    process.env.HOT_STORAGE_PATH = '/tmp/hot';
    process.env.MINIO_ENDPOINT = 'minio';
    process.env.MINIO_ACCESS_KEY = 'key';
    process.env.MINIO_SECRET_KEY = 'secret';
    process.env.ARCHIVE_AFTER_SECONDS = '86400';

    const { error } = configValidationSchema.validate(process.env);
    expect(error).toBeDefined();
    expect(error.message).toContain('RABBITMQ_URL');
  });

  it('should throw when ARCHIVE_AFTER_SECONDS is missing', () => {
    delete process.env.ARCHIVE_AFTER_SECONDS;
    process.env.RABBITMQ_DEFAULT_USER = 'u';
    process.env.RABBITMQ_DEFAULT_PASS = 'p';

    const { error } = configValidationSchema.validate(process.env);
    expect(error).toBeDefined();
    expect(error.message).toContain('ARCHIVE_AFTER_SECONDS');
  });

  it('should use default values when optional vars are missing', () => {
    delete process.env.PORT;
    delete process.env.REDIS_PORT;

    const { value } = configValidationSchema.validate(process.env);
    expect(value.PORT).toBe(3000);
    expect(value.REDIS_PORT).toBe(6379);
  });

  it('should reject invalid RABBITMQ_URL format', () => {
    process.env.RABBITMQ_URL = 'not-a-uri';

    const { error } = configValidationSchema.validate(process.env);
    expect(error).toBeDefined();
    expect(error.message).toContain('AMQP URI');
  });
});
