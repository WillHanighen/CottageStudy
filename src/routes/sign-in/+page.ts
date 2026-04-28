import { env as publicEnv } from '$env/dynamic/public';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url, parent }) => {
	return parent().then((parentData) => ({
		turnstileSiteKey: publicEnv.PUBLIC_TURNSTILE_SITE_KEY ?? '',
		redirectTo: url.searchParams.get('redirect') ?? '/dashboard',
		clerkConfigured: parentData.clerkConfigured
	}));
};
