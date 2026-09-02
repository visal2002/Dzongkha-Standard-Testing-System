/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('./api', () => ({ default: { post } }));

import { applicationService } from './applications';

describe('applicationService DCRC lookup', () => {
  beforeEach(() => post.mockReset());

  it('sends the CID in the request body and unwraps the citizen profile', async () => {
    const profile = { cid: '10701000001', fullName: 'Karma Dorji', source: 'DCRC' };
    post.mockResolvedValue({ data: { success: true, data: profile } });

    await expect(applicationService.lookupCitizen(profile.cid)).resolves.toEqual(profile);
    expect(post).toHaveBeenCalledWith('/applications/citizen-lookup', { cid: profile.cid });
  });
});
