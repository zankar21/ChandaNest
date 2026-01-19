import fs from "node:fs";
import path from "node:path";

const RUN_STATE_PATH = path.resolve(process.cwd(), ".auth", "run-state.json");

export type RunState = {
  agencyId?: string;
  enterpriseId?: string;
  projectId?: string;
  itemId?: string;
  orgListingId?: string;
  publicPropertyId?: string;
};

export function loadRunState(): RunState {
  try {
    if (!fs.existsSync(RUN_STATE_PATH)) return {};
    const raw = fs.readFileSync(RUN_STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveRunState(state: RunState) {
  const dir = path.dirname(RUN_STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(state, null, 2));
}
