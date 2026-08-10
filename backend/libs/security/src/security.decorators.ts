/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
export const REQUIRED_PERMISSIONS = 'requiredPermissions';
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Permissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);
