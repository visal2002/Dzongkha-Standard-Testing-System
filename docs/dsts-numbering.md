# DSTS registration numbers

New examination registrations receive a number immediately, including waitlisted registrations. The number uses Dzongkha letters and digits: `ཀ-༢༦-༠༠༡`. The counter is continuous: after `ཀ-༢༦-༡༠༠` comes `ཁ-༢༦-༡༠༡`. Every 100 numbers advances the letter; new allocation stops at 999.

The year is determined using Asia/Thimphu, resetting to the first letter and sequence each January. Released numbers are reused in ascending sequence before new numbers, but only in their original calendar year. Reuse remains possible after the 999 fresh-number limit is reached.

Marking any skill absent releases the application's number atomically with attendance. Its previous number remains in `releasedRegistrationNumber`, with assignment/release records in `registration.dsts_number_history`. Application IDs, identity records, scores and issued certificates are not transferred to the next holder.

Annual allocation is serialized by a database counter lock. Serializable registration transactions retry serialization conflicts and deadlocks up to three times. Existing submission idempotency protection remains in force.

Existing assigned numbers are preserved, not bulk-renumbered. Legacy numbers are not recycled. An older application without a number receives the new format when verified. New-format numbers render in all eight certificate boxes; legacy certificate output is preserved.

Migration: `0041_dzongkha_dsts_numbers.sql` must run on the registration database before deploying the registration service. The certificate service must also be updated for the eight-character PDF display.
