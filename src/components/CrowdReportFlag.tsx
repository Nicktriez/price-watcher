import { createSignal, For, Show } from "solid-js";
import { FLAG_REASONS, type FlagReason } from "~/lib/moderation";
import { flagCrowdReport } from "~/server/moderation";

export function CrowdReportFlag({ reportId }: { reportId: string }) {
  const [open, setOpen] = createSignal(false);
  const [reason, setReason] = createSignal<FlagReason>("wrong-price");
  const [result, setResult] = createSignal<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = createSignal(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy()) return;
    setBusy(true);
    try {
      const r = await flagCrowdReport(reportId, reason());
      setResult(
        r.ok
          ? {
              ok: true,
              msg: r.hidden
                ? "Reported — this price is now hidden."
                : "Reported — thanks for keeping prices honest.",
            }
          : { ok: false, msg: r.message },
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <span class="inline-flex items-center gap-1">
      <Show
        when={!result()}
        fallback={
          <span class={`text-xs ${result()!.ok ? "text-green-700" : "text-red-700"}`}>
            {result()!.msg}
          </span>
        }
      >
        <Show
          when={open()}
          fallback={
            <button
              type="button"
              onClick={() => setOpen(true)}
              class="text-xs text-gray-500 hover:text-red-700 hover:underline"
            >
              Report
            </button>
          }
        >
          <form onSubmit={submit} class="inline-flex items-center gap-1">
            <select
              value={reason()}
              onInput={(e) => setReason(e.currentTarget.value as FlagReason)}
              class="rounded border border-gray-300 px-1 py-0.5 text-xs"
            >
              <For each={FLAG_REASONS}>{(r) => <option value={r.value}>{r.label}</option>}</For>
            </select>
            <button
              type="submit"
              disabled={busy()}
              class="rounded bg-red-600 px-1.5 py-0.5 text-xs text-white disabled:opacity-50"
            >
              {busy() ? "…" : "Flag"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              class="text-xs text-gray-400 hover:underline"
            >
              Cancel
            </button>
          </form>
        </Show>
      </Show>
    </span>
  );
}
