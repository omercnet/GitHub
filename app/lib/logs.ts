// Log streaming & processing helpers
import { LogChunk } from "./actions-types";

export interface StreamState {
  chunk: LogChunk | null;
  lastPoll: number | null;
  cyclesWithoutGrowth: number;
  isComplete: boolean;
}

export function initStreamState(): StreamState {
  return {
    chunk: null,
    lastPoll: null,
    cyclesWithoutGrowth: 0,
    isComplete: false,
  };
}

export function updateStreamState(
  prev: StreamState,
  next: LogChunk
): StreamState {
  const grew = !prev.chunk || next.totalLength > prev.chunk.totalLength;
  return {
    chunk: next,
    lastPoll: Date.now(),
    cyclesWithoutGrowth: grew ? 0 : prev.cyclesWithoutGrowth + 1,
    isComplete: !!next.isComplete,
  };
}

// Tokenize into lines once for virtualization
export function toLines(content: string): string[] {
  return content === "" ? [] : content.split(/\n/);
}

// Highlight search term (simple case-insensitive)
export function highlightLine(line: string, term: string): string {
  if (!term) return line;
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, (r) => `\\${r}`);
  const re = new RegExp(esc, "ig");
  return line.replace(re, (m) => `<<HIGHLIGHT:${m}>>`);
}
