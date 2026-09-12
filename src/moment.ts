import { moment as obsidianMoment } from 'obsidian';

/**
 * Minimal, explicitly typed view of the `moment` instance bundled with
 * Obsidian. Typing it here keeps call sites free of `any` even when the
 * `moment` type definitions are not resolvable (for example in the
 * community plugin review environment).
 */
export interface MomentLike {
	format(format: string): string;
	clone(): MomentLike;
	add(amount: number, unit: 'day'): MomentLike;
	subtract(amount: number, unit: 'day'): MomentLike;
}

interface MomentFactory {
	(input?: Date): MomentLike;
	locale(): string;
}

// Go through `unknown` so the cast is valid whether or not moment's own
// type definitions resolve.
const untyped: unknown = obsidianMoment;
export const moment = untyped as MomentFactory;
