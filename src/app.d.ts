// See https://svelte.dev/docs/kit/types#app.d.ts
// svelte-clerk assigns event.locals.auth as a callable that returns the
// AuthObject when invoked. The library's own d.ts lies about this and types
// it as the AuthObject directly. We reflect the runtime here so call sites
// don't silently read undefined fields off a function.
import type { AuthObject } from '@clerk/backend';

declare global {
	namespace App {
		interface Locals {
			auth: AuthObject | (() => AuthObject);
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
