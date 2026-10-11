# Dzongjuk certificate branding

Default logo: frontend/public/images/dzongjuk-default.png and backend/apps/appeal-certificate-service/assets/dzongjuk-default.png. Copied unchanged from the user-provided New-logo.png.

Transparent seal: frontend/public/images/dzongjuk-seal-transparent.png and backend/apps/appeal-certificate-service/assets/dzongjuk-seal-transparent.png. Produced using the built-in image-generation edit tool, with alpha transparency, and visually checked in certificate previews.

Prompt used:
Use case: background-extraction. Edit target: the supplied official Dzongjuk logo. Produce a transparent PNG seal by removing ONLY all white background areas, including the white spaces inside the ornamental border and lettering. Preserve the exact dark brick-red colour, Tibetan lettering, border geometry, proportions and crisp edges. Do not redraw, change, add or omit any strokes or text. Genuine alpha transparency, no checkerboard, no shadows, no new content. This is an official certificate seal, exact identity preservation is essential.

The left header defaults to the new Dzongjuk logo. The right header retains the original government emblem from the certificate artwork unless explicitly overridden. Header logo overrides are drawn into the generated PDF. examinationSignatureImage belongs to Chief of Examination (left); existing signatureImage remains Chief Executive (right) for compatibility. The seal defaults to the transparent logo if no override was supplied.

Passport-photo originals are preserved. Automated portrait background removal is not enabled; transparent PNG uploads are supported.
