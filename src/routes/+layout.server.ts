import { buildClerkProps } from 'svelte-clerk/server';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { getAuth } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

const clerkConfigured =
	/^pk_(test|live)_[A-Za-z0-9+/=_-]{16,}$/.test(publicEnv.PUBLIC_CLERK_PUBLISHABLE_KEY ?? '') &&
	/^sk_(test|live)_[A-Za-z0-9+/=_-]{16,}$/.test(privateEnv.CLERK_SECRET_KEY ?? '');

export const load: LayoutServerLoad = ({ locals }) => {
	if (!clerkConfigured) {
		return {
			clerkConfigured: false as const,
			initialState: undefined,
			publishableKey: ''
		};
	}
	return {
		clerkConfigured: true as const,
		publishableKey: publicEnv.PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
		...buildClerkProps(getAuth(locals))
	};
};
