import type { Context } from '@deepseek-ai/cordis';
/** Host half: persist column overrides and serve them to every browser. */
export declare const name = "@starpivot/dsh-kanban";
export declare const inject: string[];
/** Same-origin route both halves use. */
export declare const COLUMNS_ROUTE = "/plugins/@starpivot/dsh-kanban/columns";
/** Register the columns file + HTTP surface when a web server appears. */
export declare function apply(ctx: Context): void;
