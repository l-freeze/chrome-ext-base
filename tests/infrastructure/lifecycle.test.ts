import { expect, it } from "vitest";
import type { InstallDetails } from "../../src/infrastructure/lifecycle";
import { registerInstallTasks } from "../../src/infrastructure/lifecycle";

function installed() {
  let listener: ((details: unknown) => void) | undefined;
  return { event: { addListener: (l: typeof listener) => { listener = l; } }, fire: (details: unknown) => listener?.(details) };
}
const settle = () => new Promise((resolve) => setTimeout(resolve));

it("インストール・更新の理由を検証して全ての処理に渡し、一つの失敗で他を止めない", async () => {
  const event = installed();
  const runs: InstallDetails[] = [];
  const errors: unknown[] = [];
  const failure = new Error("Failed");
  registerInstallTasks(event.event as never, [
    { name: "fails", run: async () => { throw failure; } },
    { name: "records", run: async (details) => { runs.push(details); } },
  ], (error) => errors.push(error));
  event.fire({ reason: "install" });
  event.fire({ reason: "update", previousVersion: "1.0.0" });
  event.fire({ reason: "unknown" });
  await settle();
  expect(runs).toEqual([{ reason: "install", previousVersion: undefined }, { reason: "update", previousVersion: "1.0.0" }]);
  expect(errors).toEqual([failure, failure]);
});

it("名前の重複を拒否する", () => {
  const event = installed();
  const task = { name: "same", run: async () => {} };
  expect(() => registerInstallTasks(event.event as never, [task, task], () => {})).toThrow(TypeError);
});
