/**
 * GSCSCL - UI Components Library
 * Reusable renderers for government portal dashboards, tables, modals & sheets
 */

// Gujarati Numeral Converter
function toGujaratiDigits(str) {
  if (str === null || str === undefined) return "";
  const gujaratiDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return String(str).replace(/[0-9]/g, d => gujaratiDigits[d]);
}

// Comprehensive Government Gujarati Translations Dictionary
const GSCSCL_TRANSLATIONS = {

  // Godown Manager Workflow Translations
  "Supply Orders": "સપ્લાય ઓર્ડર્સ",
  "Deliveries / Check Inward": "આવેલ માલ / ડિલિવરી ચકાસણી",
  "Delivery Receipts (ePOD)": "ડિલિવરી પાવતી (ePOD)",
  "Delivery History": "ડિલિવરી ઇતિહાસ",
  "Check Delivery": "ડિલિવરી તપાસો",
  "Issue Delivery Receipt": "ડિલિવરી રસીદ આપો",
  "Report Delivery Issue": "ડિલિવરી સમસ્યા નોંધાવો",
  "Waiting for Delivery": "ડિલિવરીની રાહમાં",
  "Waiting for Verification": "ચકાસણી બાકી",
  "Verification in Progress": "ચકાસણી ચાલુ છે",
  "Delivery Confirmed": "ડિલિવરી મંજૂર",
  "Receipt Issued": "રસીદ અપાઈ ગઈ",
  "Needs Correction": "સુધારણા જરૂરી",
  "Clarification Submitted": "સ્પષ્ટતા મોકલેલ છે",
  "Expected Quantity": "અપેક્ષિત જથ્થો",
  "Actual Received": "વાસ્તવિક મળેલ",
  "Gross Weight": "કુલ વજન (ગ્રોસ)",
  "Tare Weight": "ખાલી વાહન વજન (ટેર)",
  "Net Weight": "ચોખ્ખું વજન (નેટ)",
  "Moisture Content": "ભેજનું પ્રમાણ",
  "Weighbridge Slip": "વેબ્રિજ પહોંચ",

  // Common Navigation & Top Bar
  "Language / ભાષા:": "ભાષા / Language:",
  "Language:": "ભાષા:",
  "PDS Helpline / હેલ્પલાઇન:": "પી.ડી.એસ. હેલ્પલાઇન:",
  "Government of Gujarat • ગુજરાત સરકાર": "ગુજરાત સરકાર • સરકારી સાહસ",
  "PDS Procurement Cell": "જાહેર વિતરણ ખરીદ સેલ",
  "ISO 9001:2015": "આઇ.એસ.ઓ. ૯૦૦૧:૨૦૧૫",
  "IFMS Gujarat Integrated": "આઇ.એફ.એમ.એસ. ગુજરાત સંકલિત",
  "ગુજરાત રાજ્ય નાગરિક પુરવઠા નિગમ લિમિટેડ (GSCSCL)": "ગુજરાત રાજ્ય નાગરિક પુરવઠા નિગમ લિમિટેડ (GSCSCL)",
  "Automated Commodity Supplier Billing & Payment Processing System": "સ્વયંસંચાલિત કૃષિ પુરવઠા બિલિંગ અને ચૂકવણી પ્રક્રિયા પ્રણાલી",
  "Audit & Workflow Notifications": "ઓડિટ અને કાર્યપ્રવાહ સૂચનાઓ",
  "Mark all read": "બધા વંચાયેલા ચિહ્નિત કરો",
  "Logout / સાઇન આઉટ": "સાઇન આઉટ / લૉગઆઉટ",
  "Sign Out of Session": "સત્રમાંથી બહાર નીકળો",
  "Authenticated Session:": "પ્રમાણિત સત્ર:",
  "IFMS Core Gateway Online": "આઇ.એફ.એમ.એસ. કોર ગેટવે કાર્યરત",
  "Procurement Season:": "ખરીદ સત્ર:",
  "Exception Hub": "વિસંગતતા કેન્દ્ર",
  "Reset Demo Data": "ડેમો ડેટા ફરીથી સેટ કરો",

  // Roles & Designations
  "Pre-Audit Staff": "પ્રી-ઓડિટ સ્ટાફ",
  "Senior Accounts Officer & Pre-Auditor": "સિનિયર હિસાબી અધિકારી અને પ્રી-ઓડિટર",
  "Pre-Audit Scrutiny Cell, Gandhinagar Head Office": "પ્રી-ઓડિટ ચકાસણી શાખા, ગાંધીનગર મુખ્ય કચેરી",
  "Supplier / Vendor": "પુરવઠાદાર / વેન્ડર",
  "Godown Manager": "ગોડાઉન મેનેજર",
  "General Manager": "જનરલ મેનેજર (સક્ષમ સત્તા)",
  "Finance Branch": "નાણાં શાખા / તિજોરી એકમ",
  "Management / Admin Monitor": "સંચાલન અને દેખરેખ વહીવટકર્તા",

  // Tabs
  "Pre-Audit Dashboard": "પ્રી-ઓડિટ ડેશબોર્ડ",
  "Pre-Audit Work Queue": "પ્રી-ઓડિટ કાર્ય કતાર",
  "All Audited Cases": "તમામ ઓડિટ થયેલ કેસો",
  "Audit Queries Hub": "ઓડિટ પ્રશ્નો અને વિસંગતતા કેન્દ્ર",
  "Dashboard": "ડેશબોર્ડ",
  "Inward Verification Queue": "ઇનવર્ડ ચકાસણી કતાર",
  "District Stock & Bills": "જિલ્લા સ્ટોક અને બિલો",
  "Discrepancy Log": "વિસંગતતા લોગ",
  "Sanction Approval Queue": "નાણાકીય મંજૂરી કતાર",
  "State Procurement Register": "રાજ્ય ખરીદ રજિસ્ટર",
  "Exception Overrides": "વિસંગતતા સુધારણા",
  "Payment Release Queue": "ચૂકવણી મુક્તિ કતાર",
  "Paid Vouchers & RTGS Log": "ચૂકવેલ વાઉચર અને આર.ટી.જી.એસ. લોગ",
  "Banking Issues": "બેંકિંગ પ્રશ્નો",
  "Management Monitor": "મેનેજમેન્ટ મોનિટર",
  "Pipeline & SLA Tracker": "પાઇપલાઇન અને એસ.એલ.એ. ટ્રેકર",
  "Master Bill Ledger": "માસ્ટર બિલ લેજર",
  "My Invoices & Bills": "મારા ઇન્વોઇસ અને બિલો",
  "Godown Receipts (GRN)": "ગોડાઉન પહોંચ (જી.આર.એન.)",
  "Queries & Remarks": "પ્રશ્નો અને સત્તાવાર ટિપ્પણીઓ",

  // Pre-Audit Dashboard Specifics
  "Pre-Audit Pending": "પેન્ડિંગ પ્રી-ઓડિટ બિલ",
  "Pending Audit Value": "ઓડિટ હેઠળની કુલ રકમ",
  "Audit Cleared This Month": "આ મહિને મંજૂર થયેલ ઓડિટ બિલ",
  "Statutory Tax Compliance": "કાનૂની કર પાલન",
  "Inward verified cases": "ગોડાઉન ચકાસાયેલ કેસો",
  "Total value undergoing scrutiny": "તપાસ હેઠળની કુલ રકમ",
  "Passed to GM for sanction": "જનરલ મેનેજરને મંજૂરી માટે મોકલેલ",
  "Sec 194Q & GST TDS verified": "કલમ ૧૯૪-ક્યુ અને જીએસટી ટીડીએસ ચકાસાયેલ",
  "Click to open pending bills queue": "પેન્ડિંગ બિલ કતાર ખોલવા ક્લિક કરો",
  "Click to view cleared bills & history": "મંજૂર બિલ અને ઇતિહાસ જોવા ક્લિક કરો",
  "Bills Needing Pre-Audit": "પ્રી-ઓડિટ બાકી બિલો",
  "Audit Cleared Bills (This Month)": "ઓડિટ ક્લિયર થયેલ બિલો (આ મહિને)",
  "Actionable Pre-Audit Scrutiny Queue": "કાર્યવાહી કરવા યોગ્ય પ્રી-ઓડિટ તપાસ કતાર",
  "Conduct digital 3-way match, review noting sheet & compute statutory deductions": "ડિજિટલ ૩-સ્તરીય મેળ તપાસો, નોટિંગ શીટ સમીક્ષા કરો અને કાનૂની કર કપાત ગણો",
  "Examine invoice accuracy, verify test compliance and forward to General Manager": "ઇન્વોઇસની ચોકસાઈ તપાસો, લેબ રિપોર્ટ ચકાસો અને જનરલ મેનેજરને આગળ મોકલો",
  "All Audited & Scrutinized Bills": "તમામ ઓડિટ અને તપાસ પૂર્ણ થયેલ બિલો",
  "Track full clearance audit trail, statutory tax deductions, and approval noting history": "સંપૂર્ણ ઓડિટ ટ્રાયલ, કાનૂની કર કપાત અને મંજૂરી નોટિંગ ઇતિહાસ ટ્રેક કરો",

  // District & Branch Selection
  "Location Filter / Branch Scope": "સ્થળ ફિલ્ટર / શાખા કાર્યક્ષેત્ર",
  "Select District & Operating Branch": "જિલ્લો અને સંચાલન શાખા પસંદ કરો",
  "District:": "જિલ્લો:",
  "Branch / Godown:": "શાખા / ગોડાઉન:",
  "All Districts": "તમામ જિલ્લાઓ",
  "All Branches": "તમામ શાખાઓ",
  "Reset": "રીસેટ કરો",
  "Active Filter:": "સક્રિય ફિલ્ટર:",

  // Table Columns
  "Bill ID & Ref": "બિલ નંબર અને સંદર્ભ",
  "Supplier & District": "પુરવઠાદાર અને જિલ્લો",
  "Branch / Godown": "શાખા / ગોડાઉન",
  "Commodity & GRN": "પાક / જથ્થો અને જી.આર.એન.",
  "Quantity": "જથ્થો",
  "Net Amount": "ચોખ્ખી ચૂકવવાપાત્ર રકમ",
  "Gross Amount": "કુલ રકમ",
  "Lifecycle Status": "પ્રક્રિયા સ્થિતિ",
  "Actions": "કાર્યવાહી",
  "Clearance Date": "ઓડિટ ક્લિયર તારીખ",
  "Audit Details & Notes": "ઓડિટ વિગતો અને નોંધ",

  // Table Action Buttons
  "Pre-Audit Scrutiny": "પ્રી-ઓડિટ ચકાસણી",
  "View Audit History": "ઓડિટ ઇતિહાસ જુઓ",
  "Audit History": "ઓડિટ ઇતિહાસ",
  "Details": "વિગતો જુઓ",
  "Inspect & Expedite": "તપાસો અને ઝડપી કરો",
  "Verify Inward": "ઇનવર્ડ ચકાસો",
  "Sanction Bill": "બિલ મંજૂર કરો",
  "Disburse RTGS": "આર.ટી.જી.એસ. ચૂકવો",
  "Voucher": "વાઉચર",
  "Resolve": "ઉકેલો",
  "View Complete Case": "સંપૂર્ણ કેસ જુઓ",

  // Status Labels
  "Draft": "ડ્રાફ્ટ (કાચો)",
  "Submitted": "સબમિટ થયેલ",
  "Under Verification": "ગોડાઉન ચકાસણી હેઠળ",
  "Pre-Audit": "પ્રી-ઓડિટ ચકાસણી",
  "Pre-Audit Stage": "પ્રી-ઓડિટ તબક્કો",
  "Approval Pending": "જી.એમ. મંજૂરી બાકી",
  "Sent to Finance": "નાણાં શાખામાં મોકલેલ",
  "Payment Processed": "ચૂકવણી સંપન્ન",
  "Exception Raised": "વિસંગતતા નોંધાયેલ",
  "Waiting for Verification": "ચકાસણીની પ્રતીક્ષામાં",
  "Waiting for Approval": "મંજૂરીની પ્રતીક્ષામાં",
  "Payment in Process": "ચૂકવણી પ્રક્રિયા હેઠળ",
  "Payment Completed": "ચૂકવણી પૂર્ણ થયેલ",
  "Returned for Correction": "સુધારણા માટે પરત",

  // Filter Bar
  "Search by Bill ID, Supplier, Commodity, GRN, District...": "બિલ નંબર, સપ્લાયર, પાક, જીઆરએન, જિલ્લાથી શોધો...",
  "Status: All Stages": "સ્થિતિ: તમામ તબક્કા",
  "Category: All (CGP / TOC)": "કેટેગરી: તમામ (CGP / TOC)",
  "CGP (Grains & Pulses)": "CGP (અનાજ અને કઠોળ)",
  "TOC (Salt, Bags, Oil)": "TOC (મીઠું, બારદાન, તેલ)",
  "District: All Districts": "જિલ્લો: તમામ જિલ્લાઓ",
  "Reset Filters": "ફિલ્ટર્સ રીસેટ કરો",
  "No Matching Bills Found": "કોઈ મેળ ખાતા બિલો મળ્યા નથી",
  "Try modifying your search query or stage filters.": "તમારી શોધ અથવા તબક્કા ફિલ્ટર્સ બદલીને પ્રયાસ કરો.",

  // Modals & Checklist
  "Mandatory GSCSCL Audit Verification Checklist": "જી.એસ.સી.એસ.સી.એલ. ફરજિયાત પ્રી-ઓડિટ ચકાસણી યાદી",
  "1. Weighbridge Gross & Tare Receipts Reconciled": "૧. વેબ્રિજ ગ્રોસ અને ટેર વજન પહોંચ મેળ ખાધેલ છે",
  "2. Agmark / FSSAI Lab Quality Report Compliant": "૨. એગમાર્ક / એફએસએસએઆઈ લેબ ગુણવત્તા રિપોર્ટ સુસંગત છે",
  "3. Active GSTIN & e-Way Bill Clearance Confirmed": "૩. સક્રિય જીએસટીઆઇએન અને ઈ-વે બિલ મંજૂરી ચકાસાયેલ છે",
  "4. Statutory Deductions (TDS 194Q & GST TDS 2%) Verified": "૪. કાનૂની કપાત (ટીડીએસ ૧૯૪Q ૦.૧% અને જીએસટી ટીડીએસ ૨%) ગણાયેલ છે",
  "5. No Dual Claim Certificate Endorsed by Godown": "૫. ગોડાઉન દ્વારા કોઈ ડુપ્લિકેટ દાવો ન હોવાનું પ્રમાણપત્ર આપેલ છે",
  "6. Sanction Order & Budget Provision Allocated": "૬. મંજૂરી ઓર્ડર અને બજેટ જોગવાઈ ફાળવવામાં આવેલ છે",
  "Financial Settlement & Deduction Schedule": "નાણાકીય ચુકવણી અને કપાત પત્રક",
  "IT TDS 194Q (0.1%):": "આવકવેરા ટીડીએસ ૧૯૪Q (૦.૧%):",
  "GST TDS (2.0%):": "જીએસટી ટીડીએસ (૨.૦%):",
  "Refraction / Cuts:": "ગુણવત્તા કપાત / રિફ્રેક્શન:",
  "Net Payable:": "ચોખ્ખી ચૂકવવાપાત્ર રકમ:",
  "Gross:": "કુલ દાવો:",
  "Pass Pre-Audit & Forward to GM": "પ્રી-ઓડિટ મંજૂર કરો અને જનરલ મેનેજરને મોકલો",
  "Raise Exception / Query": "વિસંગતતા / પ્રશ્ન નોંધો",
  "Close": "બંધ કરો",
  "Audit History Trail & Milestones": "ઓડિટ ઇતિહાસ અને સમયરેખા ટ્રેકિંગ",
  "Detailed Scrutiny Milestones": "વિગતવાર તપાસ માઇલસ્ટોન",
  "Official Noting Sheet Minutes": "સત્તાવાર લીલી નોટિંગ શીટ વિગતો",
  "Pre-Audit Scrutiny Clearance": "પ્રી-ઓડિટ ચકાસણી મંજૂરી",
  "Physical Stock Acceptance": "ભૌતિક જથ્થા સ્વીકૃતિ",
  "Initial Bill Submission": "પ્રારંભિક બિલ સબમિશન",
  "Competent Authority Sanction": "સક્ષમ સત્તા મંજૂરી",
  "Treasury Disbursement (IFMS)": "તિજોરી ચૂકવણી (આઇ.એફ.એમ.એસ.)",

  // Login Page
  "SSO Portal Sign-In": "એસ.એસ.ઓ. પોર્ટલ સાઇન-ઇન",
  "સત્તાવાર લૉગિન • Official Portal Access": "સત્તાવાર લૉગિન • GSCSCL પોર્ટલ",
  "Quick-Demo 1-Click Login:": "ઝડપી ડેમો ૧-ક્લિક લૉગિન:",
  "Click any persona to log in instantly:": "ત્વરિત લૉગિન માટે કોઈપણ ભૂમિકા પર ક્લિક કરો:",
  "User ID / Employee Code / Vendor ID": "વપરાશકર્તા આઇડી / કર્મચારી કોડ / વેન્ડર આઇડી",
  "Password / ગુપ્ત કોડ": "પાસવર્ડ / ગુપ્ત કોડ",
  "Forgot Password?": "પાસવર્ડ ભૂલી ગયા છો?",
  "Security Captcha Verification": "સુરક્ષા કેપ્ચા ચકાસણી",
  "Enter Captcha": "કેપ્ચા દાખલ કરો",
  "Remember session on this device": "આ ઉપકરણ પર સત્ર યાદ રાખો",
  "Sign In to GSCSCL Portal • સાઇન ઇન કરો": "GSCSCL પોર્ટલમાં સાઇન ઇન કરો",
  "Digital Gujarat SSO": "ડિજિટલ ગુજરાત SSO"
};

const UI = {
  // Translation helper
  t(key, fallback) {
    if (typeof AppState !== 'undefined' && AppState.getLanguage() === 'gu') {
      if (GSCSCL_TRANSLATIONS && GSCSCL_TRANSLATIONS[key]) {
        return GSCSCL_TRANSLATIONS[key];
      }
    }
    return fallback !== undefined ? fallback : key;
  },

  // Format Number with locale & digits
  formatNumber(val) {
    const formatted = Number(val || 0).toLocaleString('en-IN');
    if (typeof AppState !== 'undefined' && AppState.getLanguage() === 'gu') {
      return toGujaratiDigits(formatted);
    }
    return formatted;
  },

  // Format Digits string
  formatDigits(val) {
    if (typeof AppState !== 'undefined' && AppState.getLanguage() === 'gu') {
      return toGujaratiDigits(val);
    }
    return String(val !== undefined && val !== null ? val : "");
  },

  // Format Indian Currency
  formatINR(val) {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
    if (typeof AppState !== 'undefined' && AppState.getLanguage() === 'gu') {
      return toGujaratiDigits(formatted);
    }
    return formatted;
  },

  // Simple English Status Badge for Suppliers
  renderSupplierStatusBadge(status) {
    const map = {
      'Draft': {
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        icon: 'fa-file-lines',
        label: 'Draft'
      },
      'Submitted': {
        bg: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
        icon: 'fa-clock',
        label: 'Waiting for Verification'
      },
      'Under Verification': {
        bg: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
        icon: 'fa-clock',
        label: 'Waiting for Verification'
      },
      'Pre-Audit': {
        bg: 'bg-blue-50 text-blue-800 border-blue-300 font-semibold',
        icon: 'fa-hourglass-half',
        label: 'Waiting for Approval'
      },
      'Approval Pending': {
        bg: 'bg-purple-50 text-purple-800 border-purple-300 font-semibold',
        icon: 'fa-hourglass-half',
        label: 'Waiting for Approval'
      },
      'Sent to Finance': {
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-300 font-semibold',
        icon: 'fa-file-invoice-dollar',
        label: 'Payment in Process'
      },
      'Payment Processed': {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
        icon: 'fa-circle-check',
        label: 'Payment Completed'
      },
      'Exception Raised': {
        bg: 'bg-rose-50 text-rose-800 border-rose-300 font-semibold',
        icon: 'fa-arrow-rotate-left',
        label: 'Returned for Correction'
      }
    };

    const s = map[status] || {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: 'fa-circle-info',
      label: status
    };

    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${s.bg}">
        <i class="fa-solid ${s.icon} text-[11px]"></i>
        <span>${this.t(s.label)}</span>
      </span>
    `;
  },

  // Official Status Badge Renderer (For Government Roles)
  renderStatusBadge(status) {
    const map = {
      'Draft': {
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        icon: 'fa-file-lines',
        label: 'Draft'
      },
      'Submitted': {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: 'fa-circle-arrow-up',
        label: 'Submitted'
      },
      'Under Verification': {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: 'fa-magnifying-glass-chart',
        label: 'Under Verification'
      },
      'Pre-Audit': {
        bg: 'bg-teal-50 text-teal-700 border-teal-200',
        icon: 'fa-clipboard-check',
        label: 'Pre-Audit Stage'
      },
      'Approval Pending': {
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: 'fa-stamp',
        label: 'Approval Pending'
      },
      'Sent to Finance': {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: 'fa-file-invoice-dollar',
        label: 'Sent to Finance'
      },
      'Payment Processed': {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
        icon: 'fa-circle-check',
        label: 'Payment Processed'
      },
      'Exception Raised': {
        bg: 'bg-rose-50 text-rose-700 border-rose-300 font-semibold',
        icon: 'fa-triangle-exclamation',
        label: 'Exception Raised'
      }
    };

    const s = map[status] || {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: 'fa-circle-info',
      label: status
    };

    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${s.bg}">
        <i class="fa-solid ${s.icon} text-[11px]"></i>
        <span>${this.t(s.label)}</span>
      </span>
    `;
  },

  // Category Badge (CGP / TOC)
  renderCategoryBadge(category) {
    if (category === 'CGP') {
      return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200" title="Coarse Grain & Pulses">CGP</span>`;
    }
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200" title="Textile & Other Commodities">TOC</span>`;
  },

  // Reusable Metric KPI Card with interactive click support
  renderKpiCard(title, value, subtext, icon, colorClass, trendText = "", trendIcon = "fa-arrow-up", onClick = "") {
    const translatedTitle = this.t(title);
    const translatedSubtext = subtext ? this.t(subtext) : "";
    return `
      <div ${onClick ? `onclick="${onClick}" role="button" tabindex="0"` : ''} 
        class="portal-card p-5 relative overflow-hidden group transition-all duration-200 ${
          onClick ? 'cursor-pointer hover:shadow-lg hover:border-teal-500 hover:-translate-y-0.5 active:translate-y-0 select-none' : ''
        }">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>${translatedTitle}</span>
              ${onClick ? '<i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-teal-600 opacity-60 group-hover:opacity-100 transition-opacity"></i>' : ''}
            </p>
            <h3 class="text-2xl font-bold text-slate-900 tracking-tight">${value}</h3>
            ${translatedSubtext ? `<p class="text-xs text-slate-500 mt-1">${translatedSubtext}</p>` : ''}
          </div>
          <div class="w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} shadow-sm group-hover:scale-110 transition-transform">
            <i class="fa-solid ${icon} text-lg"></i>
          </div>
        </div>
        ${trendText ? `
          <div class="mt-3 pt-3 border-t border-slate-100 flex items-center text-xs text-slate-600">
            <span class="text-emerald-600 font-medium inline-flex items-center gap-1 mr-2">
              <i class="fa-solid ${trendIcon}"></i> ${this.t(trendText)}
            </span>
          </div>
        ` : ''}
      </div>
    `;
  },

  // Simple English Progress Tracker for Suppliers
  renderSupplierProgressSteps(currentStatus) {
    const steps = [
      { id: 'step-1', label: '1. Bill Submitted', icon: 'fa-file-arrow-up', statuses: ['Submitted', 'Under Verification', 'Pre-Audit', 'Approval Pending', 'Sent to Finance', 'Payment Processed'] },
      { id: 'step-2', label: '2. Stock Verification', icon: 'fa-warehouse', statuses: ['Under Verification', 'Pre-Audit', 'Approval Pending', 'Sent to Finance', 'Payment Processed'] },
      { id: 'step-3', label: '3. Audit & Approval', icon: 'fa-stamp', statuses: ['Pre-Audit', 'Approval Pending', 'Sent to Finance', 'Payment Processed'] },
      { id: 'step-4', label: '4. Payment in Process', icon: 'fa-vault', statuses: ['Sent to Finance', 'Payment Processed'] },
      { id: 'step-5', label: '5. Payment Completed', icon: 'fa-circle-check', statuses: ['Payment Processed'] }
    ];

    const isReturned = currentStatus === 'Exception Raised';
    const isDraft = currentStatus === 'Draft';

    let activeIndex = 0;
    if (isDraft) activeIndex = -1;
    else if (currentStatus === 'Submitted') activeIndex = 0;
    else if (currentStatus === 'Under Verification') activeIndex = 1;
    else if (currentStatus === 'Pre-Audit' || currentStatus === 'Approval Pending') activeIndex = 2;
    else if (currentStatus === 'Sent to Finance') activeIndex = 3;
    else if (currentStatus === 'Payment Processed') activeIndex = 4;

    return `
      <div class="py-3 px-1">
        ${isReturned ? `
          <div class="mb-4 bg-rose-50 border-l-4 border-rose-500 p-3.5 rounded-r text-xs text-rose-900 flex items-start gap-3">
            <i class="fa-solid fa-triangle-exclamation text-lg text-rose-600 mt-0.5 shrink-0"></i>
            <div>
              <strong class="text-sm block font-bold text-rose-800">Action Needed: Bill Returned for Correction</strong>
              <p class="text-xs text-rose-700 mt-0.5">Government officials have requested revisions. Please check the remarks, edit the bill, and click <strong>"Resubmit Bill"</strong>.</p>
            </div>
          </div>
        ` : ''}

        ${isDraft ? `
          <div class="mb-4 bg-slate-100 border-l-4 border-slate-400 p-3 rounded-r text-xs text-slate-700 flex items-center gap-2">
            <i class="fa-solid fa-file-lines text-base text-slate-500"></i>
            <span>This bill is currently saved as a <strong>Draft</strong> and has not yet been submitted to GSCSCL.</span>
          </div>
        ` : ''}

        <div class="relative flex items-center justify-between">
          <div class="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0"></div>
          ${steps.map((step, idx) => {
            const isCompleted = activeIndex > idx || currentStatus === 'Payment Processed';
            const isCurrent = activeIndex === idx;

            let circleClass = 'bg-slate-100 border-2 border-slate-300 text-slate-400';
            if (isCompleted) {
              circleClass = 'bg-emerald-600 border-2 border-emerald-600 text-white shadow-sm';
            } else if (isCurrent) {
              circleClass = isReturned 
                ? 'bg-rose-600 border-2 border-rose-600 text-white shadow-md animate-pulse ring-4 ring-rose-100'
                : 'bg-blue-600 border-2 border-blue-600 text-white shadow-md ring-4 ring-blue-100';
            }

            return `
              <div class="relative z-10 flex flex-col items-center">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${circleClass} transition-all">
                  ${isCompleted ? '<i class="fa-solid fa-check"></i>' : `<i class="fa-solid ${step.icon}"></i>`}
                </div>
                <span class="text-[11px] font-medium mt-1.5 ${isCurrent ? 'text-blue-900 font-bold' : (isCompleted ? 'text-emerald-700' : 'text-slate-400')} text-center whitespace-nowrap">
                  ${step.label}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // Lifecycle Tracker Visualizer (For Official View)
  renderLifecycleSteps(currentStatus) {
    const steps = [
      { id: 'Submitted', label: '1. Submitted', icon: 'fa-upload' },
      { id: 'Under Verification', label: '2. Godown Inward', icon: 'fa-warehouse' },
      { id: 'Pre-Audit', label: '3. Pre-Audit Check', icon: 'fa-clipboard-check' },
      { id: 'Approval Pending', label: '4. GM Sanction', icon: 'fa-stamp' },
      { id: 'Sent to Finance', label: '5. Finance Dept', icon: 'fa-vault' },
      { id: 'Payment Processed', label: '6. IFMS Disbursed', icon: 'fa-check-double' }
    ];

    const isException = currentStatus === 'Exception Raised';
    const statusOrder = steps.map(s => s.id);
    const currentIndex = statusOrder.indexOf(currentStatus);

    return `
      <div class="py-4 px-2">
        ${isException ? `
          <div class="mb-4 bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r text-xs text-rose-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-triangle-exclamation text-base text-rose-600"></i>
              <span><strong>Billing Process Paused:</strong> An exception or discrepancy is pending resolution.</span>
            </div>
            <span class="bg-rose-200 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold">Action Required</span>
          </div>
        ` : ''}

        <div class="relative flex items-center justify-between">
          <div class="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0"></div>
          ${steps.map((step, idx) => {
            const isCompleted = currentIndex > idx || currentStatus === 'Payment Processed';
            const isCurrent = currentIndex === idx;
            let circleClass = 'bg-slate-100 border-2 border-slate-300 text-slate-400';
            if (isCompleted) {
              circleClass = 'bg-emerald-600 border-2 border-emerald-600 text-white shadow-sm';
            } else if (isCurrent) {
              circleClass = isException ? 'bg-rose-600 border-2 border-rose-600 text-white shadow-md animate-pulse' : 'bg-blue-600 border-2 border-blue-600 text-white shadow-md ring-4 ring-blue-100';
            }

            return `
              <div class="relative z-10 flex flex-col items-center group">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${circleClass} transition-all">
                  ${isCompleted ? '<i class="fa-solid fa-check"></i>' : `<i class="fa-solid ${step.icon}"></i>`}
                </div>
                <span class="text-[11px] font-medium mt-1.5 ${isCurrent ? 'text-blue-900 font-bold' : (isCompleted ? 'text-emerald-700' : 'text-slate-400')} text-center whitespace-nowrap">
                  ${step.label}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // Official Noting Sheet Component (Strictly for Authorized Officials Only)
  renderNotingSheet(notingSheet = [], canAddNote = false, billId = "") {
    return `
      <div class="noting-sheet p-5 rounded-lg shadow-inner">
        <h4 class="text-xs font-bold text-emerald-950 uppercase tracking-wider pb-2 border-b border-emerald-800/20 flex items-center gap-2">
          <i class="fa-solid fa-feather-pointed text-emerald-700"></i>
          Official Noting Sheet & Endorsements
        </h4>

        <div class="space-y-4 mt-4 max-h-80 overflow-y-auto pr-2">
          ${notingSheet.map((item, i) => `
            <div class="border-b border-amber-900/10 pb-3 text-xs">
              <div class="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span class="font-bold text-slate-700">Paragraph #${i + 1} — ${item.action}</span>
                <span class="font-mono text-slate-400">${item.timestamp}</span>
              </div>
              <p class="text-slate-800 leading-relaxed font-serif text-[13px] bg-amber-50/50 p-2.5 rounded border border-amber-900/5">
                "${item.remarks}"
              </p>
              <div class="mt-1.5 flex items-center justify-end gap-2 text-[11px] text-emerald-800 font-medium">
                <i class="fa-solid fa-signature"></i>
                <span>${item.officer}</span>
                <span class="text-slate-400">|</span>
                <span class="text-slate-500 italic">${item.designation}</span>
              </div>
            </div>
          `).join('')}
        </div>

        ${canAddNote ? `
          <div class="mt-4 pt-3 border-t border-emerald-800/20">
            <label class="block text-xs font-semibold text-slate-700 mb-1">Record Official Note / Minute</label>
            <div class="flex gap-2">
              <input type="text" id="quick-note-input" placeholder="Type official remark or observation to append to noting sheet..." 
                class="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <button onclick="appController.appendNotingSheetRemark('${billId}')" 
                class="px-3 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900 transition-colors flex items-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-plus"></i> Add Note
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  // 3-Way Reconciliation Table (For Official View)
  renderThreeWayMatch(bill) {
    const qtyMatched = Number(bill.receivedQty) === Number(bill.billedQty);
    const qtyDiff = Number(bill.billedQty) - Number(bill.receivedQty);

    return `
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-blue-700"></i>
            <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide">3-Way Reconciliation Audit (PO vs GRN vs Invoice)</h4>
          </div>
          ${qtyMatched ? `
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <i class="fa-solid fa-circle-check"></i> Perfect Match
            </span>
          ` : `
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
              <i class="fa-solid fa-triangle-exclamation"></i> Discrepancy (${qtyDiff > 0 ? '+' : ''}${qtyDiff} Qtl)
            </span>
          `}
        </div>

        <div class="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <!-- Pillar 1: Purchase/Sanction Order -->
          <div class="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200">
            <div class="flex items-center justify-between text-slate-500 font-semibold mb-2">
              <span class="flex items-center gap-1"><i class="fa-solid fa-file-contract text-blue-600"></i> 1. Sanction Order</span>
              <span class="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">PO Ref</span>
            </div>
            <p class="font-bold text-slate-800">${bill.poNumber}</p>
            <div class="mt-2 space-y-1 text-slate-600 text-[11px]">
              <div>Commodity: <span class="font-medium text-slate-900">${bill.commodity}</span></div>
              <div>Rate Sanctioned: <span class="font-medium text-slate-900">₹${bill.ratePerUnit}/${bill.unit}</span></div>
              <div>District: <span class="font-medium text-slate-900">${bill.district}</span></div>
            </div>
          </div>

          <!-- Pillar 2: Digital Godown Receipt -->
          <div class="p-3.5 ${qtyMatched ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'} rounded-lg border">
            <div class="flex items-center justify-between text-slate-500 font-semibold mb-2">
              <span class="flex items-center gap-1"><i class="fa-solid fa-warehouse text-emerald-600"></i> 2. Digital GRN Slip</span>
              <span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">${bill.grnNumber}</span>
            </div>
            <p class="font-bold text-slate-800">${bill.godownName}</p>
            <div class="mt-2 space-y-1 text-slate-600 text-[11px]">
              <div>Physically Received: <span class="font-bold text-slate-900">${bill.receivedQty} ${bill.unit}</span></div>
              <div>Weighment Status: <span class="text-emerald-700 font-medium">Slip Verified</span></div>
              <div>Moisture / Refraction: <span class="font-medium text-slate-900">Lab Approved</span></div>
            </div>
          </div>

          <!-- Pillar 3: Supplier Tax Invoice -->
          <div class="p-3.5 ${qtyMatched ? 'bg-slate-50/80 border-slate-200' : 'bg-rose-50/60 border-rose-200'} rounded-lg border">
            <div class="flex items-center justify-between text-slate-500 font-semibold mb-2">
              <span class="flex items-center gap-1"><i class="fa-solid fa-file-invoice text-indigo-600"></i> 3. Tax Invoice</span>
              <span class="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono">${bill.invoiceNumber}</span>
            </div>
            <p class="font-bold text-slate-800">${bill.supplierName}</p>
            <div class="mt-2 space-y-1 text-slate-600 text-[11px]">
              <div>Billed Quantity: <span class="font-bold ${qtyMatched ? 'text-slate-900' : 'text-rose-600'}">${bill.billedQty} ${bill.unit}</span></div>
              <div>Gross Claimed: <span class="font-medium text-slate-900">₹${bill.grossAmount.toLocaleString('en-IN')}</span></div>
              <div>GSTIN: <span class="font-mono text-slate-700">${bill.supplierGstin}</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // Printable Sanction Order & Payment Voucher
  renderVoucherModal(bill) {
    return `
      <div id="printable-voucher" class="bg-white p-8 max-w-3xl mx-auto border border-slate-300 rounded-xl shadow-lg relative watermark-passed">
        <!-- Official Government Header -->
        <div class="border-b-2 border-slate-900 pb-4 text-center">
          <div class="flex items-center justify-center gap-3 mb-2">
            <div class="w-12 h-12 rounded-full border-2 border-amber-600 bg-amber-50 flex items-center justify-center font-bold text-amber-800 text-xl">
              <i class="fa-solid fa-landmark"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 font-gujarati">ગુજરાત રાજ્ય નાગરિક પુરવઠા નિગમ લિમિટેડ</h2>
              <h1 class="text-sm font-bold tracking-wider text-slate-800 uppercase">Gujarat State Civil Supplies Corporation Limited</h1>
              <p class="text-[10px] text-slate-500">A Government of Gujarat Undertaking | Sector 10-A, Gandhinagar - 382010</p>
            </div>
          </div>
          <div class="inline-block px-4 py-1 bg-slate-900 text-white text-xs font-bold tracking-widest uppercase rounded">
            TREASURY DISBURSEMENT VOUCHER & SANCTION ADVICE
          </div>
        </div>

        <!-- Voucher Metadata -->
        <div class="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
          <div>
            <p><span class="text-slate-500 font-medium">Voucher Number:</span> <span class="font-mono font-bold text-slate-900">${bill.paymentDetails ? bill.paymentDetails.voucherNumber : 'PROVISIONAL-VOUCHER'}</span></p>
            <p><span class="text-slate-500 font-medium">Sanction Order:</span> <span class="font-mono font-bold text-slate-900">${bill.poNumber}</span></p>
            <p><span class="text-slate-500 font-medium">Digital GRN No:</span> <span class="font-mono text-slate-900">${bill.grnNumber}</span></p>
            <p><span class="text-slate-500 font-medium">Godown:</span> <span class="text-slate-900">${bill.godownName}</span></p>
          </div>
          <div class="text-right">
            <p><span class="text-slate-500 font-medium">Payment Date:</span> <span class="font-mono font-bold text-slate-900">${bill.paymentDetails ? bill.paymentDetails.paymentDate : new Date().toISOString().split('T')[0]}</span></p>
            <p><span class="text-slate-500 font-medium">UTR Reference:</span> <span class="font-mono font-bold text-emerald-700">${bill.paymentDetails ? bill.paymentDetails.utrNumber : 'CMS-PENDING'}</span></p>
            <p><span class="text-slate-500 font-medium">Payment Gateway:</span> <span class="text-slate-900">${bill.paymentDetails ? bill.paymentDetails.paymentMode : 'IFMS-Gujarat PFMS'}</span></p>
            <p><span class="text-slate-500 font-medium">Bill Reference:</span> <span class="font-bold text-slate-900">${bill.id}</span></p>
          </div>
        </div>

        <!-- Beneficiary / Payee Details -->
        <div class="py-3 border-b border-slate-200 text-xs">
          <h4 class="font-bold text-slate-800 uppercase mb-1">Beneficiary Vendor Details:</h4>
          <div class="grid grid-cols-2 gap-2 text-slate-700">
            <div>
              <p>Name: <strong class="text-slate-900">${bill.supplierName}</strong></p>
              <p>GSTIN: <span class="font-mono">${bill.supplierGstin}</span> | PAN: <span class="font-mono">${bill.supplierPan}</span></p>
            </div>
            <div>
              <p>Bank: <strong>${bill.supplierBank.bankName}</strong></p>
              <p>Account No: <span class="font-mono font-bold">${bill.supplierBank.accountNo}</span> (IFSC: <span class="font-mono">${bill.supplierBank.ifsc}</span>)</p>
            </div>
          </div>
        </div>

        <!-- Financial Breakdown Table -->
        <div class="py-4">
          <table class="w-full text-xs text-left border border-slate-200">
            <thead class="bg-slate-100 font-bold text-slate-700">
              <tr>
                <th class="p-2 border border-slate-200">Description of Commodity / Supply</th>
                <th class="p-2 border border-slate-200 text-right">Quantity</th>
                <th class="p-2 border border-slate-200 text-right">Rate</th>
                <th class="p-2 border border-slate-200 text-right">Gross Claim (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="p-2 border border-slate-200">
                  <strong>${bill.commodity}</strong><br>
                  <span class="text-[10px] text-slate-500">Tax Invoice: ${bill.invoiceNumber} dt. ${bill.invoiceDate}</span>
                </td>
                <td class="p-2 border border-slate-200 text-right font-mono">${bill.billedQty} ${bill.unit}</td>
                <td class="p-2 border border-slate-200 text-right font-mono">₹${bill.ratePerUnit.toFixed(2)}</td>
                <td class="p-2 border border-slate-200 text-right font-mono font-bold">₹${bill.grossAmount.toLocaleString('en-IN')}</td>
              </tr>
              <!-- Deductions sub-table -->
              <tr class="bg-slate-50 font-semibold text-slate-600">
                <td colspan="3" class="p-2 border border-slate-200">Less: Statutory TDS under IT Act Sec 194Q (0.1%)</td>
                <td class="p-2 border border-slate-200 text-right font-mono text-rose-700">- ₹${(bill.deductions.tds194Q || 0).toLocaleString('en-IN')}</td>
              </tr>
              <tr class="bg-slate-50 font-semibold text-slate-600">
                <td colspan="3" class="p-2 border border-slate-200">Less: GST TDS (2.0% - 1% CGST + 1% SGST)</td>
                <td class="p-2 border border-slate-200 text-right font-mono text-rose-700">- ₹${(bill.deductions.gstTds || 0).toLocaleString('en-IN')}</td>
              </tr>
              ${bill.deductions.moistureDeduction > 0 ? `
                <tr class="bg-slate-50 font-semibold text-slate-600">
                  <td colspan="3" class="p-2 border border-slate-200">Less: Quality / Moisture Discrepancy Penalty</td>
                  <td class="p-2 border border-slate-200 text-right font-mono text-rose-700">- ₹${bill.deductions.moistureDeduction.toLocaleString('en-IN')}</td>
                </tr>
              ` : ''}
              ${bill.deductions.refractionCut > 0 ? `
                <tr class="bg-slate-50 font-semibold text-slate-600">
                  <td colspan="3" class="p-2 border border-slate-200">Less: Refraction / Broken Grain Deduction</td>
                  <td class="p-2 border border-slate-200 text-right font-mono text-rose-700">- ₹${bill.deductions.refractionCut.toLocaleString('en-IN')}</td>
                </tr>
              ` : ''}
              <tr class="bg-emerald-50 text-emerald-900 font-bold text-sm">
                <td colspan="3" class="p-3 border border-slate-200 text-right uppercase">Net Amount Passed & Disbursed:</td>
                <td class="p-3 border border-slate-200 text-right font-mono text-emerald-800 text-base">₹${bill.netPayable.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Official Seal & Signatures -->
        <div class="mt-8 pt-4 border-t-2 border-slate-200 grid grid-cols-3 gap-4 text-center text-[11px]">
          <div>
            <div class="h-10"></div>
            <p class="font-bold text-slate-800">Pre-Audited By</p>
            <p class="text-slate-500">Sr. Accounts Officer</p>
            <p class="text-[10px] text-emerald-700 font-medium">✓ Digitally Verified</p>
          </div>
          <div>
            <div class="h-10"></div>
            <p class="font-bold text-slate-800">Sanctioned By</p>
            <p class="text-slate-500">General Manager (Proc.)</p>
            <p class="text-[10px] text-emerald-700 font-medium">✓ Digitally Approved</p>
          </div>
          <div>
            <div class="h-10"></div>
            <p class="font-bold text-slate-800">Disbursed By</p>
            <p class="text-slate-500">Chief Accounts Officer (Treasury)</p>
            <p class="text-[10px] text-emerald-700 font-medium">✓ IFMS Gateway Signed</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between no-print">
          <span class="text-xs text-slate-400">Generated automatically by GSCSCL Billing System v2.6</span>
          <div class="flex gap-2">
            <button onclick="window.print()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow">
              <i class="fa-solid fa-print"></i> Print Voucher
            </button>
            <button onclick="appController.closeModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  }
};
