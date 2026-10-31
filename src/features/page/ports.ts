import type { PageInfo } from "./page";

export interface PageActions { capture(input: unknown): Promise<PageInfo> }
export interface PageReader { read(input: { includeSelection: boolean }): Promise<PageInfo> }
export interface CapturePreferences { load(): Promise<{ includeSelection: boolean }> }
