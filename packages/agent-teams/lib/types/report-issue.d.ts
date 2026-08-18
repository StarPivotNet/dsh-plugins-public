/**
 * Captain-owned plugin feedback: file one GitHub issue per observed
 * AgentTeams defect so a later session can triage the fork.
 * @module dsh-agent-teams/report-issue
 */
/** Feedback category for a reported plugin defect. */
export type IssueKind = 'bug' | 'design_flaw' | 'inefficiency' | 'missing_capability';
/** Impact level used to triage which reports are worth iterating on. */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
/** Canonical repository that owns AgentTeams fork feedback. */
export declare const FEEDBACK_REPO = "Wuxie233/dsh-plugin-agent-teams";
/** Marker label applied to every report so collection runs can filter reliably. */
export declare const FEEDBACK_LABEL = "agent-teams-feedback";
/** Arguments accepted by the agent_teams_report_issue tool. */
export interface TeamReportIssueArgs {
    title: string;
    body: string;
    kind: IssueKind;
    severity?: IssueSeverity;
    trigger?: string;
    repro?: string;
    proposal?: string;
}
/** Captured subprocess result used by the injectable runner. */
export interface CommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}
/** Injectable subprocess runner — replaced with a stub in tests. */
export type RunFn = (args: string[]) => Promise<CommandResult>;
/**
 * Run a subprocess and capture stdout/stderr. Used only to talk to `gh`.
 * @param args - argv, first element is the executable.
 * @returns the process result, including spawn failures as exitCode 1.
 */
export declare function runCommand(args: string[]): Promise<CommandResult>;
/**
 * Render the issue body: fixed sections so collection runs can skim consistently.
 * @param args - reporter-supplied fields.
 * @param severity - resolved severity, including the default.
 * @param reportedBy - human-readable origin (`team \`name\`` or standalone).
 * @returns markdown body for `gh issue create`.
 */
export declare function buildIssueBody(args: TeamReportIssueArgs, severity: IssueSeverity, reportedBy: string): string;
/**
 * Decide whether this caller may file feedback and how to attribute it.
 * Members are rejected; captains and sessions with no team are allowed.
 * @param team - the caller's active team, if any.
 * @param callerId - the calling agent's session id.
 * @returns attribution written into the issue footer.
 */
export declare function reportIssueReporter(team: {
    captainSessionId: string;
    name: string;
} | undefined, callerId: string): string;
/** Structured result returned to the calling captain. */
export interface ReportIssueResult {
    url: string;
    repo: string;
    labels: string[];
    labelled: boolean;
}
/**
 * File one AgentTeams defect report as a GitHub issue on the fork tracker.
 * Callers must already have passed the captain-or-standalone authorization check.
 * @param args - validated tool arguments.
 * @param reportedBy - attribution string written into the issue footer.
 * @param run - subprocess runner, injectable in tests.
 * @returns the created issue URL and whether labels stuck.
 */
export declare function executeTeamReportIssue(args: TeamReportIssueArgs, reportedBy: string, run?: RunFn): Promise<ReportIssueResult>;
