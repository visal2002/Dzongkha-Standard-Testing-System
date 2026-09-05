/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
export const REQUIRED_PERMISSIONS = 'requiredPermissions';
export const REQUIRED_ANY_PERMISSIONS = 'requiredAnyPermissions';
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Requires the caller to hold **every** listed permission. */
export const Permissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);

/**
 * Requires the caller to hold **at least one** of the listed permissions.
 *
 * Some routes serve two audiences that the access matrix grants through different
 * permissions - a certificate holder reading their own record
 * (`certificate.view_own`) and an administrator reading anyone's
 * (`certificate.manage`). Declaring both with @Permissions would demand the caller
 * hold them together, which no role does, so the route would be unreachable. The
 * handler is still responsible for narrowing what each audience may see; on the
 * certificate routes that is CertificateService.getAuthorized().
 */
export const AnyPermissions = (...permissions: string[]) => SetMetadata(REQUIRED_ANY_PERMISSIONS, permissions);
