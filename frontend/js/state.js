/**
 * GSCSCL Application State & Storage Manager with Role Authentication & Supplier Security
 */

class AppStateManager {
  constructor() {
    this.storageKey = "GSCSCL_APP_STATE_V3";
    this.listeners = [];
    this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          isAuthenticated: Boolean(parsed.isAuthenticated),
          currentRole: parsed.currentRole || null,
          bills: parsed.bills || GSCSCL_DATA.initialBills,
          availableGRNs: parsed.availableGRNs || GSCSCL_DATA.availableGRNs,
          activeTab: parsed.activeTab || "dashboard",
          notifications: parsed.notifications || this.getDefaultNotifications()
        };
      } else {
        this.resetToDefaults(false);
      }
    } catch (e) {
      console.error("Failed to load state from localStorage, resetting to defaults", e);
      this.resetToDefaults(false);
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        isAuthenticated: this.state.isAuthenticated,
        currentRole: this.state.currentRole,
        bills: this.state.bills,
        availableGRNs: this.state.availableGRNs,
        activeTab: this.state.activeTab,
        notifications: this.state.notifications
      }));
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
    this.notify();
  }

  resetToDefaults(startAuthenticated = false) {
    this.state = {
      isAuthenticated: startAuthenticated,
      currentRole: startAuthenticated ? "supplier" : null,
      bills: JSON.parse(JSON.stringify(GSCSCL_DATA.initialBills)),
      availableGRNs: JSON.parse(JSON.stringify(GSCSCL_DATA.availableGRNs)),
      activeTab: "dashboard",
      notifications: this.getDefaultNotifications()
    };
    this.saveState();
  }

  getDefaultNotifications() {
    return [
      {
        id: "NOTIF-1",
        title: "New Inward Receipt Ready",
        message: "GRN-GJ-2026-9088 ready for billing by Shree Gujarat Agro Commodities FPO.",
        time: "10 mins ago",
        read: false,
        type: "info"
      },
      {
        id: "NOTIF-2",
        title: "Bill Returned for Correction",
        message: "Bill GSCSCL-2026-B008 returned: Moisture Content exceeds standard ceiling.",
        time: "1 hour ago",
        read: false,
        type: "warning"
      },
      {
        id: "NOTIF-3",
        title: "Payment Credited Successfully",
        message: "Voucher #GSCSCL/FIN/2026/V-4091 of ₹27,79,031 disbursed via IFMS.",
        time: "3 hours ago",
        read: true,
        type: "success"
      }
    ];
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.state);
      } catch (err) {
        console.error("Error in state subscriber:", err);
      }
    });
  }

  // Auth Methods
  isAuthenticated() {
    return Boolean(this.state.isAuthenticated && this.state.currentRole);
  }

  getCurrentRole() {
    if (!this.state.currentRole) return null;
    return GSCSCL_DATA.roles.find(r => r.id === this.state.currentRole) || null;
  }

  login(username, password, captchaInput, expectedCaptcha) {
    if (!captchaInput || captchaInput.trim().toUpperCase() !== expectedCaptcha.trim().toUpperCase()) {
      return { success: false, message: "Security Captcha does not match. Please try again." };
    }

    const cleanUser = (username || "").trim();
    const cleanPass = (password || "").trim();

    const role = GSCSCL_DATA.roles.find(r => 
      r.username.toLowerCase() === cleanUser.toLowerCase() || 
      r.id.toLowerCase() === cleanUser.toLowerCase() ||
      (r.id === "supplier" && cleanUser.toUpperCase().includes("SUP"))
    );

    if (!role) {
      return { success: false, message: "Invalid User ID or Employee Code. Check credentials or use Quick Demo Login." };
    }

    if (role.password !== cleanPass) {
      return { success: false, message: "Incorrect Password entered for " + role.name + "." };
    }

    this.state.isAuthenticated = true;
    this.state.currentRole = role.id;
    this.state.activeTab = "dashboard";

    this.addNotification({
      title: "Government Portal Login",
      message: `Signed in as ${role.name}.`,
      type: "success"
    });

    this.saveState();
    return { success: true, role };
  }

  quickDemoLogin(roleId) {
    const role = GSCSCL_DATA.roles.find(r => r.id === roleId);
    if (!role) return false;

    this.state.isAuthenticated = true;
    this.state.currentRole = role.id;
    this.state.activeTab = "dashboard";

    this.addNotification({
      title: "Quick Demo Session Started",
      message: `Signed in as ${role.name} (${role.department}).`,
      type: "info"
    });

    this.saveState();
    return true;
  }

  logout() {
    const prevRole = this.getCurrentRole();
    this.state.isAuthenticated = false;
    this.state.currentRole = null;
    this.state.activeTab = "dashboard";
    this.saveState();
    return prevRole;
  }

  setActiveTab(tabName) {
    this.state.activeTab = tabName;
    this.notify();
  }

  // Bills Access Control:
  // If the logged in user is a supplier, they MUST only see their own bills!
  getBills() {
    const role = this.getCurrentRole();
    if (role && role.id === 'supplier') {
      return this.state.bills.filter(b => b.supplierId === "SUP-GJ-2026-881");
    }
    return this.state.bills;
  }

  // Strictly get only supplier bills
  getSupplierBills() {
    return this.state.bills.filter(b => b.supplierId === "SUP-GJ-2026-881");
  }

  getBillById(id) {
    const bill = this.state.bills.find(b => b.id === id);
    if (!bill) return null;

    // Security check: If current role is supplier, they cannot access another supplier's bill!
    const role = this.getCurrentRole();
    if (role && role.id === 'supplier' && bill.supplierId !== "SUP-GJ-2026-881") {
      console.warn("Unauthorized access: Supplier attempted to access another vendor's bill.");
      return null;
    }
    return bill;
  }

  getAvailableGRNs() {
    return this.state.availableGRNs.filter(g => !g.alreadyBilled);
  }

  // Notification helper
  addNotification(notif) {
    const newNotif = {
      id: "NOTIF-" + Date.now(),
      title: notif.title,
      message: notif.message,
      time: "Just now",
      read: false,
      type: notif.type || "info"
    };
    this.state.notifications.unshift(newNotif);
    if (this.state.notifications.length > 20) {
      this.state.notifications.pop();
    }
    this.saveState();
  }

  markAllNotificationsRead() {
    this.state.notifications.forEach(n => n.read = true);
    this.saveState();
  }

  formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(dateStr) {
    if (!dateStr || dateStr === "-") return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  // =============================================================
  // SUPPLIER PERMISSIONS & OPERATIONS
  // =============================================================

  // 1. Submit New Bill (Supplier)
  submitNewBill(billData) {
    const billCount = this.state.bills.length + 1;
    const billId = `GSCSCL-2026-B${String(billCount).padStart(3, '0')}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Mark GRN as billed
    const grn = this.state.availableGRNs.find(g => g.grnNumber === billData.grnNumber);
    if (grn) {
      grn.alreadyBilled = true;
    }

    const grossAmount = Number(billData.billedQty) * Number(billData.ratePerUnit);
    const tds194Q = Math.round(grossAmount * 0.001); // 0.1% TDS
    const gstTds = Math.round(grossAmount * 0.02);   // 2% GST TDS
    const netPayable = grossAmount - (tds194Q + gstTds);

    const newBill = {
      id: billId,
      grnNumber: billData.grnNumber,
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      supplierGstin: "24AAACG1234F1ZQ",
      supplierPan: "AAACG1234F",
      supplierBank: {
        accountNo: "98230100045231",
        ifsc: "SBIN0001356",
        bankName: "State Bank of India",
        branch: "Gandhinagar Sector 11"
      },
      poNumber: billData.poNumber || "PO/GSCSCL/2026/MSP-950",
      invoiceNumber: billData.invoiceNumber,
      invoiceDate: billData.invoiceDate,
      submissionDate: dateStr,
      district: billData.district || (grn ? grn.district : "Gandhinagar"),
      godownName: billData.godownName || (grn ? grn.godownName : "State Base Godown, Sector-28"),
      category: billData.category,
      commodity: billData.commodity,
      receivedQty: Number(billData.receivedQty || billData.billedQty),
      billedQty: Number(billData.billedQty),
      unit: billData.unit || "Quintal",
      ratePerUnit: Number(billData.ratePerUnit),
      grossAmount: grossAmount,
      deductions: {
        tds194Q: tds194Q,
        gstTds: gstTds,
        moistureDeduction: 0,
        refractionCut: 0,
        otherRecovery: 0
      },
      netPayable: netPayable,
      status: "Submitted",
      statusColor: "blue",
      currentStage: "Waiting for Verification",
      publicRemark: "Bill submitted online. Waiting for godown manager to complete inward verification.",
      daysInStage: 0,
      isDelayed: false,
      auditChecklist: {
        weighmentSlipVerified: false,
        qualityReportCompliant: false,
        gstinActive: true,
        statutoryDeductionsCorrect: false,
        sanctionOrderApproved: false,
        noDualClaimCertified: false
      },
      queries: [],
      notingSheet: [
        {
          timestamp: `${dateStr} ${timeStr}`,
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted Online",
          remarks: `Invoice ${billData.invoiceNumber} submitted for ${billData.billedQty} ${billData.unit || 'Quintals'} against Receipt ${billData.grnNumber}. Total: ₹${grossAmount.toLocaleString('en-IN')}.`
        }
      ],
      paymentDetails: null,
      exception: {
        active: false,
        reason: "",
        code: "",
        raisedBy: "",
        raisedOn: "",
        severity: "",
        resolutionNotes: ""
      }
    };

    this.state.bills.unshift(newBill);
    this.addNotification({
      title: "Bill Submitted Successfully",
      message: `Bill ${billId} submitted against ${newBill.grnNumber}. Status: Waiting for Verification.`,
      type: "success"
    });
    this.saveState();
    return newBill;
  }

  // 2. Save Bill as Draft (Supplier)
  saveDraftBill(billData) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const grn = this.state.availableGRNs.find(g => g.grnNumber === billData.grnNumber);
    const grossAmount = Number(billData.billedQty || 0) * Number(billData.ratePerUnit || 0);
    const tds194Q = Math.round(grossAmount * 0.001);
    const gstTds = Math.round(grossAmount * 0.02);
    const netPayable = grossAmount - (tds194Q + gstTds);

    // If updating existing draft
    if (billData.id && billData.id.includes("D")) {
      const existing = this.state.bills.find(b => b.id === billData.id);
      if (existing) {
        existing.grnNumber = billData.grnNumber;
        existing.invoiceNumber = billData.invoiceNumber;
        existing.invoiceDate = billData.invoiceDate;
        existing.billedQty = Number(billData.billedQty);
        existing.receivedQty = Number(billData.billedQty);
        existing.ratePerUnit = Number(billData.ratePerUnit);
        existing.grossAmount = grossAmount;
        existing.netPayable = netPayable;
        existing.publicRemark = "Saved as draft. Not yet submitted.";
        existing.notingSheet.push({
          timestamp: `${dateStr} ${timeStr}`,
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Draft",
          action: "Draft Updated",
          remarks: `Draft updated by supplier.`
        });
        this.saveState();
        return existing;
      }
    }

    // New Draft
    const draftCount = this.state.bills.filter(b => b.id.includes("D")).length + 1;
    const draftId = `GSCSCL-2026-D${String(draftCount).padStart(3, '0')}`;

    const newDraft = {
      id: draftId,
      grnNumber: billData.grnNumber,
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      supplierGstin: "24AAACG1234F1ZQ",
      supplierPan: "AAACG1234F",
      supplierBank: {
        accountNo: "98230100045231",
        ifsc: "SBIN0001356",
        bankName: "State Bank of India",
        branch: "Gandhinagar Sector 11"
      },
      poNumber: billData.poNumber || "PO/GSCSCL/2026/MSP-950",
      invoiceNumber: billData.invoiceNumber,
      invoiceDate: billData.invoiceDate,
      submissionDate: "-",
      district: billData.district || (grn ? grn.district : "Gandhinagar"),
      godownName: billData.godownName || (grn ? grn.godownName : "State Base Godown, Sector-28"),
      category: billData.category,
      commodity: billData.commodity,
      receivedQty: Number(billData.billedQty),
      billedQty: Number(billData.billedQty),
      unit: billData.unit || "Quintal",
      ratePerUnit: Number(billData.ratePerUnit),
      grossAmount: grossAmount,
      deductions: {
        tds194Q: tds194Q,
        gstTds: gstTds,
        moistureDeduction: 0,
        refractionCut: 0,
        otherRecovery: 0
      },
      netPayable: netPayable,
      status: "Draft",
      statusColor: "slate",
      currentStage: "Draft",
      publicRemark: "Saved as draft. Not yet submitted to GSCSCL.",
      daysInStage: 0,
      isDelayed: false,
      auditChecklist: {
        weighmentSlipVerified: false,
        qualityReportCompliant: false,
        gstinActive: true,
        statutoryDeductionsCorrect: false,
        sanctionOrderApproved: false,
        noDualClaimCertified: false
      },
      queries: [],
      notingSheet: [
        {
          timestamp: `${dateStr} ${timeStr}`,
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Draft",
          action: "Draft Saved",
          remarks: `Draft created for ${billData.billedQty} ${billData.unit || 'Quintals'}.`
        }
      ],
      paymentDetails: null,
      exception: {
        active: false,
        reason: "",
        code: "",
        raisedBy: "",
        raisedOn: "",
        severity: "",
        resolutionNotes: ""
      }
    };

    this.state.bills.unshift(newDraft);
    this.addNotification({
      title: "Draft Saved",
      message: `Draft ${draftId} saved successfully. You can edit or submit it anytime.`,
      type: "info"
    });
    this.saveState();
    return newDraft;
  }

  // 3. Submit a Draft Bill (Supplier)
  submitDraftBill(billId) {
    const bill = this.getBillById(billId);
    if (!bill || bill.status !== 'Draft') return false;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.status = "Submitted";
    bill.statusColor = "blue";
    bill.currentStage = "Waiting for Verification";
    bill.submissionDate = dateStr;
    bill.publicRemark = "Bill submitted online. Waiting for godown manager to complete inward verification.";

    // Mark GRN as billed
    const grn = this.state.availableGRNs.find(g => g.grnNumber === bill.grnNumber);
    if (grn) grn.alreadyBilled = true;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: "Supplier Self-Service Portal",
      designation: "Vendor Submission",
      action: "Draft Submitted as Final Bill",
      remarks: `Draft submitted for official processing.`
    });

    this.addNotification({
      title: "Bill Submitted",
      message: `Bill ${billId} submitted. Status: Waiting for Verification.`,
      type: "success"
    });
    this.saveState();
    return true;
  }

  // 4. Delete a Draft Bill (Supplier)
  deleteDraftBill(billId) {
    const bill = this.getBillById(billId);
    if (!bill || bill.status !== 'Draft') return false;

    this.state.bills = this.state.bills.filter(b => b.id !== billId);
    this.addNotification({
      title: "Draft Deleted",
      message: `Draft ${billId} has been deleted.`,
      type: "info"
    });
    this.saveState();
    return true;
  }

  // 5. Correct and Resubmit Bill (Supplier)
  resubmitBill(billId, updateData) {
    const bill = this.getBillById(billId);
    if (!bill || bill.status !== 'Exception Raised') return false;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update invoice number, date, rate, qty if supplied
    if (updateData.invoiceNumber) bill.invoiceNumber = updateData.invoiceNumber;
    if (updateData.invoiceDate) bill.invoiceDate = updateData.invoiceDate;
    if (updateData.billedQty) {
      bill.billedQty = Number(updateData.billedQty);
      bill.receivedQty = Number(updateData.billedQty);
    }
    if (updateData.ratePerUnit) bill.ratePerUnit = Number(updateData.ratePerUnit);

    // Recompute gross & net
    const grossAmount = bill.billedQty * bill.ratePerUnit;
    bill.grossAmount = grossAmount;
    bill.deductions.tds194Q = Math.round(grossAmount * 0.001);
    bill.deductions.gstTds = Math.round(grossAmount * 0.02);

    // If supplier accepted a deduction or uploaded revised test
    if (updateData.acceptedDeduction && Number(updateData.acceptedDeduction) > 0) {
      bill.deductions.moistureDeduction = Number(updateData.acceptedDeduction);
    }

    const totalDeductions = (bill.deductions.tds194Q || 0) + 
                            (bill.deductions.gstTds || 0) + 
                            (bill.deductions.moistureDeduction || 0) + 
                            (bill.deductions.refractionCut || 0);
    bill.netPayable = grossAmount - totalDeductions;

    // Reset status to Submitted / Waiting for Verification
    bill.status = "Submitted";
    bill.statusColor = "blue";
    bill.currentStage = "Waiting for Verification";
    bill.exception.active = false;
    bill.publicRemark = `Resubmitted with corrections on ${dateStr}. Supplier note: "${updateData.supplierRemarks || 'Corrected documents uploaded'}"`;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: "Supplier Self-Service Portal",
      designation: "Vendor Resubmission",
      action: "Bill Resubmitted with Corrections",
      remarks: `Supplier resubmitted bill with corrections. Notes: ${updateData.supplierRemarks || 'Corrected invoice/documents submitted'}. Resumed to verification queue.`
    });

    this.addNotification({
      title: "Bill Resubmitted Successfully",
      message: `Bill ${billId} has been resubmitted with corrections. Waiting for Verification.`,
      type: "success"
    });

    this.saveState();
    return true;
  }

  // 6. Raise a Query on Bill (Supplier)
  raiseSupplierQuery(billId, queryText) {
    const bill = this.getBillById(billId);
    if (!bill) return false;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!bill.queries) bill.queries = [];

    const queryObj = {
      id: "Q-" + Date.now(),
      query: queryText,
      date: `${dateStr} ${timeStr}`,
      status: "Submitted to Officials",
      reply: "Query registered. GSCSCL audit desk will review and provide clarification."
    };

    bill.queries.push(queryObj);

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: "Supplier Self-Service Portal",
      designation: "Vendor Query",
      action: "Supplier Query Submitted",
      remarks: `Supplier submitted query: "${queryText}"`
    });

    this.addNotification({
      title: "Query Submitted",
      message: `Your query on Bill ${billId} has been sent to GSCSCL officials.`,
      type: "info"
    });

    this.saveState();
    return queryObj;
  }

  // =============================================================
  // OFFICIAL ACTIONS (FOR GOVERNMENT OFFICIALS ONLY)
  // Backend Security Enforced: Suppliers cannot call these!
  // =============================================================

  passGodownVerification(billId, remarks = "") {
    // SECURITY GUARD
    if (this.getCurrentRole()?.id === 'supplier') {
      this.addNotification({
        title: "Permission Denied",
        message: "Suppliers are not authorized to verify or approve stock.",
        type: "warning"
      });
      return false;
    }

    const bill = this.getBillById(billId);
    if (!bill) return false;

    const currentRole = this.getCurrentRole() || { officer: "Godown Manager", designation: "In-Charge" };
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.status = "Pre-Audit";
    bill.statusColor = "emerald";
    bill.currentStage = "Waiting for Approval";
    bill.publicRemark = "Physical stock and weighment slip verified. Forwarded to Pre-Audit branch.";
    bill.auditChecklist.weighmentSlipVerified = true;
    bill.auditChecklist.qualityReportCompliant = true;
    bill.daysInStage = 0;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: currentRole.officer,
      designation: currentRole.designation,
      action: "Godown Verification Certified",
      remarks: remarks || "Physical weighbridge reconciliation confirmed. Consignment moisture & refraction tests compliant with GSCSCL standards. Cleared for Pre-Audit."
    });

    this.addNotification({
      title: "Godown Verification Completed",
      message: `Bill ${billId} verified by Godown In-Charge and forwarded to Pre-Audit branch.`,
      type: "info"
    });

    this.saveState();
    return true;
  }

  passPreAudit(billId, checklistData = {}, customDeductions = null, remarks = "") {
    // SECURITY GUARD
    if (this.getCurrentRole()?.id === 'supplier') {
      this.addNotification({
        title: "Permission Denied",
        message: "Suppliers cannot pass pre-audit or change statutory deductions.",
        type: "warning"
      });
      return false;
    }

    const bill = this.getBillById(billId);
    if (!bill) return false;

    const currentRole = this.getCurrentRole() || { officer: "Pre-Audit Officer", designation: "Audit Cell" };
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.auditChecklist = {
      ...bill.auditChecklist,
      ...checklistData,
      statutoryDeductionsCorrect: true,
      noDualClaimCertified: true
    };

    if (customDeductions) {
      bill.deductions = {
        ...bill.deductions,
        ...customDeductions
      };
      const totalDeductions = (bill.deductions.tds194Q || 0) + 
                              (bill.deductions.gstTds || 0) + 
                              (bill.deductions.moistureDeduction || 0) + 
                              (bill.deductions.refractionCut || 0) + 
                              (bill.deductions.otherRecovery || 0);
      bill.netPayable = bill.grossAmount - totalDeductions;
    }

    bill.status = "Approval Pending";
    bill.statusColor = "purple";
    bill.currentStage = "Waiting for Approval";
    bill.publicRemark = "Pre-audit scrutiny completed. Put up to General Manager for financial sanction.";
    bill.daysInStage = 0;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: currentRole.officer,
      designation: currentRole.designation,
      action: "Pre-Audit Passed & Forwarded",
      remarks: remarks || `3-Way reconciliation completed. Statutory deductions (IT Sec 194Q & GST TDS 2%) verified. Net payable verified as ₹${bill.netPayable.toLocaleString('en-IN')}/-. Put up to General Manager for sanction.`
    });

    this.addNotification({
      title: "Pre-Audit Cleared",
      message: `Bill ${billId} pre-audited and forwarded to General Manager for sanction.`,
      type: "info"
    });

    this.saveState();
    return true;
  }

  approveGMBill(billId, remarks = "") {
    // SECURITY GUARD
    if (this.getCurrentRole()?.id === 'supplier') {
      this.addNotification({
        title: "Permission Denied",
        message: "Suppliers cannot grant administrative or financial sanctions.",
        type: "warning"
      });
      return false;
    }

    const bill = this.getBillById(billId);
    if (!bill) return false;

    const currentRole = this.getCurrentRole() || { officer: "General Manager", designation: "Competent Authority" };
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.status = "Sent to Finance";
    bill.statusColor = "indigo";
    bill.currentStage = "Payment in Process";
    bill.publicRemark = "Sanction granted by General Manager. Payment file transferred to Finance Branch for RTGS clearance.";
    bill.auditChecklist.sanctionOrderApproved = true;
    bill.daysInStage = 0;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: currentRole.officer,
      designation: currentRole.designation,
      action: "Financial Sanction Accorded",
      remarks: remarks || `Financial sanction granted under Head: 2408-Food & Civil Supplies. Passed for net disbursement of ₹${bill.netPayable.toLocaleString('en-IN')}/- to Finance Branch.`
    });

    this.addNotification({
      title: "Financial Sanction Granted",
      message: `General Manager approved Bill ${billId} for ₹${bill.netPayable.toLocaleString('en-IN')}. Sent to Finance.`,
      type: "success"
    });

    this.saveState();
    return true;
  }

  disbursePayment(billId, utrNumber = "", mode = "IFMS-Gujarat RTGS Gateway") {
    // SECURITY GUARD
    if (this.getCurrentRole()?.id === 'supplier') {
      this.addNotification({
        title: "Permission Denied",
        message: "Suppliers cannot disburse payments or generate treasury UTRs.",
        type: "warning"
      });
      return false;
    }

    const bill = this.getBillById(billId);
    if (!bill) return false;

    const currentRole = this.getCurrentRole() || { officer: "Chief Accounts Officer", designation: "Treasury" };
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const finalUtr = utrNumber || `CMS${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const voucherNo = `GSCSCL/FIN/${now.getFullYear()}/V-${Math.floor(4100 + Math.random() * 800)}`;

    bill.status = "Payment Processed";
    bill.statusColor = "emerald";
    bill.currentStage = "Payment Completed";
    bill.publicRemark = `Payment transferred to bank account. UTR Reference: ${finalUtr}.`;
    bill.daysInStage = 0;
    bill.paymentDetails = {
      utrNumber: finalUtr,
      paymentDate: dateStr,
      paymentMode: mode,
      voucherNumber: voucherNo
    };

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: currentRole.officer,
      designation: currentRole.designation,
      action: "Electronic Payment Cleared",
      remarks: `Net payment of ₹${bill.netPayable.toLocaleString('en-IN')}/- successfully transmitted to ${bill.supplierBank.bankName} (A/c: ${bill.supplierBank.accountNo}). UTR Ref: ${finalUtr}. Voucher: ${voucherNo}.`
    });

    this.addNotification({
      title: "Payment Disbursed Successfully",
      message: `Voucher ${voucherNo} of ₹${bill.netPayable.toLocaleString('en-IN')} paid. UTR: ${finalUtr}.`,
      type: "success"
    });

    this.saveState();
    return true;
  }

  raiseException(billId, exceptionData) {
    // SECURITY GUARD
    if (this.getCurrentRole()?.id === 'supplier') {
      this.addNotification({
        title: "Permission Denied",
        message: "Suppliers cannot flag official exceptions.",
        type: "warning"
      });
      return false;
    }

    const bill = this.getBillById(billId);
    if (!bill) return false;

    const currentRole = this.getCurrentRole() || { officer: "Auditing Officer", designation: "GSCSCL" };
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.status = "Exception Raised";
    bill.statusColor = "rose";
    bill.currentStage = "Returned for Correction";
    bill.publicRemark = `Returned for Correction: ${exceptionData.reason}`;
    bill.exception = {
      active: true,
      reason: exceptionData.reason,
      code: exceptionData.code || "EXC-GEN-01",
      raisedBy: `${currentRole.officer} (${currentRole.designation})`,
      raisedOn: dateStr,
      severity: exceptionData.severity || "Medium",
      resolutionNotes: ""
    };

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: currentRole.officer,
      designation: currentRole.designation,
      action: `Exception Flagged [${bill.exception.code}]`,
      remarks: `Bill flagged with exception: ${exceptionData.reason}. Severity: ${bill.exception.severity}. Returned for correction.`
    });

    this.addNotification({
      title: "Bill Returned for Correction",
      message: `Bill ${billId} returned: ${exceptionData.reason.substring(0, 50)}...`,
      type: "warning"
    });

    this.saveState();
    return true;
  }

  resolveException(billId, resolutionData) {
    // SECURITY GUARD
    if (this.getCurrentRole()?.id === 'supplier') {
      this.addNotification({
        title: "Permission Denied",
        message: "Suppliers cannot override or officially resolve exceptions.",
        type: "warning"
      });
      return false;
    }

    const bill = this.getBillById(billId);
    if (!bill) return false;

    const currentRole = this.getCurrentRole() || { officer: "Resolution Officer", designation: "GSCSCL" };
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.exception.active = false;
    bill.exception.resolutionNotes = resolutionData.notes || "Resolved by authorized committee / officer.";

    if (resolutionData.penaltyCut && resolutionData.penaltyCut > 0) {
      bill.deductions.moistureDeduction = (bill.deductions.moistureDeduction || 0) + Number(resolutionData.penaltyCut);
      const totalDeductions = (bill.deductions.tds194Q || 0) + 
                              (bill.deductions.gstTds || 0) + 
                              (bill.deductions.moistureDeduction || 0) + 
                              (bill.deductions.refractionCut || 0) + 
                              (bill.deductions.otherRecovery || 0);
      bill.netPayable = bill.grossAmount - totalDeductions;
    }

    const targetStatus = resolutionData.targetStatus || "Pre-Audit";
    bill.status = targetStatus;
    if (targetStatus === "Pre-Audit") {
      bill.statusColor = "emerald";
      bill.currentStage = "Waiting for Approval";
      bill.publicRemark = "Exception resolved. Resumed to Pre-Audit Verification.";
    } else if (targetStatus === "Approval Pending") {
      bill.statusColor = "purple";
      bill.currentStage = "Waiting for Approval";
      bill.publicRemark = "Exception resolved. Put up for General Manager Sanction.";
    } else if (targetStatus === "Sent to Finance") {
      bill.statusColor = "indigo";
      bill.currentStage = "Payment in Process";
      bill.publicRemark = "Exception resolved. Sent to Finance for disbursement.";
    }

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: currentRole.officer,
      designation: currentRole.designation,
      action: "Exception Resolved",
      remarks: `Exception cleared. ${bill.exception.resolutionNotes}. Resumed to ${bill.currentStage}.`
    });

    this.addNotification({
      title: "Exception Resolved",
      message: `Exception on Bill ${billId} resolved. Resumed to ${bill.currentStage}.`,
      type: "success"
    });

    this.saveState();
    return true;
  }
}

// Global App State Instance
const AppState = new AppStateManager();
