import { AesGcmEncryptionTransformer } from '@dzongjuk/security';
import { certificateScoreValues } from '../../../apps/result-service/src/entities';

describe('certificate legacy score reads', () => {
 it('unwraps a legacy nested envelope without mutating the stored value', () => {
  const transformer = new AesGcmEncryptionTransformer(process.env.DATA_ENCRYPTION_KEY || 'uGvF2eOq8P0hRjD7V9wX4mN3yC1zA5tB6sYkM+LpI/c=');
  const scores = {WRITING:28, READING:36.5, LISTENING:33.5, SPEAKING:46.5};
  const encrypted = transformer.to(scores)!;
  expect(certificateScoreValues(encrypted)).toEqual(scores);
  expect(certificateScoreValues(transformer.from(transformer.to(encrypted)!))).toEqual(scores);
  expect(encrypted.startsWith('enc:v1:')).toBe(true);
 });
 it('rejects missing or invalid skills instead of inventing certificate marks', () => {
  expect(() => certificateScoreValues({WRITING:28})).toThrow('incomplete');
 });
});
