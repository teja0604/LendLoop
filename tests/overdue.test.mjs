import assert from "node:assert/strict";
import { isOverdue, doIntervalsOverlap } from "../convex/dateUtils.ts";

console.log("Running Overdue and Date Boundary Tests...\n");

const today = "2026-11-05";
const yesterday = "2026-11-04";
const tomorrow = "2026-11-06";

// Helper representing loan overdue calculation in convex/loans.ts
function checkLoanOverdue(status, dueDate, referenceToday = today) {
  return status === "active" && isOverdue(dueDate, referenceToday);
}

// Test 1: Active loan with dueDate yesterday → overdue
{
  const result = checkLoanOverdue("active", yesterday, today);
  assert.equal(result, true, "Active loan with dueDate yesterday must be overdue");
  console.log("✔ Test 1 Passed: Active loan with dueDate yesterday (" + yesterday + ") is overdue.");
}

// Test 2: Active loan with dueDate today → overdue (exclusive boundary reached)
{
  const result = checkLoanOverdue("active", today, today);
  assert.equal(result, true, "Active loan with dueDate today must be overdue on exclusive boundary");
  console.log("✔ Test 2 Passed: Active loan with dueDate today (" + today + ") is overdue on boundary.");
}

// Test 3: Active loan with dueDate tomorrow → not overdue
{
  const result = checkLoanOverdue("active", tomorrow, today);
  assert.equal(result, false, "Active loan with dueDate tomorrow must not be overdue");
  console.log("✔ Test 3 Passed: Active loan with dueDate tomorrow (" + tomorrow + ") is NOT overdue.");
}

// Test 4: Returned loan with dueDate yesterday → not overdue
{
  const result = checkLoanOverdue("returned", yesterday, today);
  assert.equal(result, false, "Returned loan must never be overdue regardless of dueDate");
  console.log("✔ Test 4 Passed: Returned loan with dueDate yesterday (" + yesterday + ") is NOT overdue.");
}

// Test 5: Returned loan with dueDate today → not overdue
{
  const result = checkLoanOverdue("returned", today, today);
  assert.equal(result, false, "Returned loan must never be overdue");
  console.log("✔ Test 5 Passed: Returned loan with dueDate today is NOT overdue.");
}

// Half-open interval overlap checks
{
  assert.equal(doIntervalsOverlap("2026-11-10", "2026-11-15", "2026-11-12", "2026-11-17"), true);
  assert.equal(doIntervalsOverlap("2026-11-10", "2026-11-15", "2026-11-15", "2026-11-18"), false);
  assert.equal(doIntervalsOverlap("2026-11-10", "2026-11-15", "2026-11-08", "2026-11-10"), false);
  console.log("✔ Test 6 Passed: Half-open interval overlap logic verified.");
}

console.log("\nAll 6 tests passed successfully!");
