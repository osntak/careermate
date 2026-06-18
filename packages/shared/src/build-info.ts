/**
 * Build-time constants injected by esbuild's `define` in the dist bundle
 * (scripts/build-dist.mjs): `__APP_VERSION__` = package.json version, and
 * `__BUNDLED__` = true inside the bundle. Under tsx/source runs they're
 * undefined, so the `typeof` guards fall back to dev defaults.
 *
 * Single source of truth so this idiom isn't copy-pasted across every
 * entrypoint (mcp/web/doctor) and package.
 *
 * MUST stay dependency-free and side-effect-free: @careermate/shared re-exports
 * it, so every shared consumer evaluates this module at import time. The
 * injected tokens are only ever read inside `typeof` guards (never bare), so
 * evaluation can't throw even where the define isn't applied.
 */
declare const __APP_VERSION__: string | undefined;
declare const __BUNDLED__: boolean | undefined;

/** App version: package.json version in the bundle, `0.0.0-dev` under source/tsx. */
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';

/** True only when running from the esbuild dist bundle (vs tsx source). */
export const BUNDLED: boolean = typeof __BUNDLED__ !== 'undefined' && __BUNDLED__;
