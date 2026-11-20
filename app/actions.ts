"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import * as data from "@/lib/data";

export type ActionResult = { ok: boolean; message: string };

const ID = /^[A-Za-z0-9_-]{1,64}$/;

async function run(fn: () => Promise<string>): Promise<ActionResult> {
  try {
    await requireUser();
    const message = await fn();
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function pauseWorkflow(id: string) {
  return run(async () => {
    if (!ID.test(id)) throw new Error("Bad workflow id.");
    await data.pause(id);
    return "Paused. It won't run until you resume it.";
  });
}

export async function resumeWorkflow(id: string) {
  return run(async () => {
    if (!ID.test(id)) throw new Error("Bad workflow id.");
    const v = await data.resume(id);
    return `Live again on “${v}”.`;
  });
}

export async function retryRun(id: string) {
  return run(async () => {
    if (!/^\d+$/.test(id)) throw new Error("Bad run id.");
    await data.retry(id);
    return "Retry started.";
  });
}

export async function stopRun(id: string) {
  return run(async () => {
    if (!/^\d+$/.test(id)) throw new Error("Bad run id.");
    await data.stop(id);
    return "Stop sent.";
  });
}

export async function decideApproval(sourceId: string, rowId: number, decision: "approve" | "reject") {
  return run(async () => {
    if (!ID.test(sourceId) || !Number.isInteger(rowId)) throw new Error("Bad item.");
    if (decision !== "approve" && decision !== "reject") throw new Error("Bad decision.");
    await data.decide(sourceId, rowId, decision);
    return decision === "approve" ? "Approved." : "Sent back for changes.";
  });
}

export async function toggleTodo(id: number, done: boolean) {
  return run(async () => {
    if (!Number.isInteger(id) || typeof done !== "boolean") throw new Error("Bad item.");
    await data.setTodo(id, done);
    return done ? "Marked done." : "Back on the list.";
  });
}

export async function addTodo(title: string, note: string) {
  try {
    const user = await requireUser();
    const t = String(title ?? "").trim().slice(0, 200);
    const n = String(note ?? "").trim().slice(0, 2000);
    if (!t) throw new Error("Give it a title.");
    await data.addTodo(t, n, user.name.split(" ")[0] || user.email);
    revalidatePath("/", "layout");
    return { ok: true, message: "Added." } as ActionResult;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Something went wrong." } as ActionResult;
  }
}
