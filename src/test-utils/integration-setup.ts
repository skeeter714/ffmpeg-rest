import { GenericContainer, Wait, type StartedTestContainer, Network, type StartedNetwork } from 'testcontainers';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { LocalstackContainer, type StartedLocalStackContainer } from '@testcontainers/localstack';
import path from 'path';

let redisContainer: StartedRedisContainer;
let localstackContainer: StartedLocalStackContainer;
let appContainer: StartedTestContainer;
let network: StartedNetwork;
let apiUrl: string;

export async function setupIntegrationTests(options?: { s3Mode?: boolean }) {
  if (appContainer) {
    return { apiUrl, appContainer, redisContainer, localstackContainer };
  }

  console.log('Creating network...');
  network = await new Network().start();

  console.log('Starting Redis container...');
  redisContainer = await new RedisContainer('redis:7.4-alpine')
    .withNetwork(network)
    .withNetworkAliases('redis')
    .start();

  const environment: Record<string, string> = {
    REDIS_URL: 'redis://redis:6379',
    STORAGE_MODE: 'stateless',
    NODE_ENV: 'test'
  };

  if (options?.s3Mode) {
    console.log('Starting LocalStack container...');
    localstackContainer = await new LocalstackContainer('localstack/localstack:latest')
      .withNetwork(network)
      .withNetworkAliases('localstack')
      .start();

    environment['STORAGE_M  ODE'] = 's3';
    environment['S3_ENDPOINT'] = 'http://localstack:4566';
    environment['S3_REGION'] = 'us-east-1';
    environment['S3_BUCKET'] = 'test-ffmpeg-bucket';
    environment['S3_ACCESS_KEY_ID'] = 'test';
    environment['S3_SECRET_ACCESS_KEY'] = 'test';
    environment['S3_PATH_PREFIX'] = 'test-media';
  }

  console.log('Building application image...');
  const imageName = 'ffmpeg-rest-test';

  await GenericContainer.fromDockerfile(path.join(__dirname, '../..'))
    .withPlatform('linux/amd64')
    .build(imageName, { deleteOnExit: false });

  console.log('Starting application container...');
  appContainer = await new GenericContainer(imageName)
    .withNetwork(network)
    .withEnvironment(environment)
    .withExposedPorts(3000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  apiUrl = `http://${appContainer.getHost()}:${appContainer.getMappedPort(3000)}`;
  console.log(`API available at: ${apiUrl}`);

  return { apiUrl, appContainer, redisContainer, localstackContainer };
}

export async function teardownIntegrationTests() {
  await appContainer?.stop();
  await redisContainer?.stop();
  await localstackContainer?.stop();
  await network?.stop();
}

export function getApiUrl() {
  if (!apiUrl) {
    throw new Error('Integration tests not set up. Call setupIntegrationTests() first.');
  }
  return apiUrl;
}

export function getLocalStackContainer() {
  if (!localstackContainer) {
    throw new Error('LocalStack not available. Call setupIntegrationTests({ s3Mode: true }) first.');
  }
  return localstackContainer;
}
