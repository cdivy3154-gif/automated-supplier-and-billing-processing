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
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
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
      name: "Pre-Audit Staff",
      gujaratiName: "પ્રી-ઓડિટ સ્ટાફ",
      officer: "Hasmukhbhai Shah",
      designation: "Senior Accounts Officer & Pre-Auditor",
      department: "Pre-Audit Scrutiny Cell, Gandhinagar Head Office",
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

  districtBranches: {
    "All Districts": ["All Branches"],
    "Vadodara": ["All Branches", "Waghodia", "Padra", "Karjan", "Savli", "Dabhoi", "Makarpura (Urban)"],
    "Gandhinagar": ["All Branches", "Gandhinagar HQ (Sector-28)", "Kalol", "Mansa", "Dehgam"],
    "Ahmedabad": ["All Branches", "Sanand Central", "Daskroi", "Dholka", "Viramgam", "Bavla"],
    "Rajkot": ["All Branches", "Gondal Road", "Rajkot Rural", "Jetpur", "Jasdan", "Dhoraji"],
    "Surat": ["All Branches", "Bardoli", "Olpad", "Mandvi", "Choryasi", "Kamrej"],
    "Mehsana": ["All Branches", "Kadi", "Visnagar", "Mehsana", "Unjha Mandi", "Becharaji"],
    "Junagadh": ["All Branches", "Keshod", "Mangrol", "Junagadh", "Manavadar", "Visavadar"],
    "Banaskantha": ["All Branches", "Palanpur", "Deesa", "Tharad", "Dhanera", "Vav"],
    "Bhavnagar": ["All Branches", "Mahuva", "Palitana", "Sihor", "Talaja", "Bhavnagar Base"],
    "Amreli": ["All Branches", "Amreli", "Dhari", "Savarkundla", "Rajula", "Babra"],
    "Patan": ["All Branches", "Patan", "Sidhpur", "Radhanpur", "Chanasma", "Harij"],
    "Anand": ["All Branches", "Anand", "Petlad", "Khambhat", "Borsad", "Umreth"]
  },

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

  // Supply Orders (Purchase Orders) assigned to godowns for commodity inward
  supplyOrders: [
    {
      orderNumber: "PO/GSCSCL/2026/PDS-102",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      category: "CGP",
      commodity: "Tuver Dal (Desi FAQ) / તુવેર દાળ",
      expectedQty: 200.0,
      deliveredQty: 180.0,
      remainingQty: 20.0,
      unit: "Quintal",
      orderDate: "2026-10-05",
      deliveryDueDate: "2026-10-25",
      orderStatus: "In Delivery",
      maxAllowedMoisture: 10.0,
      relatedDeliveries: ["DEL-2026-001"]
    },
    {
      orderNumber: "PO/GSCSCL/2026/MSP-842",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      category: "CGP",
      commodity: "Wheat (FAQ Grade) / ઘઉં",
      expectedQty: 250.0,
      deliveredQty: 0.0,
      remainingQty: 250.0,
      unit: "Quintal",
      orderDate: "2026-10-10",
      deliveryDueDate: "2026-10-28",
      orderStatus: "Active",
      maxAllowedMoisture: 12.0,
      relatedDeliveries: ["DEL-2026-002"]
    },
    {
      orderNumber: "PO/GSCSCL/2026/MSP-843",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      category: "CGP",
      commodity: "Chana Whole (Bengal Gram) / દેશી ચણા",
      expectedQty: 160.0,
      deliveredQty: 0.0,
      remainingQty: 160.0,
      unit: "Quintal",
      orderDate: "2026-10-12",
      deliveryDueDate: "2026-10-29",
      orderStatus: "Active",
      maxAllowedMoisture: 11.0,
      relatedDeliveries: ["DEL-2026-003"]
    },
    {
      orderNumber: "PO/GSCSCL/2026/OIL-55",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      category: "TOC",
      commodity: "Fortified Refined Cottonseed Oil (1L Pouch)",
      expectedQty: 120.0,
      deliveredQty: 120.0,
      remainingQty: 0.0,
      unit: "Quintal",
      orderDate: "2026-10-08",
      deliveryDueDate: "2026-10-26",
      orderStatus: "In Delivery",
      maxAllowedMoisture: 0.5,
      relatedDeliveries: ["DEL-2026-004"]
    },
    {
      orderNumber: "PO/GSCSCL/2026/MSP-845",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      category: "CGP",
      commodity: "Bajra (Hybrid Pearl Millet) / બાજરી",
      expectedQty: 150.0,
      deliveredQty: 0.0,
      remainingQty: 150.0,
      unit: "Quintal",
      orderDate: "2026-10-15",
      deliveryDueDate: "2026-11-02",
      orderStatus: "Active",
      maxAllowedMoisture: 12.5,
      relatedDeliveries: ["DEL-2026-005"]
    },
    {
      orderNumber: "PO/GSCSCL/2026/MSP-841",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-GNR-01",
      godownName: "State Base Godown, Sector-28, Gandhinagar",
      district: "Gandhinagar",
      category: "CGP",
      commodity: "Wheat (FAQ Grade) / ઘઉં",
      expectedQty: 300.0,
      deliveredQty: 300.0,
      remainingQty: 0.0,
      unit: "Quintal",
      orderDate: "2026-10-02",
      deliveryDueDate: "2026-10-20",
      orderStatus: "Completed",
      maxAllowedMoisture: 12.0,
      relatedDeliveries: ["DEL-GNR-001"]
    }
  ],

  // Physical Inward Deliveries arrived at godowns for verification & receipt issuance
  deliveries: [
    {
      deliveryId: "DEL-2026-001",
      orderNumber: "PO/GSCSCL/2026/PDS-102",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      commodity: "Tuver Dal (Desi FAQ) / તુવેર દાળ",
      category: "CGP",
      expectedQty: 180.0,
      actualQtyReceived: 180.0,
      unit: "Quintal",
      deliveryDate: "2026-10-19",
      truckNumber: "GJ-01-CU-9012",
      driverName: "Manishbhai Rabari",
      driverPhone: "+91 98251 77210",
      weighbridgeSlipNo: "WB-26-85112",
      grossWeightKg: 28500,
      tareWeightKg: 10500,
      netWeightKg: 18000,
      bagsCount: 360,
      moisturePercent: 9.8,
      maxAllowedMoisture: 10.0,
      stackingBay: "Bay 4 (Pulse Warehouse)",
      qualityPassed: true,
      qualityRemarks: "Physical sample clean, no infestation, compliant with Agmark standard.",
      deliveryStatus: "Receipt Issued",
      receiptId: "GRN-GJ-2026-9092",
      receiptIssued: true,
      receiptIssuedDate: "2026-10-19 14:35",
      verifiedBy: "R. K. Patel (Godown Manager)",
      verifiedDate: "2026-10-19 14:30",
      remarks: "Goods received in sound condition. Digital receipt issued."
    },
    {
      deliveryId: "DEL-2026-002",
      orderNumber: "PO/GSCSCL/2026/MSP-842",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      commodity: "Wheat (FAQ Grade) / ઘઉં",
      category: "CGP",
      expectedQty: 250.0,
      actualQtyReceived: null,
      unit: "Quintal",
      deliveryDate: "2026-10-21",
      truckNumber: "GJ-01-AX-5519",
      driverName: "Dineshbhai Bharwad",
      driverPhone: "+91 98790 33412",
      weighbridgeSlipNo: "",
      grossWeightKg: null,
      tareWeightKg: null,
      netWeightKg: null,
      bagsCount: null,
      moisturePercent: null,
      maxAllowedMoisture: 12.0,
      stackingBay: "Bay 2 (Grain Silo)",
      qualityPassed: false,
      qualityRemarks: "",
      deliveryStatus: "Waiting for Verification",
      receiptId: null,
      receiptIssued: false,
      receiptIssuedDate: null,
      verifiedBy: null,
      verifiedDate: null,
      remarks: "Truck arrived at godown gate. Weighbridge weighing and moisture test pending."
    },
    {
      deliveryId: "DEL-2026-003",
      orderNumber: "PO/GSCSCL/2026/MSP-843",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      commodity: "Chana Whole (Bengal Gram) / દેશી ચણા",
      category: "CGP",
      expectedQty: 160.0,
      actualQtyReceived: 154.0,
      unit: "Quintal",
      deliveryDate: "2026-10-20",
      truckNumber: "GJ-01-ZT-4108",
      driverName: "Govindbhai Desai",
      driverPhone: "+91 94280 66781",
      weighbridgeSlipNo: "WB-26-85299",
      grossWeightKg: 25400,
      tareWeightKg: 10000,
      netWeightKg: 15400,
      bagsCount: 308,
      moisturePercent: 12.8,
      maxAllowedMoisture: 11.0,
      stackingBay: "Holding Yard (Under Query)",
      qualityPassed: false,
      qualityRemarks: "Moisture reading 12.8% exceeds maximum permitted ceiling of 11.0%.",
      deliveryStatus: "Needs Correction",
      receiptId: null,
      receiptIssued: false,
      receiptIssuedDate: null,
      verifiedBy: "R. K. Patel (Godown Manager)",
      verifiedDate: "2026-10-20 16:15",
      remarks: "Excess moisture detected. Clarification report sent to supplier and procurement cell.",
      clarification: {
        problemType: "Moisture content is higher than the standard limit",
        details: "Moisture meter recorded 12.8% on average across sample bags, against the allowed limit of 11.0%. Consignment cannot be stacked in main warehouse to avoid mold.",
        reportedDate: "2026-10-20 16:15",
        reportedBy: "R. K. Patel (Godown Manager)",
        proposedAction: "Consignment held in covered holding area. Joint re-sampling requested."
      }
    },
    {
      deliveryId: "DEL-2026-004",
      orderNumber: "PO/GSCSCL/2026/OIL-55",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      commodity: "Fortified Refined Cottonseed Oil (1L Pouch)",
      category: "TOC",
      expectedQty: 120.0,
      actualQtyReceived: 120.0,
      unit: "Quintal",
      deliveryDate: "2026-10-21",
      truckNumber: "GJ-01-BV-1844",
      driverName: "Pravinbhai Vaghela",
      driverPhone: "+91 97241 88920",
      weighbridgeSlipNo: "WB-26-85340",
      grossWeightKg: 22000,
      tareWeightKg: 10000,
      netWeightKg: 12000,
      bagsCount: 1200,
      moisturePercent: 0.2,
      maxAllowedMoisture: 0.5,
      stackingBay: "Bay 1 (Oil & Packaged Goods)",
      qualityPassed: true,
      qualityRemarks: "Seals intact, cartons undamaged, FSSAI fortified logo verified.",
      deliveryStatus: "Delivery Confirmed",
      receiptId: null,
      receiptIssued: false,
      receiptIssuedDate: null,
      verifiedBy: "R. K. Patel (Godown Manager)",
      verifiedDate: "2026-10-21 11:20",
      remarks: "Physical count and weight slip verified. Eligible for digital delivery receipt."
    },
    {
      deliveryId: "DEL-2026-005",
      orderNumber: "PO/GSCSCL/2026/MSP-845",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-AHM-01",
      godownName: "GSCSCL Central Godown, Sanand",
      district: "Ahmedabad",
      commodity: "Bajra (Hybrid Pearl Millet) / બાજરી",
      category: "CGP",
      expectedQty: 150.0,
      actualQtyReceived: null,
      unit: "Quintal",
      deliveryDate: "2026-10-22",
      truckNumber: "GJ-01-DF-6201",
      driverName: "Kishorbhai Prajapati",
      driverPhone: "+91 98980 55214",
      weighbridgeSlipNo: "",
      grossWeightKg: null,
      tareWeightKg: null,
      netWeightKg: null,
      bagsCount: null,
      moisturePercent: null,
      maxAllowedMoisture: 12.5,
      stackingBay: "Bay 3 (Coarse Grains)",
      qualityPassed: false,
      qualityRemarks: "",
      deliveryStatus: "Waiting for Delivery",
      receiptId: null,
      receiptIssued: false,
      receiptIssuedDate: null,
      verifiedBy: null,
      verifiedDate: null,
      remarks: "Consignment dispatched from procurement center. Expected to arrive tomorrow morning."
    },
    {
      deliveryId: "DEL-GNR-001",
      orderNumber: "PO/GSCSCL/2026/MSP-841",
      supplierId: "SUP-GJ-2026-881",
      supplierName: "Shree Gujarat Agro Commodities FPO Ltd.",
      godownId: "GDN-GNR-01",
      godownName: "State Base Godown, Sector-28, Gandhinagar",
      district: "Gandhinagar",
      commodity: "Wheat (FAQ Grade) / ઘઉં",
      category: "CGP",
      expectedQty: 300.0,
      actualQtyReceived: 300.0,
      unit: "Quintal",
      deliveryDate: "2026-10-18",
      truckNumber: "GJ-18-AZ-4421",
      driverName: "Rameshbhai Chaudhary",
      driverPhone: "+91 99090 12345",
      weighbridgeSlipNo: "WB-26-84902",
      grossWeightKg: 42800,
      tareWeightKg: 12800,
      netWeightKg: 30000,
      bagsCount: 600,
      moisturePercent: 11.4,
      maxAllowedMoisture: 12.0,
      stackingBay: "Sector 28 Silo A",
      qualityPassed: true,
      qualityRemarks: "Passed - Lab Grade A (Agmark Approved)",
      deliveryStatus: "Receipt Issued",
      receiptId: "GRN-GJ-2026-9088",
      receiptIssued: true,
      receiptIssuedDate: "2026-10-18 16:00",
      verifiedBy: "Gandhinagar Godown In-Charge",
      verifiedDate: "2026-10-18 15:45",
      remarks: "Received and stored in Gandhinagar base."
    }
  ],

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
        type: "MOISTURE_EXCESS",
        code: "EXC-MOISTURE-EXCEEDED",
        reason: "Moisture Content (15.6%) exceeds statutory standard ceiling (14.0%). Consignment returned for supplier clarification or deduction consent.",
        raisedBy: "R. K. Patel",
        raisedByRole: "godown_manager",
        raisedByDesignation: "Godown Manager, Sanand",
        raisedOn: "2026-10-18",
        severity: "Medium",
        measuredMoisture: 15.6,
        ceilingMoisture: 14.0,
        excessMoisture: 1.6,
        proposedDeduction: 12500.0,
        calculationRule: "GSCSCL Agmark Schedule: ₹12.50 per quintal per 1.0% excess moisture over 14.0% ceiling (1,100 Qtl × 1% factor = ₹12,500 approx).",
        supportingEvidence: "Agmark Laboratory Moisture Certificate #AGM-SAN-2026-881 & Tare Slip #WB-7712",
        responsibleDepartment: "Pre-Audit Branch & Godown Operations",
        verifyingDepartment: "pre_audit",
        authorizingRole: "general_manager",
        departmentStatus: {
          godownVerification: { status: "Verified", officer: "R. K. Patel (Godown Manager)", date: "2026-10-18", remarks: "Physical tare weight and laboratory moisture test confirmed at 15.6%." },
          preAuditVerification: { status: "Pending", officer: "Hasmukhbhai Shah (Pre-Audit)", date: null, remarks: "Audit verification of proposed ₹12,500 deduction schedule and supplier consent is pending." },
          gmAuthorization: { status: "Pending", officer: null, date: null, remarks: "" }
        },
        resolutionStatus: "PENDING_VERIFICATION",
        resolutionNotes: "",
        history: [
          {
            timestamp: "2026-10-18 05:00 PM",
            officer: "R. K. Patel (Godown Manager)",
            action: "Exception Flagged",
            remarks: "Moisture 15.6% exceeds ceiling 14.0%. Proposed cut: ₹12,500.",
            stage: "Godown Clearance"
          }
        ]
      }
    },

    

// 3B. Supplier Bill: Exception with Pre-Audit Cleared (Ready for GM Review & Authorization)
    {
      id: "GSCSCL-2026-B005",
      grnNumber: "GRN-GJ-2026-8962",
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
      poNumber: "PO/GSCSCL/2026/MSP-812",
      invoiceNumber: "SGAC/26/0435",
      invoiceDate: "2026-10-15",
      submissionDate: "2026-10-16",
      district: "Gandhinagar",
      godownName: "State Base Godown, Sector-28",
      category: "CGP",
      commodity: "Moong Whole (Green Gram) / મગ",
      receivedQty: 500.0,
      billedQty: 500.0,
      unit: "Quintal",
      ratePerUnit: 8558.0,
      grossAmount: 4279000.0,
      deductions: {
        tds194Q: 4279.0,
        gstTds: 85580.0,
        moistureDeduction: 8000.0,
        refractionCut: 0.0,
        otherRecovery: 0.0
      },
      netPayable: 4181141.0,
      status: "Exception Raised",
      statusColor: "rose",
      currentStage: "Executive Review / GM Clearance",
      publicRemark: "Moisture 14.8% exceeds 14.0% standard. Pre-Audit has verified deduction of ₹8,000. Ready for GM executive authorization.",
      daysInStage: 2,
      isDelayed: false,
      auditChecklist: {
        weighmentSlipVerified: true,
        qualityReportCompliant: false,
        gstinActive: true,
        statutoryDeductionsCorrect: true,
        sanctionOrderApproved: false,
        noDualClaimCertified: true
      },
      queries: [],
      notingSheet: [
        {
          timestamp: "2026-10-16 10:15 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Bill submitted for 500 Qtl Moong Whole under Rabi MSP."
        },
        {
          timestamp: "2026-10-16 04:00 PM",
          officer: "R. K. Patel",
          designation: "Godown Manager, Sec-28",
          action: "Inward Inspected & Moisture Flagged",
          remarks: "Physical tare weight verified. Lab test shows 14.8% moisture (Norm: max 14.0%). Excess 0.8%. Proposed deduction ₹8,000 as per circular norms."
        },
        {
          timestamp: "2026-10-18 03:30 PM",
          officer: "Hasmukhbhai Shah",
          designation: "Senior Pre-Auditor",
          action: "Pre-Audit Scrutiny Completed",
          remarks: "Pre-Audit scrutiny of quality deduction ₹8,000 verified against Agmark Certificate #AGM-SEC28-192 and supplier consent letter. Put up for GM executive authorization."
        }
      ],
      paymentDetails: null,
      exception: {
        active: true,
        type: "MOISTURE_EXCESS",
        code: "EXC-MOISTURE-EXCEEDED",
        reason: "Moisture content recorded at 14.8% exceeds 14.0% ceiling standard. Pre-Audit scrutiny complete; proposed quality cut ₹8,000.",
        raisedBy: "R. K. Patel",
        raisedByRole: "godown_manager",
        raisedByDesignation: "Godown Manager, Sec-28",
        raisedOn: "2026-10-16",
        severity: "Medium",
        measuredMoisture: 14.8,
        ceilingMoisture: 14.0,
        excessMoisture: 0.8,
        proposedDeduction: 8000.0,
        calculationRule: "GSCSCL Agmark Schedule: ₹12.50 per quintal per 1.0% excess moisture over 14.0% ceiling.",
        supportingEvidence: "Agmark Laboratory Moisture Certificate #AGM-SEC28-192 & Supplier Acceptance Letter dated 2026-10-17",
        responsibleDepartment: "Pre-Audit Branch & Godown Operations",
        verifyingDepartment: "pre_audit",
        authorizingRole: "general_manager",
        departmentStatus: {
          godownVerification: { status: "Verified", officer: "R. K. Patel (Godown Manager)", date: "2026-10-16", remarks: "Physical inward and 14.8% lab moisture test certified." },
          preAuditVerification: { status: "Verified", officer: "Hasmukhbhai Shah (Senior Pre-Auditor)", date: "2026-10-18", remarks: "Deduction calculation ₹8,000 verified against circular norms and supplier consent letter attached. Recommended for GM executive authorization." },
          gmAuthorization: { status: "Pending", officer: null, date: null, remarks: "" }
        },
        resolutionStatus: "AWAITING_GM_AUTHORIZATION",
        resolutionNotes: "",
        history: [
          {
            timestamp: "2026-10-16 04:00 PM",
            officer: "R. K. Patel (Godown Manager)",
            action: "Exception Flagged",
            remarks: "Moisture 14.8% exceeds 14.0% ceiling. Proposed cut: ₹8,000.",
            stage: "Godown Clearance"
          },
          {
            timestamp: "2026-10-18 03:30 PM",
            officer: "Hasmukhbhai Shah (Senior Pre-Auditor)",
            action: "Pre-Audit Cleared",
            remarks: "Audit verification complete. Statutory deductions and quality cut verified. Recommended for GM approval.",
            stage: "Pre-Audit"
          }
        ]
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
        type: "QTY_MISMATCH",
        code: "EXC-QTY-MISMATCH",
        reason: "Quantity Mismatch: Physical weighment is 920.00 Qtl whereas Invoice claims 960.00 Qtl (Variance: +40 Qtl / +4.35%).",
        raisedBy: "B. P. Chaudhary",
        raisedByRole: "godown_manager",
        raisedByDesignation: "Godown Manager, Unjha",
        raisedOn: "2026-10-13",
        severity: "High",
        billedQty: 960.0,
        measuredQty: 920.0,
        varianceQty: 40.0,
        proposedDeduction: 100000.0,
        calculationRule: "GSCSCL Procurement Rule: Excess billed quantity (40.00 Qtl) deducted at contracted procurement rate ₹2,500/Qtl (₹1,00,000 deduction).",
        supportingEvidence: "GSCSCL Unjha Weighbridge Gross-Tare Slip #WB-26-8977 & Truck Log GJ-02-XX-4411",
        responsibleDepartment: "Godown Management & Pre-Audit Scrutiny",
        verifyingDepartment: "pre_audit",
        authorizingRole: "general_manager",
        departmentStatus: {
          godownVerification: { status: "Verified", officer: "B. P. Chaudhary (Godown Manager)", date: "2026-10-13", remarks: "Physical gross-tare check certified net 920.00 Qtl." },
          preAuditVerification: { status: "Pending", officer: "Hasmukhbhai Shah (Pre-Audit)", date: null, remarks: "Scrutiny of supplier explanation for 40 Qtl discrepancy is pending." },
          gmAuthorization: { status: "Pending", officer: null, date: null, remarks: "" }
        },
        resolutionStatus: "PENDING_VERIFICATION",
        resolutionNotes: "",
        history: [
          {
            timestamp: "2026-10-13 02:40 PM",
            officer: "B. P. Chaudhary (Godown Manager)",
            action: "Exception Flagged",
            remarks: "Physical weighment 920 Qtl vs billed 960 Qtl (+40 Qtl). Proposed adjustment ₹1,00,000.",
            stage: "Godown Clearance"
          }
        ]
      }
    },
    // 10. Vadodara / Waghodia Bill: Pre-Audit Pending
    {
      id: "GSCSCL-2026-B011",
      grnNumber: "GRN-GJ-2026-9065",
      supplierId: "SUP-GJ-2026-512",
      supplierName: "Vadodara Krushi Utpadak Sahakari Mandali Ltd.",
      supplierGstin: "24AAACV4120N1ZK",
      supplierPan: "AAACV4120N",
      supplierBank: {
        accountNo: "91802004819201",
        ifsc: "BARB0WAGHOD",
        bankName: "Bank of Baroda",
        branch: "Waghodia Main Branch"
      },
      poNumber: "PO/GSCSCL/2026/PULSE-44",
      invoiceNumber: "VKUSM/26/89",
      invoiceDate: "2026-10-20",
      submissionDate: "2026-10-22",
      district: "Vadodara",
      branch: "Waghodia",
      godownName: "GSCSCL Taluka Godown, Waghodia",
      category: "CGP",
      commodity: "Tuver Dal (Desi FAQ) / તુવેર દાળ",
      receivedQty: 250,
      billedQty: 250,
      unit: "Quintal",
      ratePerUnit: 7000,
      grossAmount: 1750000,
      deductions: {
        tds194Q: 1750,
        gstTds: 35000,
        moistureDeduction: 0,
        refractionCut: 0,
        otherRecovery: 0
      },
      netPayable: 1713250,
      status: "Pre-Audit",
      statusColor: "teal",
      currentStage: "Pre-Audit Verification",
      publicRemark: "Inward verified at Waghodia Godown. Awaiting pre-audit 3-way match scrutiny.",
      daysInStage: 2,
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
          timestamp: "2026-10-22 10:15 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Supplied 250 Qtl Tuver Dal to Waghodia Taluka Godown against PO #44."
        },
        {
          timestamp: "2026-10-23 04:30 PM",
          officer: "M. A. Parmar",
          designation: "Godown In-Charge, Waghodia",
          action: "Physical Stock Verified",
          remarks: "Weighbridge gross & tare slips reconciled. Lab moisture 9.8% (passed FAQ specifications). Stock accepted into register."
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
    // 11. Vadodara / Waghodia Bill: Audit Cleared This Month
    {
      id: "GSCSCL-2026-B012",
      grnNumber: "GRN-GJ-2026-9052",
      supplierId: "SUP-GJ-2026-512",
      supplierName: "Vadodara Krushi Utpadak Sahakari Mandali Ltd.",
      supplierGstin: "24AAACV4120N1ZK",
      supplierPan: "AAACV4120N",
      supplierBank: {
        accountNo: "91802004819201",
        ifsc: "BARB0WAGHOD",
        bankName: "Bank of Baroda",
        branch: "Waghodia Main Branch"
      },
      poNumber: "PO/GSCSCL/2026/MSP-856",
      invoiceNumber: "VKUSM/26/72",
      invoiceDate: "2026-10-15",
      submissionDate: "2026-10-16",
      district: "Vadodara",
      branch: "Waghodia",
      godownName: "GSCSCL Taluka Godown, Waghodia",
      category: "CGP",
      commodity: "Wheat (FAQ Grade) / ઘઉં",
      receivedQty: 540,
      billedQty: 540,
      unit: "Quintal",
      ratePerUnit: 2275,
      grossAmount: 1228500,
      deductions: {
        tds194Q: 1228,
        gstTds: 24570,
        moistureDeduction: 0,
        refractionCut: 0,
        otherRecovery: 0
      },
      netPayable: 1202702,
      status: "Approval Pending",
      statusColor: "purple",
      currentStage: "General Manager Sanction (Audit Cleared)",
      publicRemark: "Pre-audit verification completed by HQ team. Forwarded to GM for financial sanction.",
      daysInStage: 1,
      isDelayed: false,
      auditClearedDate: "2026-10-19",
      auditClearedBy: "Hasmukhbhai Shah (Senior Pre-Auditor)",
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
          timestamp: "2026-10-16 11:30 AM",
          officer: "Supplier Self-Service Portal",
          designation: "Vendor Submission",
          action: "Bill Submitted",
          remarks: "Bill submitted for 540 Quintals FAQ Wheat delivered to Waghodia."
        },
        {
          timestamp: "2026-10-18 02:15 PM",
          officer: "M. A. Parmar",
          designation: "Godown In-Charge, Waghodia",
          action: "Stock Verified & Certified",
          remarks: "540 Quintals received. Inward register entry folio #184 certified."
        },
        {
          timestamp: "2026-10-19 03:15 PM",
          officer: "Hasmukhbhai Shah",
          designation: "Senior Pre-Auditor, Head Office",
          action: "Pre-Audit Scrutiny Passed",
          remarks: "3-Way reconciliation verified against PO #856 and GRN #9052. TDS 194Q (₹1,228) and GST TDS (₹24,570) verified. Net payable ₹12,02,702 passed. Recommended for GM sanction."
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


  ]
};
