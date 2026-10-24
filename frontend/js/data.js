/**
 * GSCSCL - Automated Commodity Supplier Billing & Payment Processing System
 * Mock Master Data & Sample Records with Role Credentials
 */

const GSCSCL_DATA = {
  roles: [
    {
      id: "supplier",
      username: "SUP-881",
      password: "Vendor@2026",
      roleCode: "VND-GJ",
      name: "Supplier / Vendor",
      gujaratiName: "પુરવઠાદાર / વેન્ડર",
      officer: "Shree Gujarat Agro Commodities FPO Ltd.",
      designation: "Registered Vendor (ID: SUP-GJ-2026-881)",
      department: "Vendor Self-Service Portal",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
      color: "blue",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200"
    },
    {
      id: "godown_manager",
      username: "GDN-AHM-01",
      password: "Godown@2026",
      roleCode: "GDN-MGR",
      name: "Godown Manager",
      gujaratiName: "ગોડાઉન મેનેજર / વેરહાઉસ ઇન્ચાર્જ",
      officer: "R. K. Patel",
      designation: "Assistant Manager (Godown Operations)",
      department: "GSCSCL Central Godown, Sanand (Ahmedabad)",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
      color: "amber",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200"
    },
    {
      id: "pre_audit",
      username: "AUD-HQ-04",
      password: "Audit@2026",
      roleCode: "AUD-OFF",
      name: "Branch / Pre-Audit Staff",
      gujaratiName: "શાખા / પ્રી-ઓડિટ સ્ટાફ",
      officer: "Hasmukhbhai Shah",
      designation: "Senior Accounts Officer & Pre-Auditor",
      department: "District Audit Cell, Gandhinagar Head Office",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
      color: "emerald",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200"
    },
    {
      id: "general_manager",
      username: "GM-SANCTION",
      password: "Admin@2026",
      roleCode: "GM-PROC",
      name: "General Manager",
      gujaratiName: "જનરલ મેનેજર (ખરીદ અને વિત્ત)",
      officer: "Dr. V. M. Jadeja, GAS",
      designation: "General Manager (Procurement & Sanctions)",
      department: "Corporate Headquarters, Sector-10A, Gandhinagar",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
      color: "purple",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200"
    },
    {
      id: "finance",
      username: "FIN-TREASURY",
      password: "Finance@2026",
      roleCode: "FIN-CAO",
      name: "Finance Branch",
      gujaratiName: "નાણાં શાખા / તિજોરી એકમ",
      officer: "Nilesh M. Trivedi",
      designation: "Chief Accounts Officer (Treasury & IFMS Cell)",
      department: "Finance & Disbursement Wing, GSCSCL Bhavan",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=faces",
      color: "indigo",
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200"
    },
    {
      id: "admin",
      username: "MD-MONITOR",
      password: "Oversight@2026",
      roleCode: "MD-CELL",
      name: "Management / Admin Monitor",
      gujaratiName: "સંચાલન અને દેખરેખ વહીવટકર્તા",
      officer: "Executive Monitoring Cell",
      designation: "Managing Director Dashboard & Oversight",
      department: "Food, Civil Supplies & Consumer Affairs Dept.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces",
      color: "slate",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300"
    }
  ],

  districts: [
    "Gandhinagar", "Ahmedabad", "Rajkot", "Surat", "Vadodara", "Mehsana", 
    "Junagadh", "Banaskantha", "Bhavnagar", "Amreli", "Patan", "Anand"
  ],

  godowns: [
    { id: "GDN-AHM-01", name: "GSCSCL Central Godown, Sanand", district: "Ahmedabad", capacityMT: 15000 },
    { id: "GDN-GNR-01", name: "State Base Godown, Sector-28", district: "Gandhinagar", capacityMT: 22000 },
    { id: "GDN-RJK-01", name: "District Godown, Gondal Road", district: "Rajkot", capacityMT: 18000 },
    { id: "GDN-SRT-01", name: "Regional Godown, Olpad", district: "Surat", capacityMT: 12000 },
    { id: "GDN-MSH-01", name: "Taluka Godown, Unjha Mandi", district: "Mehsana", capacityMT: 14000 },
    { id: "GDN-VAD-01", name: "District Base Godown, Makarpura", district: "Vadodara", capacityMT: 16000 }
  ],

  commodities: {
    CGP: [
      { name: "Wheat (FAQ Grade) / ઘઉં", defaultRate: 2275, unit: "Quintal", standardMoisture: 12.0 },
      { name: "Wheat (Sharbati Premium) / શરબતી ઘઉં", defaultRate: 2650, unit: "Quintal", standardMoisture: 12.0 },
      { name: "Paddy (Common / Dhan) / ડાંગર", defaultRate: 2183, unit: "Quintal", standardMoisture: 14.0 },
      { name: "Tuver Dal (Desi FAQ) / તુવેર દાળ", defaultRate: 7000, unit: "Quintal", standardMoisture: 10.0 },
      { name: "Chana Whole (Bengal Gram) / દેશી ચણા", defaultRate: 5440, unit: "Quintal", standardMoisture: 11.0 },
      { name: "Bajra (Hybrid Pearl Millet) / બાજરી", defaultRate: 2500, unit: "Quintal", standardMoisture: 12.5 },
      { name: "Fortified Rice Kernels (FRK) / ફોર્ટિફાઇડ ચોખા", defaultRate: 4200, unit: "Quintal", standardMoisture: 13.0 }
    ],
    TOC: [
      { name: "Double Fortified Iodized Salt (1kg Packets)", defaultRate: 980, unit: "Quintal", standardMoisture: 3.0 },
      { name: "Fortified Refined Cottonseed Oil (1L Pouch)", defaultRate: 11500, unit: "Quintal", standardMoisture: 0.5 },
      { name: "50kg HDPE/PP Woven Sacks (ISI Marked)", defaultRate: 28.5, unit: "Bags", standardMoisture: 0 },
      { name: "High Density Tarpaulin Covers (30x30 ft)", defaultRate: 3450, unit: "Pieces", standardMoisture: 0 }
    ]
  },

  // Available Digital Godown Receipts (GRNs) ready to be invoiced by suppliers
  availableGRNs: [
    {
      grnNumber: "GRN-GJ-2026-9088",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-GNR-01",
      godownName: "State Base Godown, Sector-28, Gandhinagar",
      district: "Gandhinagar",
      category: "CGP",
      commodity: "Wheat (FAQ Grade) / ઘઉં",
      poNumber: "PO/GSCSCL/2026/MSP-841",
      inwardDate: "2026-10-18",
      truckNumber: "GJ-18-AZ-4421",
      weighbridgeSlipNo: "WB-26-84902",
      grossWeightKg: 42800,
      tareWeightKg: 12800,
      netWeightKg: 30000,
      quantityQuintals: 300.0,
      bagsCount: 600,
      moisturePercent: 11.4,
      qualityStatus: "Passed - Lab Grade A (Agmark Approved)",
      alreadyBilled: false
    },
    {
      grnNumber: "GRN-GJ-2026-9092",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      category: "CGP",
      commodity: "Tuver Dal (Desi FAQ) / તુવેર દાળ",
      poNumber: "PO/GSCSCL/2026/PDS-102",
      inwardDate: "2026-10-19",
      truckNumber: "GJ-01-CU-9012",
      weighbridgeSlipNo: "WB-26-85112",
      grossWeightKg: 28500,
      tareWeightKg: 10500,
      netWeightKg: 18000,
      quantityQuintals: 180.0,
      bagsCount: 360,
      moisturePercent: 9.8,
      qualityStatus: "Passed - Physical & Lab Inspection Clear",
      alreadyBilled: false
    },
    {
      grnNumber: "GRN-GJ-2026-9095",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-RJK-01",
      godownName: "District Godown, Gondal Road, Rajkot",
      district: "Rajkot",
      category: "TOC",
      commodity: "Double Fortified Iodized Salt (1kg Packets)",
      poNumber: "PO/GSCSCL/2026/SALT-39",
      inwardDate: "2026-10-20",
      truckNumber: "GJ-03-BW-7733",
      weighbridgeSlipNo: "WB-26-85204",
      grossWeightKg: 34000,
      tareWeightKg: 14000,
      netWeightKg: 20000,
      quantityQuintals: 200.0,
      bagsCount: 400,
      moisturePercent: 2.4,
      qualityStatus: "Passed - Standard Iodine Titration Test",
      alreadyBilled: false
    }
  ],

  // Initial Seed Bills Database
  initialBills: [
    // 1. Supplier Bill: Payment Completed
    {
      id: "GSCSCL-2026-B001",
      grnNumber: "GRN-GJ-2026-8821",
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
      poNumber: "PO/GSCSCL/2026/MSP-670",
      invoiceNumber: "SGAC/26/0419",
      invoiceDate: "2026-10-08",
      submissionDate: "2026-10-09",
      district: "Gandhinagar",
      godownName: "State Base Godown, Sector-28",
      category: "CGP",
      commodity: "Wheat (FAQ Grade) / ઘઉં",
      receivedQty: 1250.0,
      billedQty: 1250.0,
      unit: "Quintal",
      ratePerUnit: 2275.0,
      grossAmount: 2843750.0,
      deductions: {
        tds194Q: 2844.0,
        gstTds: 56875.0,
        moistureDeduction: 0.0,
        refractionCut: 5000.0,
        otherRecovery: 0.0
      },
      netPayable: 2779031.0,
      status: "Payment Processed",
      statusColor: "emerald",
      currentStage: "Payment Completed",
      publicRemark: "Payment successfully transferred via IFMS RTGS to State Bank of India account.",
      daysInStage: 0,
      isDelayed: false,
      auditChecklist: {
        weighmentSlipVerified: true,
        qualityReportCompliant: true,
        gstinActive: true,
        statutoryDeductionsCorrect: true,
        sanctionOrderApproved: true,
        noDualClaimCertified: true
      },
      queries: [],
      notingSheet: [
        {
          timestamp: "2026-10-09 10:15 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Online submission completed with attached Tax Invoice SGAC/26/0419 and Weighbridge Slips."
        },
        {
          timestamp: "2026-10-10 02:30 PM",
          officer: "R. K. Patel",
          designation: "Godown Manager, Sec-28",
          action: "Goods Inward Verified",
          remarks: "Physical consignment of 1250 Qtl FAQ Wheat received in good condition. Agmark moisture report 11.2% (Norm <=12%). Passed."
        },
        {
          timestamp: "2026-10-12 11:45 AM",
          officer: "Hasmukhbhai Shah",
          designation: "Senior Pre-Auditor",
          action: "Pre-Audit Verification Passed",
          remarks: "3-Way matching verified between PO-670, GRN-8821 and Invoice. GST TDS @ 2% and Sec 194Q TDS deducted. Refraction cut ₹5,000 adjusted for dead grains. Put up to GM for approval."
        },
        {
          timestamp: "2026-10-14 04:15 PM",
          officer: "Dr. V. M. Jadeja, GAS",
          designation: "General Manager",
          action: "Sanction Granted",
          remarks: "Financial sanction accorded for net amount of ₹27,79,031/- under Budget Head: Food Civil Supplies 2408-PDS Procurement. Forwarded to Finance."
        },
        {
          timestamp: "2026-10-17 01:20 PM",
          officer: "Nilesh M. Trivedi",
          designation: "Chief Accounts Officer",
          action: "Treasury Disbursement Executed",
          remarks: "Payment cleared via IFMS-Gujarat RTGS Gateway. UTR #CMS9048127599 generated."
        }
      ],
      paymentDetails: {
        utrNumber: "CMS9048127599",
        paymentDate: "2026-10-17",
        paymentMode: "IFMS-Gujarat PFMS / RTGS",
        voucherNumber: "GSCSCL/FIN/2026/V-4091"
      },
      exception: {
        active: false,
        reason: "",
        code: "",
        raisedBy: "",
        raisedOn: "",
        severity: "",
        resolutionNotes: ""
      }
    },

    // 2. Supplier Bill: Waiting for Approval
    {
      id: "GSCSCL-2026-B003",
      grnNumber: "GRN-GJ-2026-8945",
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
      poNumber: "PO/GSCSCL/2026/MSP-841",
      invoiceNumber: "SGAC/26/0430",
      invoiceDate: "2026-10-13",
      submissionDate: "2026-10-14",
      district: "Mehsana",
      godownName: "Taluka Godown, Unjha Mandi",
      category: "CGP",
      commodity: "Chana Whole (Bengal Gram) / દેશી ચણા",
      receivedQty: 800.0,
      billedQty: 800.0,
      unit: "Quintal",
      ratePerUnit: 5440.0,
      grossAmount: 4352000.0,
      deductions: {
        tds194Q: 4352.0,
        gstTds: 87040.0,
        moistureDeduction: 0.0,
        refractionCut: 8000.0,
        otherRecovery: 0.0
      },
      netPayable: 4252608.0,
      status: "Approval Pending",
      statusColor: "purple",
      currentStage: "Waiting for Approval",
      publicRemark: "Pre-audit verification passed. Waiting for General Manager sanction.",
      daysInStage: 3,
      isDelayed: false,
      auditChecklist: {
        weighmentSlipVerified: true,
        qualityReportCompliant: true,
        gstinActive: true,
        statutoryDeductionsCorrect: true,
        sanctionOrderApproved: false,
        noDualClaimCertified: true
      },
      queries: [],
      notingSheet: [
        {
          timestamp: "2026-10-14 09:40 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Chana procurement invoice uploaded under Rabi Season scheme."
        },
        {
          timestamp: "2026-10-15 04:30 PM",
          officer: "B. P. Chaudhary",
          designation: "Godown Manager, Unjha",
          action: "Stock Inward Cleared",
          remarks: "Weighbridge slips and moisture 10.5% certified."
        },
        {
          timestamp: "2026-10-18 02:10 PM",
          officer: "Hasmukhbhai Shah",
          designation: "Senior Pre-Auditor",
          action: "Pre-Audit Passed",
          remarks: "Pre-Audit checklist verified. Recommended for GM approval."
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
    },

    // 3. Supplier Bill: Returned for Correction
    {
      id: "GSCSCL-2026-B008",
      grnNumber: "GRN-GJ-2026-9033",
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
      poNumber: "PO/GSCSCL/2026/MSP-899",
      invoiceNumber: "SGAC/26/0442",
      invoiceDate: "2026-10-16",
      submissionDate: "2026-10-17",
      district: "Ahmedabad",
      godownName: "GSCSCL Central Godown, Sanand",
      category: "CGP",
      commodity: "Paddy (Common / Dhan) / ડાંગર",
      receivedQty: 1100.0,
      billedQty: 1100.0,
      unit: "Quintal",
      ratePerUnit: 2183.0,
      grossAmount: 2401300.0,
      deductions: {
        tds194Q: 2401.0,
        gstTds: 48026.0,
        moistureDeduction: 12500.0,
        refractionCut: 3500.0,
        otherRecovery: 0.0
      },
      netPayable: 2334873.0,
      status: "Exception Raised",
      statusColor: "rose",
      currentStage: "Returned for Correction",
      publicRemark: "Returned: Moisture content recorded at 15.6% exceeds 14.0% norm. Please confirm moisture deduction agreement or submit revised test certificate.",
      daysInStage: 3,
      isDelayed: false,
      auditChecklist: {
        weighmentSlipVerified: true,
        qualityReportCompliant: false,
        gstinActive: true,
        statutoryDeductionsCorrect: false,
        sanctionOrderApproved: false,
        noDualClaimCertified: false
      },
      queries: [
        {
          id: "Q-101",
          query: "We have re-verified sample #2 from Sanand godown. How can we proceed with the quality adjustment?",
          date: "2026-10-19 11:20 AM",
          status: "Answered",
          reply: "Official Reply: Please click 'Correct & Resubmit' on this bill and accept the proposed moisture deduction cut of ₹12,500."
        }
      ],
      notingSheet: [
        {
          timestamp: "2026-10-17 11:15 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Bill submitted for 1100 Qtl Paddy."
        },
        {
          timestamp: "2026-10-18 05:00 PM",
          officer: "R. K. Patel",
          designation: "Godown Manager, Sanand",
          action: "Returned for Correction",
          remarks: "Moisture content recorded at 15.6% (Standard ceiling is 14.0%). Returned to vendor for revised documentation or deduction consent."
        }
      ],
      paymentDetails: null,
      exception: {
        active: true,
        reason: "Moisture Content (15.6%) exceeds statutory standard ceiling (14.0%). Consignment returned for supplier clarification or deduction consent.",
        code: "EXC-MOISTURE-EXCEEDED",
        raisedBy: "R. K. Patel (Godown Manager)",
        raisedOn: "2026-10-18",
        severity: "Medium",
        resolutionNotes: ""
      }
    },

    // 4. Supplier Bill: Waiting for Verification
    {
      id: "GSCSCL-2026-B009",
      grnNumber: "GRN-GJ-2026-9064",
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
      poNumber: "PO/GSCSCL/2026/PDS-561",
      invoiceNumber: "SGAC/26/0455",
      invoiceDate: "2026-10-20",
      submissionDate: "2026-10-21",
      district: "Gandhinagar",
      godownName: "State Base Godown, Sector-28",
      category: "CGP",
      commodity: "Fortified Rice Kernels (FRK) / ફોર્ટિફાઇડ ચોખા",
      receivedQty: 500.0,
      billedQty: 500.0,
      unit: "Quintal",
      ratePerUnit: 4200.0,
      grossAmount: 2100000.0,
      deductions: {
        tds194Q: 2100.0,
        gstTds: 42000.0,
        moistureDeduction: 0.0,
        refractionCut: 0.0,
        otherRecovery: 0.0
      },
      netPayable: 2055900.0,
      status: "Submitted",
      statusColor: "blue",
      currentStage: "Waiting for Verification",
      publicRemark: "Bill received online. Waiting for godown manager to complete inward inspection.",
      daysInStage: 1,
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
          timestamp: "2026-10-21 09:20 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "FRK supply bill uploaded under PM Poshan fortification initiative."
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
    },

    // 5. Supplier Bill: Approved / Payment in Process
    {
      id: "GSCSCL-2026-B010",
      grnNumber: "GRN-GJ-2026-8998",
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
      poNumber: "PO/GSCSCL/2026/MSP-771",
      invoiceNumber: "SGAC/26/0438",
      invoiceDate: "2026-10-12",
      submissionDate: "2026-10-13",
      district: "Gandhinagar",
      godownName: "State Base Godown, Sector-28",
      category: "CGP",
      commodity: "Wheat (Sharbati Premium) / શરબતી ઘઉં",
      receivedQty: 900.0,
      billedQty: 900.0,
      unit: "Quintal",
      ratePerUnit: 2650.0,
      grossAmount: 2385000.0,
      deductions: {
        tds194Q: 2385.0,
        gstTds: 47700.0,
        moistureDeduction: 0.0,
        refractionCut: 2000.0,
        otherRecovery: 0.0
      },
      netPayable: 2334915.0,
      status: "Sent to Finance",
      statusColor: "indigo",
      currentStage: "Payment in Process",
      publicRemark: "Sanctioned by General Manager. Payment transmission queued at Finance Branch.",
      daysInStage: 2,
      isDelayed: false,
      auditChecklist: {
        weighmentSlipVerified: true,
        qualityReportCompliant: true,
        gstinActive: true,
        statutoryDeductionsCorrect: true,
        sanctionOrderApproved: true,
        noDualClaimCertified: true
      },
      queries: [],
      notingSheet: [
        {
          timestamp: "2026-10-13 10:15 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Bill submitted for 900 Qtl Premium Sharbati Wheat."
        },
        {
          timestamp: "2026-10-15 03:00 PM",
          officer: "R. K. Patel",
          designation: "Godown Manager, Sec-28",
          action: "Stock Verified",
          remarks: "Grade A grain luster verified. Moisture 11.0%."
        },
        {
          timestamp: "2026-10-17 04:30 PM",
          officer: "Hasmukhbhai Shah",
          designation: "Senior Pre-Auditor",
          action: "Pre-Audit Passed",
          remarks: "All statutory checks validated. Forwarded to GM for financial sanction."
        },
        {
          timestamp: "2026-10-19 02:00 PM",
          officer: "Dr. V. M. Jadeja, GAS",
          designation: "General Manager",
          action: "Sanction Accorded",
          remarks: "Sanction approved. Forwarded to Finance for RTGS clearance."
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
    },

    // 6. Supplier Bill: Saved as Draft
    {
      id: "GSCSCL-2026-D001",
      grnNumber: "GRN-GJ-2026-9092",
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
      poNumber: "PO/GSCSCL/2026/PDS-102",
      invoiceNumber: "SGAC/26/0468",
      invoiceDate: "2026-10-23",
      submissionDate: "-",
      district: "Ahmedabad",
      godownName: "GSCSCL Central Godown, Sanand",
      category: "CGP",
      commodity: "Tuver Dal (Desi FAQ) / તુવેર દાળ",
      receivedQty: 180.0,
      billedQty: 180.0,
      unit: "Quintal",
      ratePerUnit: 7000.0,
      grossAmount: 1260000.0,
      deductions: {
        tds194Q: 1260.0,
        gstTds: 25200.0,
        moistureDeduction: 0.0,
        refractionCut: 0.0,
        otherRecovery: 0.0
      },
      netPayable: 1233540.0,
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
          timestamp: "2026-10-23 04:10 PM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Draft",
          action: "Draft Saved",
          remarks: "Bill draft created for 180 Qtl Tuver Dal. Awaiting final invoice upload."
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
    },

    // 7. Other Supplier Bill (Bhavnagar) - Not accessible by SUP-881
    {
      id: "GSCSCL-2026-B002",
      grnNumber: "GRN-GJ-2026-8914",
      supplierId: "SUP-GJ-2026-902",
      supplierName: "Bhavnagar Farmer Producer Co. Ltd.",
      supplierGstin: "24BBBF7890D1Z3",
      supplierPan: "BBBF7890D",
      supplierBank: {
        accountNo: "40810200001923",
        ifsc: "BARB0BHAVNA",
        bankName: "Bank of Baroda",
        branch: "Bhavnagar Mandi"
      },
      poNumber: "PO/GSCSCL/2026/PDS-412",
      invoiceNumber: "BFPC/OCT/26/18",
      invoiceDate: "2026-10-11",
      submissionDate: "2026-10-12",
      district: "Bhavnagar",
      godownName: "District Base Godown, Bhavnagar",
      category: "CGP",
      commodity: "Tuver Dal (Desi FAQ) / તુવેર દાળ",
      receivedQty: 450.0,
      billedQty: 450.0,
      unit: "Quintal",
      ratePerUnit: 7000.0,
      grossAmount: 3150000.0,
      deductions: {
        tds194Q: 3150.0,
        gstTds: 63000.0,
        moistureDeduction: 0.0,
        refractionCut: 0.0,
        otherRecovery: 0.0
      },
      netPayable: 3083850.0,
      status: "Sent to Finance",
      statusColor: "indigo",
      currentStage: "Finance Branch Disbursement",
      publicRemark: "Approved by GM. Sent to Finance for disbursement.",
      daysInStage: 2,
      isDelayed: false,
      auditChecklist: {
        weighmentSlipVerified: true,
        qualityReportCompliant: true,
        gstinActive: true,
        statutoryDeductionsCorrect: true,
        sanctionOrderApproved: true,
        noDualClaimCertified: true
      },
      queries: [],
      notingSheet: [
        {
          timestamp: "2026-10-12 11:30 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Bill submitted with GST e-Way Bill and mandi tax clearance."
        },
        {
          timestamp: "2026-10-13 03:00 PM",
          officer: "M. D. Gohil",
          designation: "Godown Manager, Bhavnagar",
          action: "Physical Verification Verified",
          remarks: "All 900 bags verified. Moisture 9.4%, nil foreign matter."
        },
        {
          timestamp: "2026-10-15 01:15 PM",
          officer: "Hasmukhbhai Shah",
          designation: "Senior Pre-Auditor",
          action: "Pre-Audit Complete",
          remarks: "Checked against sanction budget. Deductions computed accurately. Forwarded to GM."
        },
        {
          timestamp: "2026-10-19 11:00 AM",
          officer: "Dr. V. M. Jadeja, GAS",
          designation: "General Manager",
          action: "GM Sanction Approved",
          remarks: "Sanction approved. Passed for treasury processing."
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
    },

    // 8. Other Supplier Bill (Kutch Salt)
    {
      id: "GSCSCL-2026-B004",
      grnNumber: "GRN-GJ-2026-9011",
      supplierId: "SUP-GJ-2026-774",
      supplierName: "Kutch Salt & Marine Chemicals Corporation",
      supplierGstin: "24AABCK5566L1ZP",
      supplierPan: "AABCK5566L",
      supplierBank: {
        accountNo: "50100492817290",
        ifsc: "HDFC0000240",
        bankName: "HDFC Bank Ltd.",
        branch: "Gandhidham Kutch"
      },
      poNumber: "PO/GSCSCL/2026/SALT-19",
      invoiceNumber: "KSC/26/1092",
      invoiceDate: "2026-10-14",
      submissionDate: "2026-10-15",
      district: "Rajkot",
      godownName: "District Godown, Gondal Road",
      category: "TOC",
      commodity: "Double Fortified Iodized Salt (1kg Packets)",
      receivedQty: 1500.0,
      billedQty: 1500.0,
      unit: "Quintal",
      ratePerUnit: 980.0,
      grossAmount: 1470000.0,
      deductions: {
        tds194Q: 1470.0,
        gstTds: 29400.0,
        moistureDeduction: 0.0,
        refractionCut: 0.0,
        otherRecovery: 0.0
      },
      netPayable: 1439130.0,
      status: "Pre-Audit",
      statusColor: "emerald",
      currentStage: "Branch / Pre-Audit Verification",
      publicRemark: "Inward verified by godown manager. Pre-audit scrutiny in progress.",
      daysInStage: 4,
      isDelayed: false,
      auditChecklist: {
        weighmentSlipVerified: true,
        qualityReportCompliant: true,
        gstinActive: true,
        statutoryDeductionsCorrect: false,
        sanctionOrderApproved: false,
        noDualClaimCertified: false
      },
      queries: [],
      notingSheet: [
        {
          timestamp: "2026-10-15 11:00 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Iodized Salt delivery under Antyodaya Anna Yojana quota."
        },
        {
          timestamp: "2026-10-17 11:20 AM",
          officer: "S. N. Zala",
          designation: "Godown Manager, Gondal Road",
          action: "Physical Verification Cleared",
          remarks: "3,000 cartons checked. Iodine titration > 30 ppm verified."
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
    },

    // 9. Other Supplier Bill (Patan)
    {
      id: "GSCSCL-2026-B007",
      grnNumber: "GRN-GJ-2026-8977",
      supplierId: "SUP-GJ-2026-401",
      supplierName: "Patan District Farmer Co-Operative Union",
      supplierGstin: "24AAAAP1092M1ZV",
      supplierPan: "AAAAP1092M",
      supplierBank: {
        accountNo: "11223344556677",
        ifsc: "SBIN0000445",
        bankName: "State Bank of India",
        branch: "Patan Station Road"
      },
      poNumber: "PO/GSCSCL/2026/MSP-804",
      invoiceNumber: "PDFC/2026/78",
      invoiceDate: "2026-10-10",
      submissionDate: "2026-10-11",
      district: "Patan",
      godownName: "Taluka Godown, Unjha Mandi",
      category: "CGP",
      commodity: "Bajra (Hybrid Pearl Millet) / બાજરી",
      receivedQty: 920.0,
      billedQty: 960.0,
      unit: "Quintal",
      ratePerUnit: 2500.0,
      grossAmount: 2400000.0,
      deductions: {
        tds194Q: 2400.0,
        gstTds: 48000.0,
        moistureDeduction: 0.0,
        refractionCut: 0.0,
        otherRecovery: 0.0
      },
      netPayable: 2349600.0,
      status: "Exception Raised",
      statusColor: "rose",
      currentStage: "Exception Management Hub",
      publicRemark: "Returned for correction due to weight variance (+40 Qtl).",
      daysInStage: 5,
      isDelayed: true,
      auditChecklist: {
        weighmentSlipVerified: false,
        qualityReportCompliant: true,
        gstinActive: true,
        statutoryDeductionsCorrect: false,
        sanctionOrderApproved: false,
        noDualClaimCertified: false
      },
      queries: [],
      notingSheet: [
        {
          timestamp: "2026-10-11 10:00 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Invoice submitted for 960 Quintals Bajra."
        },
        {
          timestamp: "2026-10-13 02:40 PM",
          officer: "B. P. Chaudhary",
          designation: "Godown Manager, Unjha",
          action: "Discrepancy Flagged",
          remarks: "Physical weighbridge gross tare difference reveals net weight 920 Qtl. Supplier billed 960 Qtl (+40 Qtl variance > 4.1%). Flagged as critical exception."
        }
      ],
      paymentDetails: null,
      exception: {
        active: true,
        reason: "Quantity Mismatch: Physical weighment is 920.00 Qtl whereas Invoice claims 960.00 Qtl (Variance: +40 Qtl / +4.35%).",
        code: "EXC-QTY-MISMATCH",
        raisedBy: "B. P. Chaudhary (Godown Manager)",
        raisedOn: "2026-10-13",
        severity: "High",
        resolutionNotes: ""
      }
    }
  ]
};
