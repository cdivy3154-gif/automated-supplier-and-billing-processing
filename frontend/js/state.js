/**
 * GSCSCL Application State & Storage Manager with Role Authentication & Supplier Security
 */

class AppStateManager {
  constructor() {
    this.storageKey = "GSCSCL_APP_STATE_V4";
    this.listeners = [];
    this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        let bills = parsed.bills || [];
        // Ensure all seed bills exist in bills array
        if (typeof GSCSCL_DATA !== 'undefined' && GSCSCL_DATA.initialBills) {
          GSCSCL_DATA.initialBills.forEach(seed => {
            if (!bills.some(b => b.id === seed.id)) {
              bills.push(JSON.parse(JSON.stringify(seed)));
            }
          });
        }
        let supplyOrders = parsed.supplyOrders || [];
        if (typeof GSCSCL_DATA !== 'undefined' && GSCSCL_DATA.supplyOrders) {
          GSCSCL_DATA.supplyOrders.forEach(seed => {
            if (!supplyOrders.some(o => o.orderNumber === seed.orderNumber)) {
              supplyOrders.push(JSON.parse(JSON.stringify(seed)));
            }
          });
        }

        let deliveries = parsed.deliveries || [];
        if (typeof GSCSCL_DATA !== 'undefined' && GSCSCL_DATA.deliveries) {
          GSCSCL_DATA.deliveries.forEach(seed => {
            if (!deliveries.some(d => d.deliveryId === seed.deliveryId)) {
              deliveries.push(JSON.parse(JSON.stringify(seed)));
            }
          });
        }

        this.state = {
          isAuthenticated: Boolean(parsed.isAuthenticated),
          currentRole: parsed.currentRole || null,
          bills: bills.length ? bills : JSON.parse(JSON.stringify(GSCSCL_DATA.initialBills)),
          availableGRNs: parsed.availableGRNs || GSCSCL_DATA.availableGRNs,
          supplyOrders: supplyOrders.length ? supplyOrders : JSON.parse(JSON.stringify(GSCSCL_DATA.supplyOrders || [])),
          deliveries: deliveries.length ? deliveries : JSON.parse(JSON.stringify(GSCSCL_DATA.deliveries || [])),
          activeTab: parsed.activeTab || "dashboard",
          notifications: parsed.notifications || this.getDefaultNotifications(),
          language: localStorage.getItem("GSCSCL_LANG") || parsed.language || "en",
          selectedDistrict: parsed.selectedDistrict || "All Districts",
          selectedBranch: parsed.selectedBranch || "All Branches",
          preAuditDashboardTab: parsed.preAuditDashboardTab || "pending"
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
        supplyOrders: this.state.supplyOrders,
        deliveries: this.state.deliveries,
        activeTab: this.state.activeTab,
        notifications: this.state.notifications,
        language: this.state.language,
        selectedDistrict: this.state.selectedDistrict,
        selectedBranch: this.state.selectedBranch,
        preAuditDashboardTab: this.state.preAuditDashboardTab
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
      supplyOrders: JSON.parse(JSON.stringify(GSCSCL_DATA.supplyOrders || [])),
      deliveries: JSON.parse(JSON.stringify(GSCSCL_DATA.deliveries || [])),
      activeTab: "dashboard",
      notifications: this.getDefaultNotifications(),
      language: localStorage.getItem("GSCSCL_LANG") || "en",
      selectedDistrict: "All Districts",
      selectedBranch: "All Branches",
      preAuditDashboardTab: "pending"
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

  // Language State Management (English <-> Gujarati)
  getLanguage() {
    return this.state.language || localStorage.getItem("GSCSCL_LANG") || "en";
  }

  setLanguage(lang) {
    this.state.language = (lang === 'gu') ? 'gu' : 'en';
    try {
      localStorage.setItem("GSCSCL_LANG", this.state.language);
    } catch (e) {}
    this.saveState();
  }

  // Location / Branch Scope for Pre-Audit Staff
  getSelectedDistrict() {
    return this.state.selectedDistrict || "All Districts";
  }

  getSelectedBranch() {
    return this.state.selectedBranch || "All Branches";
  }

  setPreAuditLocation(district, branch) {
    this.state.selectedDistrict = district || "All Districts";
    this.state.selectedBranch = branch || "All Branches";
    this.saveState();
  }

  // Pre-Audit Dashboard View Mode ("pending" or "cleared")
  getPreAuditDashboardTab() {
    return this.state.preAuditDashboardTab || "pending";
  }

  setPreAuditDashboardTab(tab) {
    this.state.preAuditDashboardTab = tab || "pending";
    this.saveState();
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
  // GODOWN MANAGER PERMISSIONS & OPERATIONS
  // =============================================================

  getGodownId() {
    const role = this.getCurrentRole();
    if (role && role.id === 'godown_manager') {
      return role.godownId || "GDN-AHM-01";
    }
    return null;
  }

  // Get supply orders assigned to the logged-in Godown Manager's godown (with strict isolation)
  getGodownSupplyOrders() {
    const role = this.getCurrentRole();
    if (role && role.id === 'godown_manager') {
      const gId = role.godownId || "GDN-AHM-01";
      return (this.state.supplyOrders || []).filter(o => o.godownId === gId);
    }
    return this.state.supplyOrders || [];
  }

  // Get physical deliveries assigned to the logged-in Godown Manager's godown (with strict isolation)
  getGodownDeliveries() {
    const role = this.getCurrentRole();
    if (role && role.id === 'godown_manager') {
      const gId = role.godownId || "GDN-AHM-01";
      return (this.state.deliveries || []).filter(d => d.godownId === gId);
    }
    return this.state.deliveries || [];
  }

  // Get digital delivery receipts (ePOD / GRN) issued for this godown
  getGodownReceipts() {
    const role = this.getCurrentRole();
    if (role && role.id === 'godown_manager') {
      const gId = role.godownId || "GDN-AHM-01";
      return (this.state.availableGRNs || []).filter(g => g.godownId === gId);
    }
    return this.state.availableGRNs || [];
  }

  // Get delivery by ID with strict godown isolation check
  getDeliveryById(deliveryId) {
    const delivery = (this.state.deliveries || []).find(d => d.deliveryId === deliveryId);
    if (!delivery) return null;
    const role = this.getCurrentRole();
    if (role && role.id === 'godown_manager') {
      const gId = role.godownId || "GDN-AHM-01";
      if (delivery.godownId !== gId) {
        console.warn("Unauthorized access: Godown Manager attempted to view another godown delivery.");
        return null;
      }
    }
    return delivery;
  }

  // Record / verify physical goods arriving at the godown
  saveInwardDelivery(deliveryId, data) {
    const role = this.getCurrentRole();
    if (role && role.id !== 'godown_manager' && role.id !== 'admin') {
      return { success: false, message: "Permission Denied: Only Godown Managers can record inward deliveries." };
    }
    const delivery = this.getDeliveryById(deliveryId);
    if (!delivery) {
      return { success: false, message: "Delivery record not found or you do not have permission." };
    }

    if (delivery.deliveryStatus === "Receipt Issued") {
      return { success: false, message: "A digital receipt has already been issued for this delivery. Finalized records cannot be modified." };
    }

    const actualQty = parseFloat(data.actualQtyReceived);
    const grossKg = parseFloat(data.grossWeightKg);
    const tareKg = parseFloat(data.tareWeightKg);
    const moisture = parseFloat(data.moisturePercent);
    const bagsCount = parseInt(data.bagsCount, 10);

    // Validation rules
    if (isNaN(actualQty) || actualQty <= 0) {
      return { success: false, message: "Please enter the actual quantity received." };
    }
    if (isNaN(grossKg) || grossKg <= 0 || isNaN(tareKg) || tareKg <= 0) {
      return { success: false, message: "Please enter valid gross and tare weights from the weighbridge slip." };
    }
    if (grossKg <= tareKg) {
      return { success: false, message: "Gross weight must be greater than tare weight." };
    }
    if (isNaN(moisture) || moisture < 0 || moisture > 50) {
      return { success: false, message: "Please enter a valid moisture content percentage." };
    }
    if (isNaN(bagsCount) || bagsCount <= 0) {
      return { success: false, message: "Please enter the number of bags received." };
    }

    // Check quantity against allowed order limit (max 5% variance allowed)
    const allowedLimit = delivery.expectedQty * 1.05;
    if (actualQty > allowedLimit) {
      return { 
        success: false, 
        message: "The received quantity (" + actualQty + " Qtl) is above the allowed order limit (" + delivery.expectedQty + " Qtl + 5% tolerance). Please check the delivery details or report a delivery issue." 
      };
    }

    const netKg = grossKg - tareKg;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentRole = this.getCurrentRole() || { officer: "Godown Manager" };

    // Update delivery record
    delivery.actualQtyReceived = actualQty;
    delivery.grossWeightKg = grossKg;
    delivery.tareWeightKg = tareKg;
    delivery.netWeightKg = netKg;
    delivery.weighbridgeSlipNo = data.weighbridgeSlipNo || delivery.weighbridgeSlipNo || ("WB-" + Math.floor(10000 + Math.random() * 90000));
    delivery.bagsCount = bagsCount;
    delivery.moisturePercent = moisture;
    delivery.stackingBay = data.stackingBay || delivery.stackingBay || "Bay 1";
    delivery.qualityPassed = Boolean(data.qualityPassed);
    delivery.qualityRemarks = data.qualityRemarks || "Physical stock inspected and compliant with standards.";
    delivery.deliveryStatus = "Delivery Confirmed";
    delivery.verifiedBy = currentRole.officer + " (" + (currentRole.designation || 'Godown Manager') + ")";
    delivery.verifiedDate = dateStr + " " + timeStr;
    delivery.remarks = data.remarks || "Goods physically checked and confirmed at godown.";

    if (delivery.maxAllowedMoisture && moisture > delivery.maxAllowedMoisture) {
      delivery.moistureWarning = "Moisture content (" + moisture + "%) exceeds standard limit (" + delivery.maxAllowedMoisture + "%).";
    }

    this.addNotification({
      title: "Delivery Details Saved",
      message: "Delivery " + deliveryId + " (" + delivery.commodity + ") physically confirmed at " + delivery.godownName + ".",
      type: "success"
    });

    this.saveState();
    return { success: true, message: "Delivery details saved. You can now issue a digital delivery receipt." };
  }

  // Issue digital Proof of Delivery receipt (ePOD / GRN)
  issueDeliveryReceipt(deliveryId) {
    const role = this.getCurrentRole();
    if (role && role.id !== 'godown_manager' && role.id !== 'admin') {
      return { success: false, message: "Permission Denied: Only Godown Managers can issue digital delivery receipts (ePOD)." };
    }
    const delivery = this.getDeliveryById(deliveryId);
    if (!delivery) {
      return { success: false, message: "Delivery record not found." };
    }

    if (delivery.receiptIssued || delivery.receiptId) {
      return { success: false, message: "A receipt has already been issued for this delivery. Duplicate receipt issuance is prevented." };
    }

    if (delivery.deliveryStatus !== "Delivery Confirmed") {
      return { success: false, message: "This delivery cannot be confirmed yet. Please check and verify the delivery details first." };
    }

    if (!delivery.qualityPassed) {
      return { success: false, message: "Cannot issue receipt: Physical quality check was not certified." };
    }

    // Generate unique official Receipt ID (ePOD / GRN)
    const grnCount = (this.state.availableGRNs || []).length + 9096;
    const receiptId = "GRN-GJ-2026-" + grnCount;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    delivery.receiptId = receiptId;
    delivery.receiptIssued = true;
    delivery.receiptIssuedDate = dateStr + " " + timeStr;
    delivery.deliveryStatus = "Receipt Issued";

    // Add to availableGRNs so supplier can bill against this confirmed delivery
    const newGRN = {
      grnNumber: receiptId,
      deliveryId: delivery.deliveryId,
      supplierId: delivery.supplierId,
      supplierName: delivery.supplierName,
      godownId: delivery.godownId,
      godownName: delivery.godownName,
      district: delivery.district,
      category: delivery.category,
      commodity: delivery.commodity,
      poNumber: delivery.orderNumber,
      inwardDate: dateStr,
      truckNumber: delivery.truckNumber,
      weighbridgeSlipNo: delivery.weighbridgeSlipNo,
      grossWeightKg: delivery.grossWeightKg,
      tareWeightKg: delivery.tareWeightKg,
      netWeightKg: delivery.netWeightKg,
      quantityQuintals: delivery.actualQtyReceived,
      bagsCount: delivery.bagsCount,
      moisturePercent: delivery.moisturePercent,
      qualityStatus: "Passed - " + delivery.qualityRemarks,
      alreadyBilled: false
    };

    if (!this.state.availableGRNs) this.state.availableGRNs = [];
    this.state.availableGRNs.push(newGRN);

    // Update supply order delivered quantity
    const order = (this.state.supplyOrders || []).find(o => o.orderNumber === delivery.orderNumber);
    if (order) {
      order.deliveredQty = (order.deliveredQty || 0) + delivery.actualQtyReceived;
      order.remainingQty = Math.max(0, order.expectedQty - order.deliveredQty);
      if (order.remainingQty === 0) {
        order.orderStatus = "Completed";
      } else {
        order.orderStatus = "In Delivery";
      }
    }

    this.addNotification({
      title: "Receipt Issued",
      message: "Digital delivery receipt " + receiptId + " issued for " + delivery.commodity + " (" + delivery.actualQtyReceived + " Qtl). Available for supplier billing.",
      type: "success"
    });

    this.saveState();
    return { success: true, receiptId: receiptId, message: "Receipt issued successfully. Receipt ID: " + receiptId + "." };
  }

  // Report delivery issue / Clarify Stock
  reportDeliveryClarification(deliveryId, data) {
    const delivery = this.getDeliveryById(deliveryId);
    if (!delivery) {
      return { success: false, message: "Delivery record not found." };
    }

    if (delivery.deliveryStatus === "Receipt Issued") {
      return { success: false, message: "Cannot report issues on finalized deliveries with issued receipts." };
    }

    if (!data.problemType) {
      return { success: false, message: "Please select the type of delivery problem." };
    }
    if (!data.details || data.details.trim().length < 5) {
      return { success: false, message: "Please enter remarks explaining the delivery problem." };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentRole = this.getCurrentRole() || { officer: "Godown Manager" };

    delivery.deliveryStatus = "Needs Correction";
    delivery.clarification = {
      problemType: data.problemType,
      details: data.details.trim(),
      proposedAction: data.proposedAction || "Consignment held at godown gate for joint re-inspection.",
      reportedDate: dateStr + " " + timeStr,
      reportedBy: currentRole.officer + " (" + (currentRole.designation || 'Godown Manager') + ")"
    };
    delivery.remarks = "Delivery issue reported: " + data.problemType + ". " + data.details.trim();

    this.addNotification({
      title: "Delivery Issue Reported",
      message: "Issue reported on " + deliveryId + ": " + data.problemType + ". Consignment marked for clarification.",
      type: "warning"
    });

    this.saveState();
    return { success: true, message: "Delivery issue reported successfully. The consignment status is updated to Needs Correction." };
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
  // Backend RBAC & Workflow Sequence Enforced
  // Sequence: Godown -> Branch/Pre-Audit -> GM Sanction -> Finance
  // =============================================================

  passGodownVerification(billId, remarks = "") {
    const role = this.getCurrentRole();
    if (!role || role.id === 'godown_manager' || role.id === 'supplier') {
      const msg = "Permission Denied: Godown Managers only record physical delivery inward and issue receipts; they cannot forward or approve supplier bills to Pre-Audit.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    if (bill.status !== "Submitted" && bill.status !== "Under Verification") {
      const msg = `Action Blocked: Cannot perform Godown Inward Verification on a bill in '${bill.status}' status.`;
      this.addNotification({ title: "Invalid State", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.status = "Pre-Audit";
    bill.statusColor = "emerald";
    bill.currentStage = "Branch / Pre-Audit Verification";
    bill.publicRemark = "Physical stock and weighment slip verified. Forwarded to Pre-Audit branch.";
    bill.auditChecklist.weighmentSlipVerified = true;
    if (!bill.exception?.active) {
      bill.auditChecklist.qualityReportCompliant = true;
    }
    bill.daysInStage = 0;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: "Godown Inward Certified (ePOD Generated)",
      remarks: remarks || "Physical weighbridge gross & tare reconciliation confirmed. Stock inward recorded and ePOD endorsed. Cleared for Branch/Pre-Audit scrutiny."
    });

    this.addNotification({
      title: "Godown Inward Verified",
      message: `Bill ${billId} verified by Godown In-Charge (${role.officer}) and forwarded to Pre-Audit branch.`,
      type: "info"
    });

    this.saveState();
    return { success: true, message: "Godown inward certified and forwarded to Pre-Audit." };
  }

  passPreAudit(billId, checklistData = {}, customDeductions = null, remarks = "") {
    const role = this.getCurrentRole();
    if (!role || (role.id !== "pre_audit" && role.id !== "admin")) {
      const msg = "Permission Denied: Only Branch / Pre-Audit staff (or Admin) are authorized to perform statutory pre-audit scrutiny.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    // Prerequisite Gate 1: Godown Inward & Weighment Verification
    if (!bill.auditChecklist.weighmentSlipVerified) {
      const msg = "Prerequisite Failed: Godown inward verification & weighbridge receipt must be completed before Pre-Audit.";
      this.addNotification({ title: "Prerequisite Pending", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    // Active exception block
    if (bill.exception && bill.exception.active) {
      const msg = "Action Blocked: Bill has an unresolved exception. The exception must be verified and authorized before clearing Pre-Audit.";
      this.addNotification({ title: "Exception Active", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

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
      bill.netPayable = Math.max(0, bill.grossAmount - totalDeductions);
    }

    bill.status = "Approval Pending";
    bill.statusColor = "purple";
    bill.currentStage = "Waiting for Approval";
    bill.publicRemark = "Pre-audit scrutiny completed. Put up to General Manager for financial sanction.";
    bill.daysInStage = 0;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: "Pre-Audit Passed & Forwarded to GM",
      remarks: remarks || `3-Way reconciliation completed. Statutory deductions (IT Sec 194Q & GST TDS 2%) verified. Net payable verified as ₹${bill.netPayable.toLocaleString('en-IN')}/-. Put up to General Manager for executive sanction.`
    });

    this.addNotification({
      title: "Pre-Audit Cleared",
      message: `Bill ${billId} pre-audited by ${role.officer} and put up to General Manager.`,
      type: "info"
    });

    this.saveState();
    return { success: true, message: "Pre-audit cleared and forwarded to GM." };
  }

  approveGMBill(billId, remarks = "") {
    const role = this.getCurrentRole();
    if (!role || (role.id !== "general_manager" && role.id !== "admin")) {
      const msg = "Permission Denied: Only the General Manager (or Admin) is authorized to grant financial sanction and execute digital sign-off.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    // 5-Gate Prerequisite Validation for GM Sign-Off
    if (!bill.auditChecklist.weighmentSlipVerified) {
      const msg = "Sanction Blocked: Godown Manager physical inward verification is pending.";
      this.addNotification({ title: "Prerequisite Incomplete", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    if (!bill.auditChecklist.statutoryDeductionsCorrect) {
      const msg = "Sanction Blocked: Branch / Pre-Audit statutory compliance scrutiny is pending.";
      this.addNotification({ title: "Prerequisite Incomplete", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    if (!bill.auditChecklist.qualityReportCompliant) {
      const msg = "Sanction Blocked: Quality / moisture lab compliance report is pending or non-compliant.";
      this.addNotification({ title: "Prerequisite Incomplete", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    if (bill.exception && bill.exception.active) {
      const msg = "Sanction Blocked: Bill has an unresolved exception. The exception must be authorized/resolved before GM sanction.";
      this.addNotification({ title: "Exception Active", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    if (!remarks || remarks.trim().length < 5) {
      const msg = "Mandatory Requirement: Executive sanction remarks/justification must be provided.";
      this.addNotification({ title: "Justification Required", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const certRef = `NIC-DSC-GJ-${Math.floor(100000 + Math.random() * 900000)}-EXP27`;

    bill.status = "Sent to Finance";
    bill.statusColor = "indigo";
    bill.currentStage = "Payment in Process";
    bill.publicRemark = `Financial sanction accorded by General Manager (${role.officer}). File transferred to Finance Branch for IFMS electronic disbursement.`;
    bill.auditChecklist.sanctionOrderApproved = true;
    bill.daysInStage = 0;

    bill.digitalSignOff = {
      officer: role.officer,
      designation: role.designation,
      signedAt: `${dateStr} ${timeStr}`,
      certificateRef: certRef,
      remarks: remarks,
      isPrototype: true,
      disclaimer: "Simulated prototype e-Sign for GSCSCL PS000007 evaluation; not legally binding."
    };

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: "Financial Sanction Accorded (Digital Sign-Off Executed)",
      remarks: `${remarks} [Digital Token: ${certRef} (Simulated prototype e-Sign)] - Sanctioned net payable: ₹${bill.netPayable.toLocaleString('en-IN')}/- under Budget Head 2408-Civil Supplies.`
    });

    this.addNotification({
      title: "Financial Sanction Granted",
      message: `General Manager approved Bill ${billId} for ₹${bill.netPayable.toLocaleString('en-IN')}. Sent to Finance.`,
      type: "success"
    });

    this.saveState();
    return { success: true, message: "Financial sanction granted and bill transferred to Finance." };
  }

  disbursePayment(billId, utrNumber = "", mode = "IFMS-Gujarat RTGS Gateway") {
    const role = this.getCurrentRole();
    if (!role || (role.id !== "finance" && role.id !== "admin")) {
      const msg = "Permission Denied: Only Finance Officers (or Admin) are authorized to disburse treasury payments.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    // Prerequisite: Must be approved by GM
    if (bill.status !== "Sent to Finance" || !bill.auditChecklist.sanctionOrderApproved) {
      const msg = "Disbursement Blocked: Bill has not received General Manager financial sanction order.";
      this.addNotification({ title: "Sanction Missing", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    if (bill.exception && bill.exception.active) {
      const msg = "Disbursement Blocked: Bill has an unresolved exception.";
      this.addNotification({ title: "Exception Active", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

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
      officer: role.officer,
      designation: role.designation,
      action: "Treasury Disbursement Executed",
      remarks: `Net payment of ₹${bill.netPayable.toLocaleString('en-IN')}/- successfully transmitted to ${bill.supplierBank.bankName} (A/c: ${bill.supplierBank.accountNo}). UTR Ref: ${finalUtr}. Voucher: ${voucherNo}.`
    });

    this.addNotification({
      title: "Payment Disbursed Successfully",
      message: `Voucher ${voucherNo} of ₹${bill.netPayable.toLocaleString('en-IN')} paid. UTR: ${finalUtr}.`,
      type: "success"
    });

    this.saveState();
    return { success: true, message: `Payment disbursed. UTR: ${finalUtr}.` };
  }

  raiseException(billId, exceptionData) {
    const role = this.getCurrentRole();
    if (!role || role.id === 'supplier') {
      const msg = "Permission Denied: Suppliers cannot flag official audit exceptions.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.status = "Exception Raised";
    bill.statusColor = "rose";
    bill.currentStage = "Returned for Correction";
    bill.publicRemark = `Returned for Correction: ${exceptionData.reason}`;
    bill.auditChecklist.qualityReportCompliant = false;

    bill.exception = {
      active: true,
      type: exceptionData.type || "QUALITY_DISCREPANCY",
      reason: exceptionData.reason,
      code: exceptionData.code || "EXC-GEN-01",
      raisedBy: `${role.officer} (${role.designation})`,
      raisedByRole: role.id,
      raisedOn: dateStr,
      severity: exceptionData.severity || "Medium",
      measuredMoisture: exceptionData.measuredMoisture || null,
      ceilingMoisture: exceptionData.ceilingMoisture || null,
      excessMoisture: exceptionData.excessMoisture || null,
      proposedDeduction: Number(exceptionData.proposedDeduction || 0),
      calculationRule: exceptionData.calculationRule || "GSCSCL Agmark Schedule: ₹12.50 per quintal per 1.0% excess moisture.",
      supportingEvidence: exceptionData.supportingEvidence || "Standard Weighbridge & Lab Inspection Slip",
      responsibleDepartment: "Pre-Audit Branch & Godown Operations",
      verifyingDepartment: "pre_audit",
      authorizingRole: "general_manager",
      departmentStatus: {
        godownVerification: { status: "Verified", officer: role.officer, date: dateStr, remarks: "Exception identified during inward check." },
        preAuditVerification: { status: "Pending", officer: null, date: null, remarks: "Audit verification of proposed deduction pending." },
        gmAuthorization: { status: "Pending", officer: null, date: null, remarks: "" }
      },
      resolutionStatus: "PENDING_VERIFICATION",
      resolutionNotes: "",
      history: [
        {
          timestamp: `${dateStr} ${timeStr}`,
          officer: `${role.officer} (${role.designation})`,
          action: `Exception Flagged [${exceptionData.code || "EXC-GEN-01"}]`,
          remarks: exceptionData.reason,
          stage: "Exception Inception"
        }
      ]
    };

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: `Exception Flagged [${bill.exception.code}]`,
      remarks: `Bill flagged with exception: ${exceptionData.reason}. Severity: ${bill.exception.severity}. Returned for clarification.`
    });

    this.addNotification({
      title: "Bill Returned for Correction",
      message: `Bill ${billId} returned: ${exceptionData.reason.substring(0, 50)}...`,
      type: "warning"
    });

    this.saveState();
    return { success: true, message: "Exception raised successfully." };
  }

  // =============================================================
  // SEPARATED EXCEPTION DECISION METHODS (RBAC ENFORCED)
  // =============================================================

  verifyExceptionByPreAudit(billId, data = {}) {
    const role = this.getCurrentRole();
    if (!role || (role.id !== "pre_audit" && role.id !== "admin")) {
      const msg = "Permission Denied: Only Pre-Audit staff (or Admin) are authorized to verify exception calculations.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    if (!bill.exception || !bill.exception.active) {
      const msg = "Invalid State: No active exception to verify on this bill.";
      this.addNotification({ title: "Invalid State", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const proposed = Number(data.proposedDeduction !== undefined ? data.proposedDeduction : (bill.exception.proposedDeduction || 0));
    if (isNaN(proposed) || proposed < 0) {
      const msg = "Invalid Deduction Amount: Deduction cannot be negative.";
      this.addNotification({ title: "Validation Error", message: msg, type: "error" });
      return { success: false, message: msg };
    }

    if (proposed > bill.grossAmount) {
      const msg = "Invalid Deduction Amount: Deduction cannot exceed gross bill amount.";
      this.addNotification({ title: "Validation Error", message: msg, type: "error" });
      return { success: false, message: msg };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.exception.proposedDeduction = proposed;
    if (!bill.exception.departmentStatus) {
      bill.exception.departmentStatus = {};
    }
    bill.exception.departmentStatus.preAuditVerification = {
      status: "Verified",
      officer: role.officer,
      date: dateStr,
      remarks: data.remarks || "Audit verification of deduction schedule and supplier explanation completed."
    };
    bill.exception.resolutionStatus = "AWAITING_GM_AUTHORIZATION";

    if (!bill.exception.history) bill.exception.history = [];
    bill.exception.history.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: `${role.officer} (${role.designation})`,
      action: "Pre-Audit Exception Verification Completed",
      remarks: data.remarks || `Audit verified proposed deduction ₹${proposed.toLocaleString('en-IN')}. Submitted to General Manager.`,
      stage: "Pre-Audit Verification"
    });

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: "Pre-Audit Exception Verification Cleared",
      remarks: `Pre-Audit verified exception calculation: Proposed deduction ₹${proposed.toLocaleString('en-IN')}. Recommended for General Manager executive authorization.`
    });

    this.addNotification({
      title: "Pre-Audit Verification Complete",
      message: `Exception on Bill ${billId} verified by Pre-Audit. Submitted for GM authorization.`,
      type: "info"
    });

    this.saveState();
    return { success: true, message: "Exception verified by Pre-Audit. Ready for GM authorization." };
  }

  authorizeExceptionByGM(billId, data = {}) {
    const role = this.getCurrentRole();
    if (!role || (role.id !== "general_manager" && role.id !== "admin")) {
      const msg = "Permission Denied: Only the General Manager (or Admin) is authorized to authorize exceptions and quality deductions.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    if (!bill.exception || !bill.exception.active) {
      const msg = "Invalid State: No active exception to authorize on this bill.";
      this.addNotification({ title: "Invalid State", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    // Prerequisite: Departmental Verification by Pre-Audit
    const preAuditStatus = bill.exception.departmentStatus?.preAuditVerification?.status;
    if (preAuditStatus !== "Verified") {
      const msg = "Cannot Authorize: Branch / Pre-Audit branch has not yet verified this exception. Departmental clearance is required before GM executive decision.";
      this.addNotification({ title: "Prerequisite Pending", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    if (!data.justification || data.justification.trim().length < 5) {
      const msg = "Mandatory Requirement: Detailed executive justification must be provided for GM exception authorization.";
      this.addNotification({ title: "Justification Required", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const authorizedDeduction = Number(data.authorizedDeduction !== undefined ? data.authorizedDeduction : (bill.exception.proposedDeduction || 0));
    if (isNaN(authorizedDeduction) || authorizedDeduction < 0) {
      const msg = "Invalid Deduction Amount: Authorized deduction cannot be negative.";
      this.addNotification({ title: "Validation Error", message: msg, type: "error" });
      return { success: false, message: msg };
    }

    if (authorizedDeduction > bill.grossAmount) {
      const msg = "Invalid Deduction Amount: Authorized deduction cannot exceed gross bill amount.";
      this.addNotification({ title: "Validation Error", message: msg, type: "error" });
      return { success: false, message: msg };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Apply the authorized deduction
    if (bill.exception.type === "MOISTURE_EXCESS" || bill.exception.code === "EXC-MOISTURE-EXCEEDED") {
      bill.deductions.moistureDeduction = authorizedDeduction;
    } else if (bill.exception.type === "QTY_MISMATCH" || bill.exception.code === "EXC-QTY-MISMATCH") {
      if (bill.exception.measuredQty) {
        bill.receivedQty = bill.exception.measuredQty;
      }
      bill.deductions.refractionCut = (bill.deductions.refractionCut || 0) + authorizedDeduction;
    } else {
      bill.deductions.otherRecovery = (bill.deductions.otherRecovery || 0) + authorizedDeduction;
    }

    // Recalculate net payable
    const totalDeductions = (bill.deductions.tds194Q || 0) + 
                            (bill.deductions.gstTds || 0) + 
                            (bill.deductions.moistureDeduction || 0) + 
                            (bill.deductions.refractionCut || 0) + 
                            (bill.deductions.otherRecovery || 0);
    bill.netPayable = Math.max(0, bill.grossAmount - totalDeductions);

    // Quality check passes once authorized deduction is accepted
    bill.auditChecklist.qualityReportCompliant = true;

    bill.exception.active = false;
    bill.exception.resolutionStatus = "AUTHORIZED";
    bill.exception.authorizedDeduction = authorizedDeduction;
    bill.exception.resolutionNotes = `Authorized by GM (${role.officer}): ${data.justification} [Authorized Quality Cut: ₹${authorizedDeduction.toLocaleString('en-IN')}]`;
    bill.exception.departmentStatus.gmAuthorization = {
      status: "Authorized",
      officer: role.officer,
      date: dateStr,
      remarks: data.justification
    };

    if (!bill.exception.history) bill.exception.history = [];
    bill.exception.history.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: `${role.officer} (${role.designation})`,
      action: "GM Exception Authorization Granted",
      remarks: `Deduction ₹${authorizedDeduction.toLocaleString('en-IN')} approved. Justification: ${data.justification}`,
      stage: "Executive Authorization"
    });

    bill.status = "Approval Pending";
    bill.statusColor = "purple";
    bill.currentStage = "Waiting for Approval";
    bill.publicRemark = `Exception authorized by General Manager with deduction of ₹${authorizedDeduction.toLocaleString('en-IN')}. Bill queued for executive financial sanction.`;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: "Exception Authorized by GM",
      remarks: `GM Authorization Granted: ${data.justification}. Authorized deduction applied: ₹${authorizedDeduction.toLocaleString('en-IN')}. Revised Net Payable: ₹${bill.netPayable.toLocaleString('en-IN')}/-. Positioned for Sanction Order sign-off.`
    });

    this.addNotification({
      title: "Exception Authorized by GM",
      message: `General Manager authorized exception on Bill ${billId} with deduction of ₹${authorizedDeduction.toLocaleString('en-IN')}.`,
      type: "success"
    });

    this.saveState();
    return { success: true, message: `Exception authorized with deduction of ₹${authorizedDeduction.toLocaleString('en-IN')}.` };
  }

  returnExceptionForClarification(billId, data = {}) {
    const role = this.getCurrentRole();
    if (!role || (role.id !== "general_manager" && role.id !== "pre_audit" && role.id !== "godown_manager" && role.id !== "admin")) {
      const msg = "Permission Denied: Unauthorized role attempted to return bill.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    if (!data.remarks || data.remarks.trim().length < 5) {
      const msg = "Mandatory Requirement: Remarks must be provided when returning for clarification.";
      this.addNotification({ title: "Remarks Required", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const targetDept = data.targetDepartment || "Responsible Branch / Supplier";
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.status = "Exception Raised";
    bill.statusColor = "rose";
    bill.currentStage = "Returned for Correction";
    bill.publicRemark = `Returned for Clarification (${targetDept}): ${data.remarks}`;

    if (!bill.exception) {
      bill.exception = { active: true, reason: data.remarks, code: "EXC-CLARIFICATION", history: [] };
    } else {
      bill.exception.active = true;
      bill.exception.resolutionStatus = "RETURNED_FOR_CLARIFICATION";
    }

    if (!bill.exception.history) bill.exception.history = [];
    bill.exception.history.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: `${role.officer} (${role.designation})`,
      action: "Returned for Clarification",
      remarks: `Target: ${targetDept} | Query: ${data.remarks}`,
      stage: "Clarification"
    });

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: "Returned for Clarification",
      remarks: `Returned to ${targetDept}: "${data.remarks}". Bill moved to clarification queue.`
    });

    this.addNotification({
      title: "Bill Returned for Clarification",
      message: `Bill ${billId} returned to ${targetDept} by ${role.officer}.`,
      type: "info"
    });

    this.saveState();
    return { success: true, message: `Bill returned for clarification to ${targetDept}.` };
  }

  rejectExceptionDecision(billId, data = {}) {
    const role = this.getCurrentRole();
    if (!role || (role.id !== "general_manager" && role.id !== "admin")) {
      const msg = "Permission Denied: Only General Manager (or Admin) can reject exception resolutions.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    if (!data.reason || data.reason.trim().length < 5) {
      const msg = "Mandatory Requirement: Detailed rejection reason required.";
      this.addNotification({ title: "Reason Required", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (bill.exception) {
      bill.exception.active = true;
      bill.exception.resolutionStatus = "REJECTED";
      if (!bill.exception.departmentStatus) bill.exception.departmentStatus = {};
      bill.exception.departmentStatus.gmAuthorization = {
        status: "Rejected",
        officer: role.officer,
        date: dateStr,
        remarks: data.reason
      };

      if (!bill.exception.history) bill.exception.history = [];
      bill.exception.history.push({
        timestamp: `${dateStr} ${timeStr}`,
        officer: `${role.officer} (${role.designation})`,
        action: "Exception Resolution Rejected",
        remarks: `Rejection Reason: ${data.reason}`,
        stage: "Executive Rejection"
      });
    }

    bill.publicRemark = `Exception resolution rejected by General Manager: ${data.reason}`;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: "Exception Resolution Rejected",
      remarks: `GM Rejection: ${data.reason}. Consignment deduction or waiver rejected. Case referred back for inquiry.`
    });

    this.addNotification({
      title: "Exception Resolution Rejected",
      message: `General Manager rejected exception resolution on Bill ${billId}.`,
      type: "warning"
    });

    this.saveState();
    return { success: true, message: "Exception resolution rejected." };
  }

  resumeWorkflowAfterException(billId, targetStage = "Pre-Audit") {
    const role = this.getCurrentRole();
    if (!role || (role.id !== "general_manager" && role.id !== "pre_audit" && role.id !== "admin")) {
      const msg = "Permission Denied: Only General Manager, Pre-Audit (or Admin) can resume workflow.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    // Strict Rule: Cannot resume while an exception is active
    if (bill.exception && bill.exception.active) {
      const msg = "Action Blocked: Exception is still active and unresolved. It must be authorized or resolved before advancing the workflow.";
      this.addNotification({ title: "Exception Active", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    if (targetStage === "Approval Pending") {
      if (!bill.auditChecklist.weighmentSlipVerified || !bill.auditChecklist.statutoryDeductionsCorrect) {
        const msg = "Prerequisite Incomplete: Cannot advance to Approval Pending without Godown and Pre-Audit clearance.";
        this.addNotification({ title: "Prerequisite Incomplete", message: msg, type: "warning" });
        return { success: false, message: msg };
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.status = targetStage;
    bill.statusColor = targetStage === "Approval Pending" ? "purple" : "emerald";
    bill.currentStage = targetStage === "Approval Pending" ? "Waiting for Approval" : "Branch / Pre-Audit Verification";
    bill.publicRemark = `Workflow resumed to ${targetStage} following authorized exception resolution.`;
    bill.daysInStage = 0;

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: `Workflow Resumed to ${targetStage}`,
      remarks: `Exception resolved and verified. Bill workflow resumed to ${targetStage}.`
    });

    this.addNotification({
      title: "Workflow Resumed",
      message: `Bill ${billId} resumed to ${targetStage}.`,
      type: "success"
    });

    this.saveState();
    return { success: true, message: `Workflow resumed to ${targetStage}.` };
  }

  reopenResolvedException(billId, data = {}) {
    const role = this.getCurrentRole();
    if (!role || (role.id !== "general_manager" && role.id !== "admin")) {
      const msg = "Permission Denied: Only General Manager (or Admin) can reopen a resolved exception.";
      this.addNotification({ title: "Permission Denied", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const bill = this.getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    if (!data.reason || data.reason.trim().length < 5) {
      const msg = "Mandatory Requirement: Reason for reopening must be recorded.";
      this.addNotification({ title: "Reason Required", message: msg, type: "warning" });
      return { success: false, message: msg };
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!bill.exception) {
      bill.exception = { reason: data.reason, code: "EXC-REOPENED" };
    }
    bill.exception.active = true;
    bill.exception.resolutionStatus = "REOPENED_FOR_REVIEW";
    bill.status = "Exception Raised";
    bill.statusColor = "rose";
    bill.currentStage = "Exception Management Hub";
    bill.auditChecklist.sanctionOrderApproved = false;
    bill.publicRemark = `Exception reopened by General Manager for review: ${data.reason}`;

    if (!bill.exception.history) bill.exception.history = [];
    bill.exception.history.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: `${role.officer} (${role.designation})`,
      action: "Exception Reopened",
      remarks: data.reason,
      stage: "Reopened / Under Re-examination"
    });

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: role.officer,
      designation: role.designation,
      action: "Exception Reopened by GM",
      remarks: `Resolved exception reopened by General Manager: "${data.reason}". Sanction order revoked for re-examination.`
    });

    this.addNotification({
      title: "Exception Reopened",
      message: `Exception on Bill ${billId} reopened by General Manager.`,
      type: "warning"
    });

    this.saveState();
    return { success: true, message: "Exception reopened for review." };
  }

  // Backward compatibility wrapper
  resolveException(billId, resolutionData = {}) {
    return this.authorizeExceptionByGM(billId, {
      justification: resolutionData.notes || "Authorized through legacy resolve interface.",
      authorizedDeduction: resolutionData.penaltyCut || 0
    });
  }
}

// Global App State Instance

// Global App State Instance
const AppState = new AppStateManager();
