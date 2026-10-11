# Smart passport photo uploader

The profile card and circular saved photograph remain unchanged. A replacement stays local until the user chooses Save Photo and the existing PUT /auth/profile request succeeds. Only the photo field is sent; the existing text storage column is reused. No database migration or account/role changes are required.

## Processing

- JPG/PNG and browser-decodable HEIC sources, up to 10 MiB, are inspected by file signature, decoded and automatically oriented.
- Native browser FaceDetector is optional. One detected face suggests a head-and-shoulders crop. Missing, unavailable, failed or ambiguous detection opens manual cropping rather than rejecting the photograph. Images are never sent to external AI services.
- react-easy-crop supplies fixed 7:9 cropping, pointer/touch gestures, keyboard arrows and a labelled zoom slider. Reset restores the suggested crop.
- Effective cropped image dimensions must be at least 350 x 450. Excessive zoom cannot turn a small crop into an accepted enlarged image.
- Canvas exports exactly 350 x 450 JPEG, strips original metadata, flattens transparency on white and checks the 3 MiB final limit. Clarity and brightness heuristics are advisory only.
- The server uses Sharp to decode actual contents, enforce JPEG/PNG consistency, reject malformed data, oversized payloads, animated content and insufficient-resolution/incorrect-proportion crops; auto-orients, normalizes and re-encodes without metadata. Processing has a pixel limit and timeout.

## Compatibility and limitations

Choose Photo works on desktop and mobile. Take Photo uses native capture on touch/mobile devices; actual camera availability and permissions are device/browser controlled. HEIC has a friendly JPG/camera fallback when the browser cannot decode it. Native face detection is not available in every browser and is not a biometric identity check. Lighting/clarity warnings are not definitive quality judgments.

## Dependencies and verification

Added react-easy-crop (frontend) and sharp (backend), with package lockfiles. Container builds must include Sharp's platform-specific optional packages; never copy Windows native packages into a Linux image.

Focused tests cover crop geometry, low resolution, exact output, metadata removal, orientation, spoofed MIME, malformed/header-only images, oversized payloads, preview/explicit save, cancel, failed-save retry and unchanged non-photo profile fields. Browser tests use synthetic fixtures and intercepted saves; no real user's profile is modified. They cover desktop/mobile layouts, landscape JPEG, portrait PNG, EXIF-rotated JPEG, unavailable/no/multiple-face detection, keyboard movement, zoom and Reset. Physical device camera capture and real HEIC decoding require browser/device-specific checks; those are not claimed as hardware-tested.
