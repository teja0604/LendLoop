import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Periodically processes pending outbox events and dispatches them to n8n webhook.
 * Runs every minute to guarantee reliable, asynchronous event delivery.
 */
crons.interval(
  "process-outbox-events",
  { minutes: 1 },
  internal.outbox.processOutboxBatch,
  {}
);

/**
 * Periodically scans for active overdue loans (Workflow D)
 * and records daily idempotent reminders in automationActivity.
 */
crons.interval(
  "scan-overdue-loans",
  { hours: 12 },
  internal.outbox.scanOverdueLoansAndRemind,
  {}
);

export default crons;
