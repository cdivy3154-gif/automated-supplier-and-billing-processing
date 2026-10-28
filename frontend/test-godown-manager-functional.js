const fs = require('fs');
const vm = require('vm');

// Create a DOM-like environment
global.window = global;
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};
global.document = {
  addEventListener() {},
  getElementById(id) {
    return {
      classList: { add() {}, remove() {}, contains() { return false; } },
      innerHTML: '',
      innerText: '',
      value: '',
      checked: true
    };
  }
};

const html = fs.readFileSync('index.html', 'utf8');

// Extract and eval script #4 (main app script)
const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  if (count === 4) {
    vm.runInThisContext(match[1]);
    break;
  }
}

console.log("=== RUNNING GSCSCL GODOWN MANAGER FUNCTIONAL TEST SUITE ===");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// 1. Initial State & Data Check
assert(typeof GSCSCL_DATA !== 'undefined', "GSCSCL_DATA is defined");
assert(Array.isArray(GSCSCL_DATA.supplyOrders), "GSCSCL_DATA.supplyOrders is an array");
assert(Array.isArray(GSCSCL_DATA.deliveries), "GSCSCL_DATA.deliveries is an array");

// 2. Authentication as Godown Manager
const loginResult = AppState.login("GDN-AHM-01", "Godown@2026", "ABCD", "ABCD");
assert(loginResult.success, "Godown Manager logged in successfully with GDN-AHM-01");
const role = AppState.getCurrentRole();
assert(role && role.id === 'godown_manager', "Current role is godown_manager");
assert(role.godownId === 'GDN-AHM-01', "Assigned godown is GDN-AHM-01 (Sanand)");

// 3. Supply Orders Isolation
const gdnOrders = AppState.getGodownSupplyOrders();
assert(gdnOrders.length > 0, `Godown Manager sees ${gdnOrders.length} supply orders for Sanand`);
const foreignOrders = gdnOrders.filter(o => o.godownId !== 'GDN-AHM-01');
assert(foreignOrders.length === 0, "No foreign godown orders (e.g. Gandhinagar) visible to Sanand manager");

// 4. Deliveries Isolation
const gdnDeliveries = AppState.getGodownDeliveries();
assert(gdnDeliveries.length > 0, `Godown Manager sees ${gdnDeliveries.length} deliveries for Sanand`);
const foreignDeliveries = gdnDeliveries.filter(d => d.godownId !== 'GDN-AHM-01');
assert(foreignDeliveries.length === 0, "No foreign deliveries (e.g. DEL-GNR-001) visible to Sanand manager");
assert(AppState.getDeliveryById("DEL-GNR-001") === null, "Direct lookup of foreign delivery DEL-GNR-001 is denied (returns null)");

// 5. Inward Verification Validation Tests
const testDel = AppState.getDeliveryById("DEL-2026-002");
assert(testDel !== null, "Found delivery DEL-2026-002 for verification testing");

// 5a. Test: Gross weight <= tare weight must be rejected
const invalidWeightRes = AppState.saveInwardDelivery("DEL-2026-002", {
  truckNumber: "GJ-01-AX-5519",
  weighbridgeSlipNo: "WB-TEST-1",
  grossWeightKg: 10000,
  tareWeightKg: 15000, // Gross < Tare!
  actualQtyReceived: 250,
  bagsCount: 500,
  moisturePercent: 11.0,
  qualityPassed: true
});
assert(!invalidWeightRes.success && invalidWeightRes.message.includes("Gross weight must be greater than tare weight"), 
  "Gross weight <= Tare weight is correctly rejected");

// 5b. Test: Excessive quantity above order tolerance (+5%) must be rejected
const excessiveQtyRes = AppState.saveInwardDelivery("DEL-2026-002", {
  truckNumber: "GJ-01-AX-5519",
  weighbridgeSlipNo: "WB-TEST-2",
  grossWeightKg: 45000,
  tareWeightKg: 10000,
  actualQtyReceived: 350, // Expected is 250! Max allowed is 262.5
  bagsCount: 700,
  moisturePercent: 11.0,
  qualityPassed: true
});
assert(!excessiveQtyRes.success && excessiveQtyRes.message.includes("is above the allowed order limit"), 
  "Excessive quantity is correctly rejected with clear explanation");

// 5c. Test: Valid delivery verification succeeds and confirms delivery
const validVerifyRes = AppState.saveInwardDelivery("DEL-2026-002", {
  truckNumber: "GJ-01-AX-5519",
  weighbridgeSlipNo: "WB-26-89110",
  grossWeightKg: 35000,
  tareWeightKg: 10000,
  actualQtyReceived: 250.0,
  bagsCount: 500,
  moisturePercent: 11.2,
  qualityPassed: true,
  remarks: "Physical wheat sample clean and compliant."
});
assert(validVerifyRes.success, "Valid inward delivery verification succeeded");
const updatedDel = AppState.getDeliveryById("DEL-2026-002");
assert(updatedDel.deliveryStatus === "Delivery Confirmed", "Delivery status transitioned to 'Delivery Confirmed'");
assert(updatedDel.netWeightKg === 25000, "Net weight correctly calculated as 25,000 kg (35,000 - 10,000)");

// 6. Digital Delivery Receipt (ePOD) Issuance & Deduplication
// 6a. Cannot issue receipt on unconfirmed delivery (e.g. DEL-2026-005 in transit)
const prematureReceiptRes = AppState.issueDeliveryReceipt("DEL-2026-005");
assert(!prematureReceiptRes.success, "Premature receipt issuance on in-transit delivery is prevented");

// 6b. Issue receipt on confirmed delivery (DEL-2026-002)
const beforeGRNCount = (AppState.state.availableGRNs || []).length;
const receiptRes = AppState.issueDeliveryReceipt("DEL-2026-002");
assert(receiptRes.success && receiptRes.receiptId.startsWith("GRN-GJ-2026-"), 
  `Receipt issued successfully with generated ID: ${receiptRes.receiptId}`);
assert(updatedDel.deliveryStatus === "Receipt Issued", "Delivery status updated to 'Receipt Issued'");
assert(updatedDel.receiptIssued === true, "receiptIssued flag set to true");
assert((AppState.state.availableGRNs || []).length === beforeGRNCount + 1, "New receipt added to availableGRNs pool for supplier billing");

// 6c. Prevent duplicate receipt issuance on same delivery
const duplicateReceiptRes = AppState.issueDeliveryReceipt("DEL-2026-002");
assert(!duplicateReceiptRes.success && duplicateReceiptRes.message.includes("already been issued"), 
  "Duplicate receipt issuance is strictly prevented");

// 7. Clarify Stock / Report Delivery Problem
// 7a. Report issue on DEL-2026-005 (in-transit delivery with issue observed upon arrival)
const clarifyRes = AppState.reportDeliveryClarification("DEL-2026-005", {
  problemType: "Goods damaged, infested, or poor physical quality",
  details: "Water seepage on tarpaulin caused outer bag wetting during transit.",
  proposedAction: "Hold vehicle at godown gate for joint survey"
});
assert(clarifyRes.success, "Delivery clarification reported successfully");
const clarifiedDel = AppState.getDeliveryById("DEL-2026-005");
assert(clarifiedDel.deliveryStatus === "Needs Correction", "Status correctly updated to 'Needs Correction'");
assert(clarifiedDel.clarification && clarifiedDel.clarification.problemType.includes("Goods damaged"), 
  "Clarification details recorded on delivery object");

// 7b. Cannot report problem on finalized delivery with issued receipt
const clarifyFinalizedRes = AppState.reportDeliveryClarification("DEL-2026-001", {
  problemType: "Moisture content is higher than the standard limit",
  details: "Testing finalized restriction"
});
assert(!clarifyFinalizedRes.success, "Clarification on finalized delivery with issued receipt is blocked");

// 8. Removal of "Forward to Pre-Audit" & Bill Approval Permissions
// Test: Godown Manager cannot unilaterally advance a supplier bill to Pre-Audit!
const billAdvanceRes = AppState.passGodownVerification("GSCSCL-2026-B009");
assert(billAdvanceRes === false || (!billAdvanceRes.success && billAdvanceRes.message.includes("Permission Denied")), "Godown Manager attempting to forward bill to Pre-Audit is blocked by RBAC");

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED WITH 100% SUCCESS!");
}
