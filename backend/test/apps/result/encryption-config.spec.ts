/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

describe('Result encryption configuration', () => {
  const developmentKey = 'uGvF2eOq8P0hRjD7V9wX4mN3yC1zA5tB6sYkM+LpI/c=';
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.resetModules();
  });

  const loadEntities = async (): Promise<void> => {
    await jest.isolateModulesAsync(async () => {
      await import('../../../apps/result-service/src/entities');
    });
  };

  it('rejects the committed development key in production by default', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DATA_ENCRYPTION_KEY = developmentKey;
    delete process.env.ALLOW_LEGACY_SCORE_ENCRYPTION_KEY;

    await expect(loadEntities()).rejects.toThrow(/deployment-specific 32-byte base64 key/);
  });

  it('allows the historical key only when staging explicitly opts in', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DATA_ENCRYPTION_KEY = developmentKey;
    process.env.ALLOW_LEGACY_SCORE_ENCRYPTION_KEY = 'true';

    await expect(loadEntities()).resolves.toBeUndefined();
  });
});
