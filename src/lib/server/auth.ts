import type { AuthObject } from '@clerk/backend';

/**
 * svelte-clerk's withClerkHandler assigns `event.locals.auth` as a callable
 * `(options?) => AuthObject` rather than the AuthObject itself, even though
 * its TypeScript types claim otherwise. This helper handles both shapes so
 * route code can keep doing `getAuth(locals).userId` regardless of how
 * svelte-clerk evolves.
 */
export function getAuth(locals: App.Locals): AuthObject {
	const a = locals.auth as unknown;
	if (typeof a === 'function') {
		return (a as () => AuthObject)();
	}
	return a as AuthObject;
}
