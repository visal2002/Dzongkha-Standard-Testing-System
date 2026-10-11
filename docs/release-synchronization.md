# Shared release

Release: **1.1.0** (11 October 2026, Bhutan time).

GitHub and GitLab carry the same complete application repository and `main` commit.
The GitLab project is named `backend`, but this mirror includes both frontend and
backend so it has exactly the same source history as GitHub. The initial GitLab
README remains recoverable in its original commit; no history is force-replaced.

Staging application images use the immutable `1.1.0` tag and OCI revision labels
identifying the shared source commit. Infrastructure images retain their own
upstream versions; they are not application releases.

Local QA outputs, temporary build directories, personal-data backups, credentials,
and environment files are excluded from source control. Existing staging database
data and uploaded media are retained.

For future releases: fetch both remotes, reconcile changes without force-pushing,
run tests and builds, set one VERSION and application image tag, commit and tag the
release, push the identical commit to both remotes, deploy images built from that
commit, then verify remote SHAs, running image digests and rollout health. Do not
claim synchronization based only on image tag names.
