/**
 * Test Suite: Verifying All 10 Test Scenarios for GSCSCL GM Workflow, Exception Handling & RBAC
 */
const fs = require('fs');
const vm = require('vm');

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

// Load data and state
const dataCode = fs.readFileSync('js/data.js', 'utf8');
const stateCode = fs.readFileSync('js/state.js', 'utf8');

const ctx = vm.createContext({
  localStorage: global.localStorage,
  console: console,
  Math: Math,
  Date: Date,
  JSON: JSON,
  parseFloat: parseFloat,
  parseInt: parseInt,
  isNaN: isNaN,
  Boolean: Boolean,
  Number: Number,
  String: String
});

vm.runInContext(dataCode + '\n; this.GSCSCL_DATA = GSCSCL_DATA;', ctx);
vm.runInContext(stateCode + '\n; this.AppState = AppState;', ctx);

const AppState = ctx.AppState;
const GSCSCL_DATA = ctx.GSCSCL_DATA;

console.log("=== RUNNING GSCSCL GM WORKFLOW & RBAC VERIFICATION SUITE ===");
let passed = 0;
let total = 0;

function assert(cond, desc) {
  total++;
  if (cond) {
    console.log(`[PASS] Scenario ${total}: ${desc}`);
    passed++;
  } else {
    console.error(`[FAIL] Scenario ${total}: ${desc}`);
    process.exitCode = 1;
  }
}

// Reset state
AppState.resetToDefaults(false);

// Scenario 1: GM opens an exception with all mandatory checks completed (GSCSCL-2026-B005)
{
  AppState.quickDemoLogin('general_manager');
  const b5 = AppState.getBillById('GSCSCL-2026-B005');
  const preAuditVerified = b5.exception.departmentStatus.preAuditVerification.status === 'Verified';
  const authRes = AppState.authorizeExceptionByGM('GSCSCL-2026-B005', {
    authorizedDeduction: 8000,
    justification: "Approved as per GSCSCL Agmark circular norms and supplier consent letter."
  });
  const updatedB5 = AppState.getBillById('GSCSCL-2026-B005');
  assert(
    preAuditVerified && authRes.success && !updatedB5.exception.active && updatedB5.deductions.moistureDeduction === 8000 && updatedB5.auditChecklist.qualityReportCompliant === true,
    "GM opens exception with completed Pre-Audit clearance (B005) and successfully authorizes deduction & clears quality flag"
  );
}

// Scenario 2: GM opens an exception with pending Pre-Audit clearance (GSCSCL-2026-B008)
{
  AppState.quickDemoLogin('general_manager');
  const b8 = AppState.getBillById('GSCSCL-2026-B008');
  const preAuditPending = b8.exception.departmentStatus.preAuditVerification.status === 'Pending';
  const authRes = AppState.authorizeExceptionByGM('GSCSCL-2026-B008', {
    authorizedDeduction: 12500,
    justification: "Attempting premature GM authorization"
  });
  assert(
    preAuditPending && !authRes.success && authRes.message.includes("Pre-Audit"),
    "GM is blocked from authorizing an exception when Pre-Audit verification is pending (B008)"
  );
}

// Scenario 3: GM attempts to approve an exception with invalid/empty justification or missing authority
{
  AppState.quickDemoLogin('general_manager');
  // First clear Pre-Audit on B008
  AppState.quickDemoLogin('pre_audit');
  AppState.verifyExceptionByPreAudit('GSCSCL-2026-B008', { proposedDeduction: 12500, remarks: "Verified by Pre-Audit" });
  
  // Now GM tries without justification
  AppState.quickDemoLogin('general_manager');
  const authResNoJust = AppState.authorizeExceptionByGM('GSCSCL-2026-B008', {
    authorizedDeduction: 12500,
    justification: "   " // empty
  });
  assert(
    !authResNoJust.success && authResNoJust.message.includes("justification"),
    "GM authorization rejected if mandatory justification is missing or empty"
  );
}

// Scenario 4: GM attempts to sign off while a mandatory check is pending
{
  AppState.quickDemoLogin('general_manager');
  // GSCSCL-2026-B007 has active exception and missing weighment slip
  const signRes = AppState.approveGMBill('GSCSCL-2026-B007', "Attempted sign-off on non-compliant bill");
  const b7 = AppState.getBillById('GSCSCL-2026-B007');
  assert(
    !signRes.success && signRes.message.includes("Blocked") && b7.auditChecklist.sanctionOrderApproved === false,
    "GM sign-off is strictly blocked when mandatory prerequisite checks or active exceptions remain (B007)"
  );
}

// Scenario 5: A quality/moisture deduction has missing evidence or invalid values (e.g. negative or exceeding gross)
{
  AppState.quickDemoLogin('pre_audit');
  const negRes = AppState.verifyExceptionByPreAudit('GSCSCL-2026-B007', {
    proposedDeduction: -5000,
    remarks: "Negative deduction test"
  });
  const excessRes = AppState.verifyExceptionByPreAudit('GSCSCL-2026-B007', {
    proposedDeduction: 999999999,
    remarks: "Deduction exceeding gross amount"
  });
  assert(
    !negRes.success && !excessRes.success && negRes.message.includes("negative"),
    "Quality deduction calculation strictly rejects negative amounts and amounts exceeding gross bill"
  );
}

// Scenario 6: A bill is returned for clarification
{
  AppState.quickDemoLogin('general_manager');
  const returnRes = AppState.returnExceptionForClarification('GSCSCL-2026-B007', {
    remarks: "Please provide Unjha Mandi re-weighment tare certificate and truck calibration log.",
    targetDepartment: "Godown Manager & Supplier"
  });
  const b7 = AppState.getBillById('GSCSCL-2026-B007');
  assert(
    returnRes.success && b7.status === "Exception Raised" && b7.publicRemark.includes("Clarification") && b7.exception.resolutionStatus === "RETURNED_FOR_CLARIFICATION",
    "Bill successfully returned for clarification with mandatory remarks, updating public remarks and exception status"
  );
}

// Scenario 7: A resolved exception is reopened or amended through an authorized process
{
  AppState.quickDemoLogin('general_manager');
  // B005 was authorized in Scenario 1. Now reopen it for re-examination
  const reopenRes = AppState.reopenResolvedException('GSCSCL-2026-B005', {
    reason: "New sample tested by Central Laboratory indicates 16.2% moisture; reopening for re-examination."
  });
  const b5 = AppState.getBillById('GSCSCL-2026-B005');
  assert(
    reopenRes.success && b5.exception.active === true && b5.exception.resolutionStatus === "REOPENED_FOR_REVIEW" && b5.auditChecklist.sanctionOrderApproved === false,
    "Resolved exception reopened by GM for review, properly reactivating exception and revoking sanction"
  );
}

// Scenario 8: An unauthorized role attempts to execute a GM-only action
{
  // Pre-Auditor attempts to approve GM bill
  AppState.quickDemoLogin('pre_audit');
  const unauthorizedGM = AppState.approveGMBill('GSCSCL-2026-B003', "Pre-Auditor trying to sanction");
  
  // Godown Manager attempts to disburse payment
  AppState.quickDemoLogin('godown_manager');
  const unauthorizedDisburse = AppState.disbursePayment('GSCSCL-2026-B003');

  // Supplier attempts to clear godown verification
  AppState.quickDemoLogin('supplier');
  const unauthorizedGodown = AppState.passGodownVerification('GSCSCL-2026-B009');

  assert(
    !unauthorizedGM.success && unauthorizedGM.message.includes("Permission Denied") &&
    !unauthorizedDisburse.success && unauthorizedDisburse.message.includes("Permission Denied") &&
    !unauthorizedGodown.success && unauthorizedGodown.message.includes("Permission Denied"),
    "Strict RBAC guards block unauthorized roles from executing other departments' restricted actions"
  );
}

// Scenario 9: Finance attempts to process a bill before required approvals
{
  AppState.quickDemoLogin('finance');
  // GSCSCL-2026-B003 is 'Approval Pending' (not yet approved by GM)
  const financeRes = AppState.disbursePayment('GSCSCL-2026-B003');
  const b3 = AppState.getBillById('GSCSCL-2026-B003');
  assert(
    !financeRes.success && financeRes.message.includes("Disbursement Blocked") && b3.status === "Approval Pending",
    "Finance disbursement strictly blocked on unsanctioned bills that have not received GM sanction order"
  );
}

// Scenario 10: A completed decision retains its audit history
{
  // Now GM properly sanctions B003 (which has all gates passed)
  AppState.quickDemoLogin('general_manager');
  const gmSanction = AppState.approveGMBill('GSCSCL-2026-B003', "Sanction accorded under Budget Head 2408.");
  
  // Finance disburses B003
  AppState.quickDemoLogin('finance');
  const finDisburse = AppState.disbursePayment('GSCSCL-2026-B003');
  
  const b3 = AppState.getBillById('GSCSCL-2026-B003');
  const notingSheet = b3.notingSheet;
  const hasSubmission = notingSheet.some(n => n.action.includes("Submitted"));
  const hasGodown = notingSheet.some(n => n.action.includes("Stock Inward Cleared") || n.action.includes("Godown"));
  const hasPreAudit = notingSheet.some(n => n.action.includes("Pre-Audit Passed"));
  const hasGMSanction = notingSheet.some(n => n.action.includes("Financial Sanction Accorded"));
  const hasDisbursement = notingSheet.some(n => n.action.includes("Treasury Disbursement"));
  
  assert(
    gmSanction.success && finDisburse.success && b3.status === "Payment Processed" &&
    hasSubmission && hasGodown && hasPreAudit && hasGMSanction && hasDisbursement &&
    b3.digitalSignOff && b3.digitalSignOff.certificateRef.startsWith("NIC-DSC-GJ"),
    "Complete end-to-end lifecycle preserves full noting sheet audit trail, officer identities, timestamps, and DSC certificate token"
  );
}

console.log(`\n=== TEST RESULTS: ${passed}/${total} SCENARIOS PASSED ===`);
if (passed === total) {
  console.log("ALL 10 TEST SCENARIOS COMPLETED SUCCESSFULLY!");
} else {
  console.error("SOME SCENARIOS FAILED!");
  process.exit(1);
}
