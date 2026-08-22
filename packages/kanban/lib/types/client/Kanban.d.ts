import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { KanbanFace } from './types.ts';
type Props = PropsRuntime<'sidebar.footer.action'> & InjectFace<KanbanFace>;
export declare function Kanban({ wide, useSessions, useWorkspaces, openSession, clearSession, createTask }: Props): import("react").JSX.Element;
export {};
