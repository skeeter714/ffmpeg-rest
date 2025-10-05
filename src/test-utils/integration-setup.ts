import { GenericContainer, Wait, type StartedTestContainer, Network, type StartedNetwork } from 'testcontainers';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import path from 'path';

let redisContainer: StartedRedisContainer;
let appContainer: StartedTestContainer;
let network: StartedNetwork;
let apiUrl: string;

export async function setupIntegrationTests() {
  if (appContainer) {
    return { apiUrl, appContainer, redisContainer };
  }

  console.log('Creating network...');
  network = await new Network().start();

  console.log('Starting Redis container...');
  redisContainer = await new RedisContainer('redis:7.4-alpine')
    .withNetwork(network)
    .withNetworkAliases('redis')
    .start();

  console.log('Building application image...');
  const imageName = 'ffmpeg-rest-test';

  await GenericContainer.fromDockerfile(path.join(__dirname, '../..'))
    .withPlatform('linux/amd64')
    .build(imageName, { deleteOnExit: false });

  console.log('Starting application container...');
  appContainer = await new GenericContainer(imageName)
    .withNetwork(network)
    .withEnvironment({
      REDIS_URL: 'redis://redis:6379',
      STORAGE_MODE: 'stateless',
      NODE_ENV: 'test'
    })
    .withExposedPorts(3000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  apiUrl = `http://${appContainer.getHost()}:${appContainer.getMappedPort(3000)}`;
  console.log(`API available at: ${apiUrl}`);

  return { apiUrl, appContainer, redisContainer };
}

export async function teardownIntegrationTests() {
  await appContainer?.stop();
  await redisContainer?.stop();
  await network?.stop();
}

export function getApiUrl() {
  if (!apiUrl) {
    throw new Error('Integration tests not set up. Call setupIntegrationTests() first.');
  }
  return apiUrl;
}
