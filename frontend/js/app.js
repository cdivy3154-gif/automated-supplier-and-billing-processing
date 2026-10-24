/**
 * GSCSCL - Automated Commodity Supplier Billing & Payment Processing System
 * Main Application Controller, Authentication & View Orchestrator
 */

class AppController {
  constructor() {
    this.currentFilter = {
      search: "",
      status: "All",
      category: "All",
      district: "All"
    };
    this.chartInstances = {};
    this.currentCaptcha = "";
    this.simulatedOtp = "";
  }

  init() {
    // Generate initial captcha
    this.generateCaptcha();

    // Subscribe to state updates
    AppState.subscribe(() => {
      this.render();
    });

    // Initial render
    this.render();
    this.setupGlobalEvents();
  }

  setupGlobalEvents() {
    // Close modal on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // Close notifications dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('notification-dropdown');
      const bell = document.getElementById('notification-bell-btn');
      if (dropdown && bell && !dropdown.contains(e.target) && !bell.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // Captcha Generator
  generateCaptcha() {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.currentCaptcha = code;
    const el = document.getElementById('captcha-display');
    if (el) el.innerText = code;
    return code;
  }

  // Toggle Password Visibility
  togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('password-eye-icon');
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      if (icon) icon.className = "fa-solid fa-eye-slash text-slate-400 hover:text-slate-600";
    } else {
      input.type = 'password';
      if (icon) icon.className = "fa-solid fa-eye text-slate-400 hover:text-slate-600";
    }
  }

  // -------------------------------------------------------------
  // AUTHENTICATION CONTROLLER
  // -------------------------------------------------------------

  handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('login-username')?.value || "";
    const password = document.getElementById('login-password')?.value || "";
    const captcha = document.getElementById('login-captcha')?.value || "";

    const res = AppState.login(username, password, captcha, this.currentCaptcha);

    if (res.success) {
      this.showToast(`Welcome, ${res.role.officer}! Signed in as ${res.role.name}.`, "success");
    } else {
      this.showToast(res.message, "warning");
      this.generateCaptcha();
      const captchaInput = document.getElementById('login-captcha');
      if (captchaInput) {
        captchaInput.value = "";
        captchaInput.focus();
      }
    }
  }

  quickLogin(roleId) {
    const role = GSCSCL_DATA.roles.find(r => r.id === roleId);
    if (!role) return;

    AppState.quickDemoLogin(roleId);
    this.showToast(`Switched perspective to ${role.name} (${role.department}).`, "success");
  }

  fillDemoCredentials(roleId) {
    const role = GSCSCL_DATA.roles.find(r => r.id === roleId);
    if (!role) return;

    const userEl = document.getElementById('login-username');
    const passEl = document.getElementById('login-password');
    const capEl = document.getElementById('login-captcha');

    if (userEl) userEl.value = role.username;
    if (passEl) passEl.value = role.password;
    if (capEl) capEl.value = this.currentCaptcha;

    this.showToast(`Filled credentials for ${role.name}. Click "Sign In" or use 1-Click Login.`, "info");
  }

  handleLogout() {
    const prev = AppState.logout();
    this.showToast(prev ? `Officer ${prev.officer} signed out safely.` : "Session terminated successfully.", "info");
  }

  // Forgot Password Modal
  openForgotPasswordModal() {
    this.simulatedOtp = String(Math.floor(100000 + Math.random() * 900000));

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          <div class="bg-blue-900 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-sm">
                <i class="fa-solid fa-key"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold">Government Single Sign-On (SSO) Support</h3>
                <p class="text-xs text-blue-200">Reset Credentials / Employee PIN</p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-blue-200 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onsubmit="appController.handleResetPasswordSubmit(event)" class="p-6 space-y-4 text-xs">
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
              <i class="fa-solid fa-shield-halved text-blue-700 mr-1.5"></i>
              For security, a 6-digit OTP has been dispatched to your registered Aadhaar/Mobile number.
            </div>

            <div>
              <label class="block font-bold text-slate-700 uppercase mb-1">Enter User ID / Registered Mobile</label>
              <input type="text" id="reset-user-id" required value="SUP-881" 
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
            </div>

            <div>
              <label class="block font-bold text-slate-700 uppercase mb-1">
                Enter 6-Digit Verification OTP (Simulation: <strong class="text-emerald-700 font-mono">${this.simulatedOtp}</strong>)
              </label>
              <input type="text" id="reset-otp" required placeholder="Enter OTP..." value="${this.simulatedOtp}"
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono font-bold tracking-widest text-center text-sm">
            </div>

            <div>
              <label class="block font-bold text-slate-700 uppercase mb-1">New Password</label>
              <input type="password" id="reset-new-pass" required value="Vendor@2026" 
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button type="button" onclick="appController.closeModal()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold">
                Cancel
              </button>
              <button type="submit" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm">
                Update Credentials & Proceed
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.openModalHTML(html);
  }

  handleResetPasswordSubmit(e) {
    e.preventDefault();
    const otp = document.getElementById('reset-otp')?.value || "";
    if (otp !== this.simulatedOtp) {
      this.showToast("Invalid OTP entered. Please check simulated OTP.", "warning");
      return;
    }

    this.closeModal();
    this.showToast("Password reset successfully. Please sign in with your updated credentials.", "success");
  }

  // -------------------------------------------------------------
  // MAIN RENDER ROUTINE
  // -------------------------------------------------------------
  render() {
    const isAuth = AppState.isAuthenticated();
    const authScreen = document.getElementById('auth-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');

    if (!isAuth) {
      if (authScreen) authScreen.classList.remove('hidden');
      if (dashboardScreen) dashboardScreen.classList.add('hidden');
      this.renderLoginPage();
      return;
    }

    // If Authenticated
    if (authScreen) authScreen.classList.add('hidden');
    if (dashboardScreen) dashboardScreen.classList.remove('hidden');

    this.renderHeader();
    this.renderNavigation();
    this.renderActiveTabContent();
  }

  // -------------------------------------------------------------
  // GOVERNMENT LOGIN PORTAL PAGE RENDERER
  // -------------------------------------------------------------
  renderLoginPage() {
    const container = document.getElementById('auth-screen');
    if (!container) return;

    container.innerHTML = `
      <div class="min-h-screen bg-slate-100 flex flex-col justify-between">
        
        <!-- Top Official Ribbon -->
        <div class="govt-ribbon"></div>

        <!-- Main Login Layout -->
        <div class="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 my-auto">
          
          <div class="grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
            
            <!-- LEFT PANEL: Government Informational & Statistics Banner -->
            <div class="lg:col-span-5 bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
              <div class="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
                <i class="fa-solid fa-wheat-awn text-[260px]"></i>
              </div>

              <div>
                <!-- Gujarat Govt Branding -->
                <div class="flex items-center gap-3 mb-6">
                  <div class="w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-500/10 flex items-center justify-center font-bold text-amber-400 text-xl shadow">
                    <i class="fa-solid fa-wheat-awn"></i>
                  </div>
                  <div>
                    <span class="text-[11px] font-bold text-amber-400 tracking-wider uppercase font-gujarati">ગુજરાત સરકાર • સરકારી સાહસ</span>
                    <h2 class="text-sm font-bold text-white uppercase tracking-tight">Gujarat State Civil Supplies Corporation Ltd.</h2>
                  </div>
                </div>

                <div class="border-t border-white/10 pt-4 mb-6">
                  <h1 class="text-xl sm:text-2xl font-bold leading-tight text-white mb-2 font-gujarati">
                    ગુજરાત રાજ્ય નાગરિક પુરવઠા નિગમ લિમિટેડ
                  </h1>
                  <p class="text-xs text-blue-200 leading-relaxed">
                    Automated Commodity Supplier Billing, 3-Way Audit Reconciliation & Electronic Treasury Payment System.
                  </p>
                </div>

                <!-- Key Procurement Milestones -->
                <div class="space-y-3 my-6">
                  <div class="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span class="text-slate-400 text-[10px] block uppercase font-bold">Annual Procurement</span>
                      <strong class="text-amber-400 font-mono text-sm">₹1,850+ Crores</strong>
                    </div>
                    <i class="fa-solid fa-coins text-amber-400 text-lg"></i>
                  </div>

                  <div class="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span class="text-slate-400 text-[10px] block uppercase font-bold">Electronic Clearance (DBT)</span>
                      <strong class="text-emerald-400 font-mono text-sm">100% Direct Bank Transfer</strong>
                    </div>
                    <i class="fa-solid fa-building-columns text-emerald-400 text-lg"></i>
                  </div>

                  <div class="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span class="text-slate-400 text-[10px] block uppercase font-bold">Network Connectivity</span>
                      <strong class="text-blue-300 font-mono text-sm">33 Districts & 240+ Godowns</strong>
                    </div>
                    <i class="fa-solid fa-network-wired text-blue-300 text-lg"></i>
                  </div>
                </div>
              </div>

              <!-- Footer Security & Support Badges -->
              <div class="pt-6 border-t border-white/10 text-xs text-slate-300 space-y-2">
                <div class="flex items-center gap-2">
                  <i class="fa-solid fa-shield-halved text-emerald-400"></i>
                  <span class="text-[11px]">256-Bit SSL Encrypted • State Data Centre (SDC) Hosted</span>
                </div>
                <div class="flex items-center gap-2">
                  <i class="fa-solid fa-headset text-amber-400"></i>
                  <span class="text-[11px]">Toll-Free Helpline: <strong>1800-233-5500</strong></span>
                </div>
              </div>
            </div>

            <!-- RIGHT PANEL: Government SSO Authentication Form -->
            <div class="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white">
              
              <div>
                <!-- Form Header -->
                <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <span class="text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 uppercase">
                      SSO Portal Sign-In
                    </span>
                    <h3 class="text-lg font-extrabold text-slate-900 mt-1">સત્તાવાર લૉગિન • Official Portal Access</h3>
                  </div>
                  <span class="text-[11px] text-slate-400 font-mono">Season: 2026-27</span>
                </div>

                <!-- QUICK DEMO 1-CLICK PERSONA SWITCHER -->
                <div class="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                      <i class="fa-solid fa-bolt text-amber-500"></i> Quick-Demo 1-Click Login:
                    </span>
                    <span class="text-[10px] text-slate-500">Click any persona to log in instantly:</span>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    ${GSCSCL_DATA.roles.map(r => `
                      <button onclick="appController.quickLogin('${r.id}')" 
                        class="p-2 rounded-lg border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all group shadow-2xs">
                        <div class="flex items-center gap-1.5 mb-1">
                          <span class="w-2 h-2 rounded-full ${r.color === 'blue' ? 'bg-blue-600' : (r.color === 'emerald' ? 'bg-emerald-600' : (r.color === 'amber' ? 'bg-amber-600' : (r.color === 'purple' ? 'bg-purple-600' : (r.color === 'indigo' ? 'bg-indigo-600' : 'bg-slate-700'))))}"></span>
                          <span class="text-[11px] font-bold text-slate-800 group-hover:text-blue-900 truncate">${r.name.split('/')[0]}</span>
                        </div>
                        <div class="text-[10px] text-slate-400 font-mono truncate">${r.username}</div>
                      </button>
                    `).join('')}
                  </div>
                </div>

                <!-- STANDARD LOGIN FORM -->
                <form id="government-login-form" onsubmit="appController.handleLoginSubmit(event)" class="space-y-4 text-xs">
                  
                  <!-- Field 1: User ID / Employee Code / GSTIN -->
                  <div>
                    <label class="block font-bold text-slate-700 uppercase mb-1">
                      User ID / Employee Code / Vendor ID <span class="text-rose-500">*</span>
                    </label>
                    <div class="relative">
                      <input type="text" id="login-username" required placeholder="e.g. SUP-881, GDN-AHM-01, AUD-HQ-04..." 
                        value="SUP-881"
                        class="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono bg-white">
                      <i class="fa-solid fa-user absolute left-3 top-3 text-slate-400"></i>
                    </div>
                  </div>

                  <!-- Field 2: Password with Show/Hide toggle -->
                  <div>
                    <div class="flex justify-between items-center mb-1">
                      <label class="block font-bold text-slate-700 uppercase">
                        Password / ગુપ્ત કોડ <span class="text-rose-500">*</span>
                      </label>
                      <button type="button" onclick="appController.openForgotPasswordModal()" class="text-[11px] text-blue-700 hover:underline">
                        Forgot Password?
                      </button>
                    </div>
                    <div class="relative">
                      <input type="password" id="login-password" required placeholder="Enter password..." 
                        value="Vendor@2026"
                        class="w-full text-xs pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono bg-white">
                      <i class="fa-solid fa-lock absolute left-3 top-3 text-slate-400"></i>
                      <button type="button" onclick="appController.togglePasswordVisibility()" class="absolute right-3 top-3">
                        <i id="password-eye-icon" class="fa-solid fa-eye text-slate-400 hover:text-slate-600"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Field 3: Interactive Alphanumeric Captcha -->
                  <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label class="block font-bold text-slate-700 uppercase text-[11px]">
                      Security Captcha Verification <span class="text-rose-500">*</span>
                    </label>
                    <div class="flex items-center gap-2">
                      <div class="captcha-box px-4 py-2 border border-slate-300 rounded-lg text-lg text-slate-800 tracking-widest font-mono flex items-center justify-center min-w-[120px] shadow-inner">
                        <span id="captcha-display">${this.currentCaptcha}</span>
                      </div>
                      <button type="button" onclick="appController.generateCaptcha()" 
                        class="p-2.5 text-slate-600 hover:text-blue-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg" title="Reload Captcha">
                        <i class="fa-solid fa-arrow-rotate-right"></i>
                      </button>
                      <input type="text" id="login-captcha" required maxlength="4" placeholder="Enter Captcha" 
                        value="${this.currentCaptcha}"
                        class="flex-1 text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 uppercase font-mono tracking-wider font-bold bg-white">
                    </div>
                  </div>

                  <!-- Remember Me & Policy -->
                  <div class="flex items-center justify-between text-[11px] text-slate-600">
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" id="remember-me-checkbox" checked class="rounded text-blue-600 focus:ring-blue-500">
                      <span>Remember session on this device</span>
                    </label>
                    <span class="text-slate-400">Digital Gujarat SSO</span>
                  </div>

                  <!-- Submit Button -->
                  <button type="submit" 
                    class="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-right-to-bracket"></i>
                    <span>Sign In to GSCSCL Portal • સાઇન ઇન કરો</span>
                  </button>
                </form>
              </div>

              <!-- Bottom Portal Advisory -->
              <div class="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                Access to this automated billing system is restricted to authorized vendors and Gujarat State Civil Supplies personnel. Unauthorized attempts are monitored under the IT Act 2000.
              </div>

            </div>

          </div>

        </div>

        <!-- Bottom Simple Footer -->
        <div class="bg-slate-900 text-slate-400 py-4 px-6 text-xs text-center border-t border-amber-500">
          <p>© 2026 Gujarat State Civil Supplies Corporation Limited. Government of Gujarat Undertaking.</p>
        </div>

      </div>
    `;

    setTimeout(() => {
      const cap = document.getElementById('captcha-display');
      if (cap) cap.innerText = this.currentCaptcha;
      const inp = document.getElementById('login-captcha');
      if (inp) inp.value = this.currentCaptcha;
    }, 10);
  }

  // -------------------------------------------------------------
  // AUTHENTICATED HEADER & NAVIGATION
  // -------------------------------------------------------------
  renderHeader() {
    const role = AppState.getCurrentRole();
    if (!role) return;

    const roleNameEl = document.getElementById('current-role-name');
    const roleDesigEl = document.getElementById('current-role-desig');
    const roleAvatarEl = document.getElementById('current-role-avatar');
    const roleBadgeEl = document.getElementById('current-role-badge');

    if (roleNameEl) roleNameEl.innerText = role.name;
    if (roleDesigEl) roleDesigEl.innerText = `${role.officer} • ${role.department}`;
    if (roleAvatarEl) roleAvatarEl.src = role.avatar;
    if (roleBadgeEl) roleBadgeEl.innerText = role.id.toUpperCase();

    // Notifications count
    const unread = AppState.state.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (unread > 0) {
        badge.innerText = unread;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    // Update global exceptions button & badge
    const excBtn = document.getElementById('global-exception-hub-btn');
    if (excBtn) {
      if (role.id === "supplier") {
        const returnedCount = AppState.getSupplierBills().filter(b => b.status === 'Exception Raised' || b.status === 'Returned for Correction').length;
        excBtn.innerHTML = `
          <i class="fa-solid fa-rotate-right"></i>
          <span>Returned Bills</span>
          ${returnedCount > 0 ? `<span id="global-exceptions-count" class="px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px]">${returnedCount}</span>` : ''}
        `;
        excBtn.className = "shrink-0 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs";
      } else {
        const count = AppState.getBills().filter(b => b.status === 'Exception Raised').length;
        excBtn.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Exception Hub</span>
          <span id="global-exceptions-count" class="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px]">${count}</span>
        `;
        excBtn.className = "shrink-0 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs";
      }
    }
  }

  renderNavigation() {
    const role = AppState.getCurrentRole();
    const navContainer = document.getElementById('role-nav-tabs');
    if (!navContainer || !role) return;

    let tabs = [];
    if (role.id === "supplier") {
      tabs = [
        { id: "dashboard", label: "Supplier Dashboard", icon: "fa-chart-pie" },
        { id: "bills", label: "Supplier Invoices", icon: "fa-file-invoice" },
        { id: "grns", label: "Receipts (GRN)", icon: "fa-receipt" },
        { id: "queries", label: "Queries & Remarks", icon: "fa-comments" }
      ];
    } else if (role.id === "godown_manager") {
      tabs = [
        { id: "dashboard", label: "Godown Dashboard", icon: "fa-chart-pie" },
        { id: "inward_queue", label: "Inward Verification Queue", icon: "fa-warehouse", countBadge: this.getQueueCount('Submitted') },
        { id: "all_bills", label: "District Stock & Bills", icon: "fa-boxes-stacked" },
        { id: "exceptions", label: "Discrepancy Log", icon: "fa-triangle-exclamation" }
      ];
    } else if (role.id === "pre_audit") {
      tabs = [
        { id: "dashboard", label: "Pre-Audit Dashboard", icon: "fa-chart-pie" },
        { id: "audit_queue", label: "Pre-Audit Work Queue", icon: "fa-clipboard-check", countBadge: this.getQueueCount('Pre-Audit') },
        { id: "all_bills", label: "All Audited Cases", icon: "fa-file-signature" },
        { id: "exceptions", label: "Audit Queries Hub", icon: "fa-triangle-exclamation", countBadge: this.getExceptionsCount() }
      ];
    } else if (role.id === "general_manager") {
      tabs = [
        { id: "dashboard", label: "Executive Dashboard", icon: "fa-chart-pie" },
        { id: "sanction_queue", label: "Sanction Approval Queue", icon: "fa-stamp", countBadge: this.getQueueCount('Approval Pending') },
        { id: "all_bills", label: "State Procurement Register", icon: "fa-folder-tree" },
        { id: "exceptions", label: "Exception Overrides", icon: "fa-triangle-exclamation" }
      ];
    } else if (role.id === "finance") {
      tabs = [
        { id: "dashboard", label: "Treasury Dashboard", icon: "fa-chart-pie" },
        { id: "finance_queue", label: "Payment Release Queue", icon: "fa-file-invoice-dollar", countBadge: this.getQueueCount('Sent to Finance') },
        { id: "disbursed", label: "Paid Vouchers & RTGS Log", icon: "fa-money-bill-transfer" },
        { id: "exceptions", label: "Banking Issues", icon: "fa-triangle-exclamation" }
      ];
    } else if (role.id === "admin") {
      tabs = [
        { id: "dashboard", label: "Management Monitor", icon: "fa-chart-line" },
        { id: "pipeline", label: "Pipeline & SLA Tracker", icon: "fa-timeline" },
        { id: "exceptions", label: "Exception Management Hub", icon: "fa-triangle-exclamation", countBadge: this.getExceptionsCount() },
        { id: "all_bills", label: "Master Bill Ledger", icon: "fa-database" }
      ];
    }

    const currentTab = AppState.state.activeTab;
    navContainer.innerHTML = tabs.map(tab => {
      const isActive = currentTab === tab.id;
      return `
        <button onclick="AppState.setActiveTab('${tab.id}')" 
          class="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            isActive 
              ? 'bg-blue-900 text-white shadow-sm' 
              : 'text-slate-600 hover:text-blue-900 hover:bg-slate-100'
          }">
          <i class="fa-solid ${tab.icon} ${isActive ? 'text-amber-400' : 'text-slate-400'}"></i>
          <span>${tab.label}</span>
          ${tab.countBadge ? `
            <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-amber-400 text-slate-900' : 'bg-blue-100 text-blue-800'}">
              ${tab.countBadge}
            </span>
          ` : ''}
        </button>
      `;
    }).join('');
  }

  getQueueCount(status) {
    const count = AppState.getBills().filter(b => b.status === status).length;
    return count > 0 ? count : null;
  }

  getExceptionsCount() {
    const count = AppState.getBills().filter(b => b.status === 'Exception Raised').length;
    return count > 0 ? count : null;
  }

  // -------------------------------------------------------------
  // DASHBOARD CONTENT ORCHESTRATION
  // -------------------------------------------------------------
  renderActiveTabContent() {
    const mainContainer = document.getElementById('main-content-view');
    if (!mainContainer) return;

    const role = AppState.getCurrentRole();
    if (!role) return;

    const tab = AppState.state.activeTab;

    if (tab === "exceptions") {
      if (role.id === "supplier") {
        mainContainer.innerHTML = this.renderSupplierQueriesView();
        return;
      }
      mainContainer.innerHTML = this.renderExceptionsHubView();
      return;
    }

    switch (role.id) {
      case "supplier":
        if (tab === "dashboard") mainContainer.innerHTML = this.renderSupplierDashboardView();
        else if (tab === "bills") mainContainer.innerHTML = this.renderSupplierBillsView();
        else if (tab === "grns") mainContainer.innerHTML = this.renderAvailableGRNsView();
        else if (tab === "queries") mainContainer.innerHTML = this.renderSupplierQueriesView();
        else mainContainer.innerHTML = this.renderSupplierDashboardView();
        break;

      case "godown_manager":
        if (tab === "dashboard") mainContainer.innerHTML = this.renderGodownDashboardView();
        else if (tab === "inward_queue") mainContainer.innerHTML = this.renderGodownQueueView();
        else if (tab === "all_bills") mainContainer.innerHTML = this.renderGenericMasterTableView("All Stock Inward & Invoiced Consignments");
        else mainContainer.innerHTML = this.renderGodownDashboardView();
        break;

      case "pre_audit":
        if (tab === "dashboard") mainContainer.innerHTML = this.renderPreAuditDashboardView();
        else if (tab === "audit_queue") mainContainer.innerHTML = this.renderPreAuditQueueView();
        else if (tab === "all_bills") mainContainer.innerHTML = this.renderGenericMasterTableView("Pre-Audit Verified Records");
        else mainContainer.innerHTML = this.renderPreAuditDashboardView();
        break;

      case "general_manager":
        if (tab === "dashboard") mainContainer.innerHTML = this.renderGMDashboardView();
        else if (tab === "sanction_queue") mainContainer.innerHTML = this.renderGMQueueView();
        else if (tab === "all_bills") mainContainer.innerHTML = this.renderGenericMasterTableView("Corporate Procurement Bills Register");
        else mainContainer.innerHTML = this.renderGMDashboardView();
        break;

      case "finance":
        if (tab === "dashboard") mainContainer.innerHTML = this.renderFinanceDashboardView();
        else if (tab === "finance_queue") mainContainer.innerHTML = this.renderFinanceQueueView();
        else if (tab === "disbursed") mainContainer.innerHTML = this.renderFinanceDisbursedView();
        else mainContainer.innerHTML = this.renderFinanceDashboardView();
        break;

      case "admin":
        if (tab === "dashboard") {
          mainContainer.innerHTML = this.renderAdminDashboardView();
          setTimeout(() => this.initAdminCharts(), 50);
        } else if (tab === "pipeline") {
          mainContainer.innerHTML = this.renderPipelineTrackerView();
        } else if (tab === "all_bills") {
          mainContainer.innerHTML = this.renderGenericMasterTableView("GSCSCL Master Billing & Treasury Ledger");
        } else {
          mainContainer.innerHTML = this.renderAdminDashboardView();
          setTimeout(() => this.initAdminCharts(), 50);
        }
        break;

      default:
        mainContainer.innerHTML = this.renderSupplierDashboardView();
    }
  }

  // Set Search & Filters
  setSearch(query) {
    this.currentFilter.search = (query || "").toLowerCase();
    this.renderActiveTabContent();
  }

  setStatusFilter(status) {
    this.currentFilter.status = status;
    this.renderActiveTabContent();
  }

  setCategoryFilter(category) {
    this.currentFilter.category = category;
    this.renderActiveTabContent();
  }

  setDistrictFilter(district) {
    this.currentFilter.district = district;
    this.renderActiveTabContent();
  }

  resetFilters() {
    this.currentFilter = {
      search: "",
      status: "All",
      category: "All",
      district: "All"
    };
    const sInput = document.getElementById('table-search-input');
    if (sInput) sInput.value = "";
    this.renderActiveTabContent();
  }

  getFilteredBills(customRoleFilter = null) {
    let bills = AppState.getBills();

    if (customRoleFilter) {
      bills = bills.filter(customRoleFilter);
    }

    return bills.filter(b => {
      if (this.currentFilter.search) {
        const q = this.currentFilter.search;
        const matches = 
          b.id.toLowerCase().includes(q) ||
          b.supplierName.toLowerCase().includes(q) ||
          b.grnNumber.toLowerCase().includes(q) ||
          b.commodity.toLowerCase().includes(q) ||
          b.district.toLowerCase().includes(q) ||
          b.invoiceNumber.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (this.currentFilter.status !== "All" && b.status !== this.currentFilter.status) {
        return false;
      }

      if (this.currentFilter.category !== "All" && b.category !== this.currentFilter.category) {
        return false;
      }

      if (this.currentFilter.district !== "All" && b.district !== this.currentFilter.district) {
        return false;
      }

      return true;
    });
  }

  // -------------------------------------------------------------
  // 1. SUPPLIER PORTAL VIEWS
  // -------------------------------------------------------------
  renderSupplierDashboardView() {
    const bills = AppState.getSupplierBills();

    // 1. Total Bills Submitted (exclude drafts)
    const submittedBills = bills.filter(b => b.status !== "Draft");
    const totalSubmitted = submittedBills.length;

    // 2. Bills Pending (Submitted, Under Verification, Pre-Audit, Approval Pending)
    const pendingBills = bills.filter(b => 
      b.status === "Submitted" || 
      b.status === "Under Verification" || 
      b.status === "Pre-Audit" || 
      b.status === "Approval Pending"
    ).length;

    // 3. Bills Returned for Correction
    const returnedBills = bills.filter(b => b.status === "Exception Raised" || b.status === "Returned for Correction");
    const returnedCount = returnedBills.length;

    // 4. Approved Bills (Sent to Finance or Payment Processed)
    const approvedBills = bills.filter(b => b.status === "Sent to Finance" || b.status === "Payment Processed").length;

    // 5. Payments Completed (Payment Processed)
    const completedPayments = bills.filter(b => b.status === "Payment Processed").length;

    // 6. Total Payment Pending (All non-completed non-draft bills net amount)
    const totalPaymentPending = bills
      .filter(b => b.status !== "Payment Processed" && b.status !== "Draft")
      .reduce((acc, b) => acc + (b.netPayable || 0), 0);

    const firstReturned = returnedBills[0];

    return `
      <div class="space-y-6">
        <!-- Supplier Portal Header Banner -->
        <div class="portal-card bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-slate-900 uppercase">Supplier Portal</span>
              <span class="text-xs text-blue-200">GSTIN: 24AAACG1234F1ZQ</span>
            </div>
            <h2 class="text-xl md:text-2xl font-bold">Shree Gujarat Agro Commodities FPO Ltd.</h2>
            <p class="text-xs text-blue-100 mt-1">Authorized Commodity Supplier for Gujarat State Civil Supplies Corporation Limited</p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="appController.openSubmitBillModal()" 
              class="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-2">
              <i class="fa-solid fa-file-circle-plus"></i> Submit Bill
            </button>
            <button onclick="AppState.setActiveTab('grns')" 
              class="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg border border-white/20 transition-all flex items-center gap-2">
              <i class="fa-solid fa-receipt"></i> Receipts (GRN) (${AppState.getAvailableGRNs().length})
            </button>
          </div>
        </div>

        <!-- 6 Simple English Metric Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          ${UI.renderKpiCard("Total Bills Submitted", `${totalSubmitted} Bills`, "All submitted bills", "fa-file-invoice", "bg-blue-100 text-blue-700")}
          ${UI.renderKpiCard("Bills Pending", `${pendingBills} Bills`, "Under official review", "fa-hourglass-half", "bg-amber-100 text-amber-700")}
          ${UI.renderKpiCard("Bills Returned for Correction", `${returnedCount} Bill${returnedCount === 1 ? '' : 's'}`, returnedCount > 0 ? "Action needed by you" : "No returned bills", "fa-triangle-exclamation", returnedCount > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}
          ${UI.renderKpiCard("Approved Bills", `${approvedBills} Bills`, "Sanctioned & in payout", "fa-circle-check", "bg-indigo-100 text-indigo-700")}
          ${UI.renderKpiCard("Payments Completed", `${completedPayments} Bills`, "Disbursed to bank", "fa-check-double", "bg-emerald-100 text-emerald-700")}
          ${UI.renderKpiCard("Total Payment Pending", UI.formatINR(totalPaymentPending), "Awaiting payment release", "fa-clock", "bg-sky-100 text-sky-700")}
        </div>

        <!-- Alert Banner if a bill is returned for correction -->
        ${firstReturned ? `
          <div class="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 class="text-sm font-bold text-amber-950">Action Needed: Bill ${firstReturned.id} Returned for Correction</h4>
                <p class="text-xs text-amber-800 mt-0.5">
                  <strong>Reason from official:</strong> "${firstReturned.exception?.reason || firstReturned.publicRemark || 'Document or quantity correction required.'}"
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-center">
              <button onclick="appController.openResubmitBillModal('${firstReturned.id}')" 
                class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap flex items-center gap-1.5">
                <i class="fa-solid fa-rotate-right"></i> Correct & Resubmit Bill
              </button>
              <button onclick="appController.openSupplierBillDetailsModal('${firstReturned.id}')" 
                class="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                View Reason
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Digital Receipts Available Alert -->
        ${AppState.getAvailableGRNs().length > 0 ? `
          <div class="bg-blue-50/60 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center text-lg">
                <i class="fa-solid fa-warehouse"></i>
              </div>
              <div>
                <h4 class="text-xs font-bold text-blue-900 uppercase">You have ${AppState.getAvailableGRNs().length} Unbilled Digital Receipts (GRN) ready</h4>
                <p class="text-xs text-blue-700">Stock inward has been completed at Sanand, Gandhinagar and Rajkot godowns. You can create your bill now.</p>
              </div>
            </div>
            <button onclick="appController.openSubmitBillModal()" class="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm">
              Submit Bill <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
          </div>
        ` : ''}

        <!-- Recent Invoices Table -->
        <div class="portal-card p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Recent Invoices</h3>
              <p class="text-xs text-slate-500">Track current status and official feedback for your submitted bills</p>
            </div>
            <button onclick="AppState.setActiveTab('bills')" class="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1">
              View All Invoices <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>

          ${this.renderSupplierInvoicesTableHTML(bills.slice(0, 5), true)}
        </div>
      </div>
    `;
  }

  renderSupplierBillsView() {
    const bills = this.getFilteredBills(b => b.supplierId === "SUP-GJ-2026-881");

    return `
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-slate-900">My Invoices</h2>
            <p class="text-xs text-slate-500">View and track all bills submitted by Shree Gujarat Agro Commodities FPO Ltd.</p>
          </div>
          <button onclick="appController.openSubmitBillModal()" 
            class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow flex items-center gap-2 self-start">
            <i class="fa-solid fa-plus"></i> Submit Bill
          </button>
        </div>

        ${this.renderSupplierFiltersBarHTML()}

        <div class="portal-card overflow-hidden">
          ${this.renderSupplierInvoicesTableHTML(bills)}
        </div>
      </div>
    `;
  }

  renderSupplierFiltersBarHTML() {
    return `
      <div class="portal-card p-4 bg-white border border-slate-200 rounded-xl space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
            <input type="text" id="table-search-input" 
              placeholder="Search by Bill No, Invoice, Commodity, Receipt..." 
              value="${this.currentFilter.search}"
              oninput="appController.setSearch(this.value)"
              class="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all">
          </div>

          <div>
            <select onchange="appController.setStatusFilter(this.value)" 
              class="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-700">
              <option value="All" ${this.currentFilter.status === 'All' ? 'selected' : ''}>All Statuses</option>
              <option value="Draft" ${this.currentFilter.status === 'Draft' ? 'selected' : ''}>Draft</option>
              <option value="Submitted" ${this.currentFilter.status === 'Submitted' ? 'selected' : ''}>Waiting for Verification</option>
              <option value="Pre-Audit" ${this.currentFilter.status === 'Pre-Audit' ? 'selected' : ''}>Waiting for Approval (Pre-Audit)</option>
              <option value="Approval Pending" ${this.currentFilter.status === 'Approval Pending' ? 'selected' : ''}>Waiting for Approval (GM)</option>
              <option value="Sent to Finance" ${this.currentFilter.status === 'Sent to Finance' ? 'selected' : ''}>Payment in Process</option>
              <option value="Payment Processed" ${this.currentFilter.status === 'Payment Processed' ? 'selected' : ''}>Payment Completed</option>
              <option value="Exception Raised" ${this.currentFilter.status === 'Exception Raised' ? 'selected' : ''}>Returned for Correction</option>
            </select>
          </div>

          <div>
            <select onchange="appController.setCategoryFilter(this.value)" 
              class="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-700">
              <option value="All" ${this.currentFilter.category === 'All' ? 'selected' : ''}>All Categories</option>
              <option value="CGP" ${this.currentFilter.category === 'CGP' ? 'selected' : ''}>CGP (Coarse Grain & Pulses)</option>
              <option value="TOC" ${this.currentFilter.category === 'TOC' ? 'selected' : ''}>TOC (Textile & Other)</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="appController.resetFilters()" 
              class="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
              <i class="fa-solid fa-filter-circle-xmark"></i> Reset Filters
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderSupplierInvoicesTableHTML(bills, isCompact = false) {
    if (bills.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400">
          <i class="fa-solid fa-folder-open text-4xl mb-3"></i>
          <h4 class="text-sm font-bold text-slate-700">No Invoices Found</h4>
          <p class="text-xs text-slate-500 mt-1">Try changing your search keywords or status filter.</p>
          <button onclick="appController.resetFilters()" class="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded">
            Reset Filters
          </button>
        </div>
      `;
    }

    return `
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th class="p-3">Bill Number</th>
              <th class="p-3">Receipt ID</th>
              <th class="p-3">Commodity Type</th>
              <th class="p-3 text-right">Bill Amount</th>
              <th class="p-3">Submission Date</th>
              <th class="p-3 text-center">Current Status</th>
              <th class="p-3">Remarks</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            ${bills.map(b => `
              <tr class="hover:bg-slate-50 transition-colors group">
                <td class="p-3">
                  <div class="font-mono font-bold text-blue-900 flex items-center gap-1.5">
                    ${b.id}
                    ${b.status === 'Draft' ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">Draft</span>' : ''}
                  </div>
                  <div class="text-[11px] text-slate-500 font-mono">Inv: ${b.invoiceNumber || '—'}</div>
                </td>

                <td class="p-3">
                  <div class="font-mono font-semibold text-slate-900">${b.grnNumber}</div>
                  <div class="text-[11px] text-slate-500">${b.godownName || b.district}</div>
                </td>

                <td class="p-3">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    ${UI.renderCategoryBadge(b.category)}
                    <span class="font-medium text-slate-800 truncate max-w-[150px]" title="${b.commodity}">${b.commodity}</span>
                  </div>
                  <div class="text-[11px] text-slate-500">${b.billedQty.toLocaleString('en-IN')} ${b.unit}</div>
                </td>

                <td class="p-3 text-right">
                  <div class="font-mono font-bold text-slate-900 text-xs">₹${b.netPayable.toLocaleString('en-IN')}</div>
                  <div class="text-[10px] text-slate-400">Gross: ₹${b.grossAmount.toLocaleString('en-IN')}</div>
                </td>

                <td class="p-3 text-slate-600 text-xs">
                  ${b.submissionDate}
                </td>

                <td class="p-3 text-center">
                  ${UI.renderSupplierStatusBadge(b.status)}
                </td>

                <td class="p-3 max-w-[200px]">
                  ${(b.status === 'Exception Raised' || b.status === 'Returned for Correction') ? `
                    <div class="text-rose-700 text-xs font-semibold leading-tight flex items-start gap-1">
                      <i class="fa-solid fa-triangle-exclamation text-rose-500 mt-0.5 flex-shrink-0"></i>
                      <span class="truncate" title="${b.exception?.reason || b.publicRemark || 'Returned for correction'}">
                        ${b.exception?.reason || b.publicRemark || 'Returned for correction'}
                      </span>
                    </div>
                  ` : b.status === 'Payment Processed' ? `
                    <div class="text-emerald-700 text-xs font-medium leading-tight flex items-center gap-1">
                      <i class="fa-solid fa-check text-emerald-500 flex-shrink-0"></i>
                      <span>Paid (UTR: ${b.utrNumber ? b.utrNumber.slice(-8) : 'Done'})</span>
                    </div>
                  ` : b.publicRemark ? `
                    <div class="text-slate-600 text-xs truncate" title="${b.publicRemark}">${b.publicRemark}</div>
                  ` : `
                    <span class="text-slate-400 italic text-xs">Normal processing</span>
                  `}
                  ${(b.queries && b.queries.length > 0) ? `
                    <div class="text-[10px] text-blue-700 font-semibold mt-0.5 flex items-center gap-1">
                      <i class="fa-solid fa-comments"></i> ${b.queries.length} query message${b.queries.length === 1 ? '' : 's'}
                    </div>
                  ` : ''}
                </td>

                <td class="p-3 text-right">
                  ${this.renderSupplierRowActions(b)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderSupplierRowActions(bill) {
    if (bill.status === "Draft") {
      return `
        <div class="flex items-center justify-end gap-1">
          <button onclick="appController.executeSubmitDraft('${bill.id}')" 
            class="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-[11px] font-bold shadow-sm" title="Submit Bill">
            <i class="fa-solid fa-paper-plane"></i> Submit Bill
          </button>
          <button onclick="appController.openEditDraftModal('${bill.id}')" 
            class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold" title="Edit Draft">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="appController.executeDeleteDraft('${bill.id}')" 
            class="p-1 text-slate-400 hover:text-rose-600 rounded text-xs" title="Delete Draft">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }

    if (bill.status === "Exception Raised" || bill.status === "Returned for Correction") {
      return `
        <div class="flex items-center justify-end gap-1">
          <button onclick="appController.openResubmitBillModal('${bill.id}')" 
            class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shadow-sm whitespace-nowrap" title="Correct and resubmit this bill">
            <i class="fa-solid fa-rotate-right"></i> Correct & Resubmit
          </button>
          <button onclick="appController.openSupplierBillDetailsModal('${bill.id}')" 
            class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold whitespace-nowrap" title="View reason for return">
            View Reason
          </button>
          <button onclick="appController.openRaiseQueryModal('${bill.id}')" 
            class="p-1.5 text-blue-700 hover:bg-blue-50 rounded text-xs" title="Raise a Query">
            <i class="fa-solid fa-circle-question"></i>
          </button>
        </div>
      `;
    }

    if (bill.status === "Submitted" || bill.status === "Under Verification" || bill.status === "Pre-Audit" || bill.status === "Approval Pending") {
      return `
        <div class="flex items-center justify-end gap-1">
          <button onclick="appController.openSupplierBillDetailsModal('${bill.id}')" 
            class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold whitespace-nowrap" title="View bill details">
            <i class="fa-solid fa-eye"></i> View Bill
          </button>
          <button onclick="appController.openLifecycleModal('${bill.id}')" 
            class="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded text-xs" title="Track Status">
            <i class="fa-solid fa-timeline"></i>
          </button>
          <button onclick="appController.openRaiseQueryModal('${bill.id}')" 
            class="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded text-xs" title="Raise a Query">
            <i class="fa-solid fa-circle-question"></i>
          </button>
        </div>
      `;
    }

    if (bill.status === "Sent to Finance") {
      return `
        <div class="flex items-center justify-end gap-1">
          <button onclick="appController.openSupplierBillDetailsModal('${bill.id}')" 
            class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded text-[11px] font-semibold whitespace-nowrap" title="View bill & payment progress">
            <i class="fa-solid fa-eye"></i> View Bill
          </button>
          <button onclick="appController.openLifecycleModal('${bill.id}')" 
            class="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded text-xs" title="Track Status">
            <i class="fa-solid fa-timeline"></i>
          </button>
          <button onclick="appController.openRaiseQueryModal('${bill.id}')" 
            class="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded text-xs" title="Raise a Query">
            <i class="fa-solid fa-circle-question"></i>
          </button>
        </div>
      `;
    }

    if (bill.status === "Payment Processed") {
      return `
        <div class="flex items-center justify-end gap-1">
          <button onclick="appController.openSupplierBillDetailsModal('${bill.id}')" 
            class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold whitespace-nowrap" title="View bill details">
            <i class="fa-solid fa-eye"></i> View Bill
          </button>
          <button onclick="appController.openVoucherModal('${bill.id}')" 
            class="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-sm whitespace-nowrap" title="View payment voucher">
            <i class="fa-solid fa-receipt"></i> Voucher
          </button>
        </div>
      `;
    }

    return `
      <button onclick="appController.openSupplierBillDetailsModal('${bill.id}')" 
        class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold">
        <i class="fa-solid fa-eye"></i> View Bill
      </button>
    `;
  }

  renderSupplierQueriesView() {
    const bills = AppState.getSupplierBills();
    const queryBills = bills.filter(b => (b.queries && b.queries.length > 0) || b.publicRemark || b.status === "Exception Raised" || b.status === "Returned for Correction");

    return `
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Queries & Official Remarks</h2>
            <p class="text-xs text-slate-500">View official remarks from GSCSCL officers and track your raised queries</p>
          </div>
          <button onclick="AppState.setActiveTab('bills')" 
            class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg self-start">
            <i class="fa-solid fa-arrow-left mr-1"></i> Back to Invoices
          </button>
        </div>

        ${queryBills.length === 0 ? `
          <div class="portal-card p-12 text-center text-slate-400">
            <i class="fa-solid fa-comments text-4xl mb-3 text-slate-300"></i>
            <h4 class="text-sm font-bold text-slate-700">No Queries or Remarks</h4>
            <p class="text-xs text-slate-500 mt-1">None of your bills currently have queries or returns. You can raise a query on any bill from the Invoices tab.</p>
          </div>
        ` : `
          <div class="space-y-3">
            ${queryBills.map(b => `
              <div class="portal-card p-4 border-l-4 ${b.status === 'Exception Raised' || b.status === 'Returned for Correction' ? 'border-l-rose-500' : 'border-l-blue-600'}">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono font-bold text-blue-950 text-xs">${b.id}</span>
                    <span class="text-xs text-slate-500">• ${b.commodity} (${b.grnNumber})</span>
                    ${UI.renderSupplierStatusBadge(b.status)}
                  </div>
                  <div class="flex items-center gap-2">
                    ${(b.status === 'Exception Raised' || b.status === 'Returned for Correction') ? `
                      <button onclick="appController.openResubmitBillModal('${b.id}')" 
                        class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold">
                        <i class="fa-solid fa-rotate-right mr-1"></i> Correct & Resubmit
                      </button>
                    ` : ''}
                    <button onclick="appController.openRaiseQueryModal('${b.id}')" 
                      class="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-[11px] font-bold">
                      <i class="fa-solid fa-comment-medical mr-1"></i> Ask Question
                    </button>
                    <button onclick="appController.openSupplierBillDetailsModal('${b.id}')" 
                      class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold">
                      View Bill
                    </button>
                  </div>
                </div>

                ${(b.status === 'Exception Raised' || b.status === 'Returned for Correction') ? `
                  <div class="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-900 mb-2">
                    <div class="font-bold flex items-center gap-1.5 mb-1 text-rose-800">
                      <i class="fa-solid fa-triangle-exclamation text-rose-600"></i>
                      Return Reason from Official:
                    </div>
                    <p class="leading-relaxed">${b.exception?.reason || b.publicRemark}</p>
                  </div>
                ` : b.publicRemark ? `
                  <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 mb-2">
                    <strong>Official Remark:</strong> ${b.publicRemark}
                  </div>
                ` : ''}

                ${b.queries && b.queries.length > 0 ? `
                  <div class="space-y-2 mt-3 pt-2 border-t border-slate-100">
                    <h5 class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Query History</h5>
                    ${b.queries.map(q => `
                      <div class="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 text-xs space-y-1">
                        <div class="flex items-center justify-between text-[11px] text-slate-500">
                          <span class="font-semibold text-blue-950"><i class="fa-solid fa-circle-user text-blue-700 mr-1"></i> ${q.sender || 'Supplier'}</span>
                          <span>${q.timestamp}</span>
                        </div>
                        <p class="text-slate-800 font-medium">${q.text}</p>
                        ${q.officialReply ? `
                          <div class="mt-2 p-2 bg-white rounded border border-blue-200 text-[11px] text-slate-700">
                            <span class="font-bold text-slate-900 block mb-0.5"><i class="fa-solid fa-reply text-emerald-600 mr-1"></i> Official Reply:</span>
                            ${q.officialReply}
                          </div>
                        ` : `
                          <span class="inline-block mt-1 text-[10px] text-amber-700 font-semibold">
                            <i class="fa-solid fa-clock mr-1"></i> Waiting for official response
                          </span>
                        `}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderAvailableGRNsView() {
    const grns = AppState.getAvailableGRNs();

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Digital Godown Receipts (GRN) Ready For Invoicing</h2>
            <p class="text-xs text-slate-500">Official electronic inward weighment receipts verified by GSCSCL Godown In-Charge</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${grns.length === 0 ? `
            <div class="col-span-full portal-card p-12 text-center text-slate-400">
              <i class="fa-solid fa-receipt text-4xl mb-3"></i>
              <p class="text-sm font-medium">All inward godown receipts have been invoiced.</p>
            </div>
          ` : grns.map(grn => `
            <div class="portal-card p-5 border-l-4 border-l-amber-500 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    ${grn.grnNumber}
                  </span>
                  ${UI.renderCategoryBadge(grn.category)}
                </div>
                <h3 class="text-sm font-bold text-slate-900 mb-1">${grn.commodity}</h3>
                <p class="text-xs text-slate-600 flex items-center gap-1 mb-3">
                  <i class="fa-solid fa-warehouse text-slate-400"></i> ${grn.godownName}
                </p>

                <div class="bg-slate-50 rounded-lg p-3 space-y-1.5 text-xs text-slate-600 border border-slate-200">
                  <div class="flex justify-between">
                    <span>Received Quantity:</span>
                    <strong class="text-slate-900 font-mono">${grn.quantityQuintals} Quintals (${grn.bagsCount} Bags)</strong>
                  </div>
                  <div class="flex justify-between">
                    <span>Truck / Vehicle No:</span>
                    <span class="font-mono text-slate-800">${grn.truckNumber}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Weighbridge Slip:</span>
                    <span class="font-mono text-slate-800">${grn.weighbridgeSlipNo}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Moisture Content:</span>
                    <span class="font-bold text-emerald-700">${grn.moisturePercent}% (Standard Passed)</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Sanction PO Ref:</span>
                    <span class="font-mono text-slate-700">${grn.poNumber}</span>
                  </div>
                </div>
              </div>

              <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span class="text-[11px] text-slate-400">Inward Date: ${grn.inwardDate}</span>
                <button onclick="appController.openSubmitBillModal('${grn.grnNumber}')" 
                  class="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5">
                  <i class="fa-solid fa-file-invoice"></i> Create Bill
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 2. GODOWN MANAGER VIEWS
  // -------------------------------------------------------------
  renderGodownDashboardView() {
    const bills = AppState.getBills();
    const pendingInward = bills.filter(b => b.status === "Submitted" || b.status === "Under Verification");
    const verifiedBills = bills.filter(b => b.auditChecklist && b.auditChecklist.weighmentSlipVerified);
    const exceptions = bills.filter(b => b.status === "Exception Raised" && b.exception.raisedBy && b.exception.raisedBy.includes("Godown"));

    return `
      <div class="space-y-6">
        <div class="portal-card bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-white text-amber-900 uppercase">Godown Clearance Station</span>
              <span class="text-xs text-amber-200">District: Ahmedabad / Sanand Base</span>
            </div>
            <h2 class="text-xl md:text-2xl font-bold">R. K. Patel, Godown In-Charge</h2>
            <p class="text-xs text-amber-100 mt-1">Verification of physical weighbridge receipts, electronic tare-slips & Agmark laboratory moisture tests</p>
          </div>
          <button onclick="AppState.setActiveTab('inward_queue')" 
            class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center gap-2 self-start md:self-auto">
            <i class="fa-solid fa-list-check"></i> Process Inward Queue (${pendingInward.length})
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${UI.renderKpiCard("Pending Inward Verification", `${pendingInward.length} Bills`, "Waiting for godown clearance", "fa-hourglass-half", "bg-amber-100 text-amber-800")}
          ${UI.renderKpiCard("Physically Verified", `${verifiedBills.length} Consignments`, "Weighbridge slips matched", "fa-clipboard-check", "bg-emerald-100 text-emerald-800")}
          ${UI.renderKpiCard("Discrepancies Flagged", `${exceptions.length} Cases`, "Weight / Moisture variances", "fa-triangle-exclamation", "bg-rose-100 text-rose-800")}
          ${UI.renderKpiCard("Avg Inspection Time", "2.1 Hours", "Well within 24h SLA target", "fa-bolt", "bg-blue-100 text-blue-800")}
        </div>

        <div class="portal-card p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Bills Awaiting Physical & GRN Verification</h3>
              <p class="text-xs text-slate-500">Cross-examine supplier invoice claims against digitized weighbridge data</p>
            </div>
          </div>
          ${this.renderBillsTableHTML(pendingInward, false, "godown_action")}
        </div>
      </div>
    `;
  }

  renderGodownQueueView() {
    const bills = this.getFilteredBills(b => b.status === "Submitted" || b.status === "Under Verification");

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Godown Inward Clearance Queue</h2>
            <p class="text-xs text-slate-500">Verify weight slip, moisture, refraction & certify physical stock acceptance</p>
          </div>
        </div>

        ${this.renderFiltersBarHTML()}

        <div class="portal-card overflow-hidden">
          ${this.renderBillsTableHTML(bills, false, "godown_action")}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 3. BRANCH / PRE-AUDIT VIEWS
  // -------------------------------------------------------------
  renderPreAuditDashboardView() {
    const bills = AppState.getBills();
    const pendingAudit = bills.filter(b => b.status === "Pre-Audit");
    const totalAuditValue = pendingAudit.reduce((acc, b) => acc + b.grossAmount, 0);
    const auditedBills = bills.filter(b => b.status === "Approval Pending" || b.status === "Sent to Finance" || b.status === "Payment Processed");

    return `
      <div class="space-y-6">
        <div class="portal-card bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-950 text-white p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-teal-300 text-teal-950 uppercase">Pre-Audit Branch</span>
              <span class="text-xs text-teal-200">Gandhinagar Head Office</span>
            </div>
            <h2 class="text-xl md:text-2xl font-bold">Hasmukhbhai Shah, Senior Pre-Auditor</h2>
            <p class="text-xs text-teal-100 mt-1">3-Way matching verification (PO vs GRN vs Invoice), statutory tax deduction calculations (TDS 194Q & GST-TDS)</p>
          </div>
          <button onclick="AppState.setActiveTab('audit_queue')" 
            class="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center gap-2 self-start md:self-auto">
            <i class="fa-solid fa-clipboard-check"></i> Audit Work Queue (${pendingAudit.length})
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${UI.renderKpiCard("Pre-Audit Pending", `${pendingAudit.length} Bills`, "Inward verified cases", "fa-clock", "bg-teal-100 text-teal-800")}
          ${UI.renderKpiCard("Pending Audit Value", UI.formatINR(totalAuditValue), "Total value undergoing scrutiny", "fa-scale-balanced", "bg-blue-100 text-blue-800")}
          ${UI.renderKpiCard("Audit Cleared This Month", `${auditedBills.length} Bills`, "Passed to GM for sanction", "fa-shield-check", "bg-emerald-100 text-emerald-800")}
          ${UI.renderKpiCard("Statutory Tax Compliance", "100%", "Sec 194Q & GST TDS verified", "fa-percent", "bg-purple-100 text-purple-800")}
        </div>

        <div class="portal-card p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Actionable Pre-Audit Scrutiny Queue</h3>
              <p class="text-xs text-slate-500">Conduct digital 3-way match, review noting sheet & compute statutory deductions</p>
            </div>
          </div>
          ${this.renderBillsTableHTML(pendingAudit, false, "preaudit_action")}
        </div>
      </div>
    `;
  }

  renderPreAuditQueueView() {
    const bills = this.getFilteredBills(b => b.status === "Pre-Audit");

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Pre-Audit Verification Queue</h2>
            <p class="text-xs text-slate-500">Examine invoice accuracy, verify test compliance and forward to General Manager</p>
          </div>
        </div>

        ${this.renderFiltersBarHTML()}

        <div class="portal-card overflow-hidden">
          ${this.renderBillsTableHTML(bills, false, "preaudit_action")}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 4. GENERAL MANAGER VIEWS
  // -------------------------------------------------------------
  renderGMDashboardView() {
    const bills = AppState.getBills();
    const pendingSanction = bills.filter(b => b.status === "Approval Pending");
    const totalSanctionValue = pendingSanction.reduce((acc, b) => acc + b.netPayable, 0);
    const sanctionedTotal = bills.filter(b => b.status === "Sent to Finance" || b.status === "Payment Processed").reduce((acc, b) => acc + b.netPayable, 0);

    return `
      <div class="space-y-6">
        <div class="portal-card bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-slate-950 uppercase">Competent Financial Authority</span>
              <span class="text-xs text-purple-200">Procurement & Financial Sanctions</span>
            </div>
            <h2 class="text-xl md:text-2xl font-bold">Dr. V. M. Jadeja, GAS, General Manager</h2>
            <p class="text-xs text-purple-100 mt-1">Delegation of Financial Powers: Administrative approval and budget sanction of commodity procurement bills</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="appController.approveAllPendingGM()" 
              class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center gap-2">
              <i class="fa-solid fa-stamp"></i> Bulk Sanction (${pendingSanction.length})
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${UI.renderKpiCard("Awaiting GM Sanction", `${pendingSanction.length} Bills`, "Pre-Audit completed", "fa-signature", "bg-purple-100 text-purple-800")}
          ${UI.renderKpiCard("Sanction Value In Queue", UI.formatINR(totalSanctionValue), "Sanction under Budget 2408", "fa-coins", "bg-amber-100 text-amber-800")}
          ${UI.renderKpiCard("Sanctioned This Month", UI.formatINR(sanctionedTotal), "Approved & transmitted to Finance", "fa-circle-check", "bg-emerald-100 text-emerald-800")}
          ${UI.renderKpiCard("Avg Sanction Turnaround", "1.4 Days", "Faster than state 3-day target", "fa-gauge-high", "bg-blue-100 text-blue-800")}
        </div>

        <div class="portal-card p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Procurement Bills Awaiting Financial Sanction</h3>
              <p class="text-xs text-slate-500">Sign digital sanction orders and release approved funds to Finance Branch</p>
            </div>
          </div>
          ${this.renderBillsTableHTML(pendingSanction, false, "gm_action")}
        </div>
      </div>
    `;
  }

  renderGMQueueView() {
    const bills = this.getFilteredBills(b => b.status === "Approval Pending");

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">General Manager Sanction Queue</h2>
            <p class="text-xs text-slate-500">Accord financial approval for pre-audited commodity claims</p>
          </div>
          ${bills.length > 0 ? `
            <button onclick="appController.approveAllPendingGM()" class="px-3.5 py-2 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow flex items-center gap-2">
              <i class="fa-solid fa-stamp"></i> Bulk Approve All
            </button>
          ` : ''}
        </div>

        ${this.renderFiltersBarHTML()}

        <div class="portal-card overflow-hidden">
          ${this.renderBillsTableHTML(bills, false, "gm_action")}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 5. FINANCE BRANCH VIEWS
  // -------------------------------------------------------------
  renderFinanceDashboardView() {
    const bills = AppState.getBills();
    const readyForPayment = bills.filter(b => b.status === "Sent to Finance");
    const totalReadyPay = readyForPayment.reduce((acc, b) => acc + b.netPayable, 0);
    const paidBills = bills.filter(b => b.status === "Payment Processed");
    const totalPaid = paidBills.reduce((acc, b) => acc + b.netPayable, 0);

    return `
      <div class="space-y-6">
        <div class="portal-card bg-gradient-to-r from-indigo-950 via-indigo-900 to-blue-950 text-white p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-300 text-indigo-950 uppercase">Treasury & IFMS Cell</span>
              <span class="text-xs text-indigo-200">Disbursement Wing</span>
            </div>
            <h2 class="text-xl md:text-2xl font-bold">Nilesh M. Trivedi, Chief Accounts Officer</h2>
            <p class="text-xs text-indigo-100 mt-1">Integrated Financial Management System (IFMS) & PFMS electronic disbursement and RTGS payment advice</p>
          </div>
          <button onclick="AppState.setActiveTab('finance_queue')" 
            class="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center gap-2 self-start md:self-auto">
            <i class="fa-solid fa-vault"></i> Release Payments (${readyForPayment.length})
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${UI.renderKpiCard("Bills Awaiting Payment", `${readyForPayment.length} Bills`, "Sanctioned by GM", "fa-clock", "bg-indigo-100 text-indigo-800")}
          ${UI.renderKpiCard("Funds to Disburse", UI.formatINR(totalReadyPay), "Ready for electronic transfer", "fa-hand-holding-dollar", "bg-amber-100 text-amber-800")}
          ${UI.renderKpiCard("Disbursed Via IFMS", UI.formatINR(totalPaid), `${paidBills.length} vouchers executed`, "fa-check-double", "bg-emerald-100 text-emerald-800")}
          ${UI.renderKpiCard("Direct Bank Transfer Rate", "100%", "Zero cheque reliance (DBT)", "fa-building-columns", "bg-teal-100 text-teal-800")}
        </div>

        <div class="portal-card p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Approved Bills Ready for Electronic Treasury Clearance</h3>
              <p class="text-xs text-slate-500">Verify vendor bank credentials (IFSC/Account) and generate RTGS payment vouchers</p>
            </div>
          </div>
          ${this.renderBillsTableHTML(readyForPayment, false, "finance_action")}
        </div>
      </div>
    `;
  }

  renderFinanceQueueView() {
    const bills = this.getFilteredBills(b => b.status === "Sent to Finance");

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Finance Release Queue</h2>
            <p class="text-xs text-slate-500">Execute electronic transfers via IFMS-Gujarat RTGS Gateway</p>
          </div>
        </div>

        ${this.renderFiltersBarHTML()}

        <div class="portal-card overflow-hidden">
          ${this.renderBillsTableHTML(bills, false, "finance_action")}
        </div>
      </div>
    `;
  }

  renderFinanceDisbursedView() {
    const bills = this.getFilteredBills(b => b.status === "Payment Processed");

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Disbursed Vouchers & UTR Registry</h2>
            <p class="text-xs text-slate-500">Official archive of completed treasury payments with bank acknowledgment numbers</p>
          </div>
        </div>

        ${this.renderFiltersBarHTML()}

        <div class="portal-card overflow-hidden">
          ${this.renderBillsTableHTML(bills, false, "disbursed_action")}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 6. MANAGEMENT & ADMIN MONITOR VIEWS
  // -------------------------------------------------------------
  renderAdminDashboardView() {
    const bills = AppState.getBills();
    const totalBills = bills.length;
    const totalValue = bills.reduce((acc, b) => acc + b.grossAmount, 0);
    const totalPaid = bills.filter(b => b.status === "Payment Processed").reduce((acc, b) => acc + b.netPayable, 0);
    const exceptions = bills.filter(b => b.status === "Exception Raised");
    const delayedBills = bills.filter(b => b.isDelayed || b.daysInStage >= 5);

    return `
      <div class="space-y-6">
        <div class="portal-card bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-slate-950 uppercase">MD & Secretariat Oversight</span>
              <span class="text-xs text-slate-300">Food, Civil Supplies & Consumer Affairs Dept.</span>
            </div>
            <h2 class="text-xl md:text-2xl font-bold">Executive Monitoring & Analytics Console</h2>
            <p class="text-xs text-slate-300 mt-1">Holistic state-wide commodity procurement billing tracking, district clearance SLAs & financial allocations</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="appController.resetToInitialDemoData()" 
              class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-arrow-rotate-left"></i> Reset Demo Data
            </button>
            <button onclick="appController.exportBillsToCSV()" 
              class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-file-excel"></i> Export Ledger
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          ${UI.renderKpiCard("Total Procurement Billed", UI.formatINR(totalValue), `${totalBills} total bills logged`, "fa-coins", "bg-blue-100 text-blue-800")}
          ${UI.renderKpiCard("Disbursed to Vendors", UI.formatINR(totalPaid), "Real-time bank transfers", "fa-check-double", "bg-emerald-100 text-emerald-800")}
          ${UI.renderKpiCard("In-Pipeline Scrutiny", UI.formatINR(totalValue - totalPaid), "Under active verification", "fa-hourglass-half", "bg-amber-100 text-amber-800")}
          ${UI.renderKpiCard("SLA Breaches (>5 Days)", `${delayedBills.length} Cases`, "Requires immediate attention", "fa-bell", delayedBills.length > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700")}
          ${UI.renderKpiCard("Exception Rate", `${((exceptions.length / totalBills) * 100).toFixed(1)}%`, `${exceptions.length} flagged cases`, "fa-triangle-exclamation", "bg-purple-100 text-purple-800")}
        </div>

        <div class="portal-card p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Stage-Wise Processing Pipeline Distribution</h3>
              <p class="text-xs text-slate-500">Live inventory of bills across administrative checkpoints</p>
            </div>
            <button onclick="AppState.setActiveTab('pipeline')" class="text-xs text-blue-700 hover:text-blue-900 font-semibold">
              Detailed Breakdown <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
          ${this.renderPipelineSummaryBar(bills)}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="portal-card p-5">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-bold text-slate-800 uppercase">District-Wise Procurement Expenditure (₹ Lakhs)</h4>
              <span class="text-[11px] text-slate-400">GSCSCL Operational Base</span>
            </div>
            <div class="h-64 relative">
              <canvas id="districtProcurementChart"></canvas>
            </div>
          </div>

          <div class="portal-card p-5">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-bold text-slate-800 uppercase">Commodity Category Allocation (CGP vs TOC)</h4>
              <span class="text-[11px] text-slate-400">Total Billed Share</span>
            </div>
            <div class="h-64 relative flex items-center justify-center">
              <canvas id="commodityCategoryChart"></canvas>
            </div>
          </div>
        </div>

        ${delayedBills.length > 0 ? `
          <div class="portal-card p-5 border-l-4 border-l-rose-500">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-rose-600 pulse-indicator"></span>
                <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Critical SLA Delayed Cases Alert (>5 Days Pending)</h3>
              </div>
              <span class="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                ${delayedBills.length} Delayed Cases
              </span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="p-3">Bill ID</th>
                    <th class="p-3">Supplier Name</th>
                    <th class="p-3">District</th>
                    <th class="p-3">Current Stage</th>
                    <th class="p-3 text-center">Days Pending</th>
                    <th class="p-3 text-right">Net Value</th>
                    <th class="p-3 text-right">Intervention</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${delayedBills.map(b => `
                    <tr class="hover:bg-rose-50/40">
                      <td class="p-3 font-mono font-bold text-blue-900">${b.id}</td>
                      <td class="p-3 font-medium text-slate-800">${b.supplierName}</td>
                      <td class="p-3 text-slate-600">${b.district}</td>
                      <td class="p-3 font-semibold text-rose-700">${b.currentStage}</td>
                      <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          ${b.daysInStage} Days
                        </span>
                      </td>
                      <td class="p-3 text-right font-mono font-bold text-slate-900">₹${b.netPayable.toLocaleString('en-IN')}</td>
                      <td class="p-3 text-right">
                        <button onclick="appController.openBillDetailsModal('${b.id}')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold">
                          Inspect & Expedite
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderPipelineSummaryBar(bills) {
    const stages = [
      { id: "Submitted", label: "1. Submitted", color: "bg-blue-600" },
      { id: "Under Verification", label: "2. Godown", color: "bg-amber-500" },
      { id: "Pre-Audit", label: "3. Pre-Audit", color: "bg-teal-600" },
      { id: "Approval Pending", label: "4. GM Sanction", color: "bg-purple-600" },
      { id: "Sent to Finance", label: "5. Finance", color: "bg-indigo-600" },
      { id: "Payment Processed", label: "6. Paid", color: "bg-emerald-600" },
      { id: "Exception Raised", label: "Flagged", color: "bg-rose-600" }
    ];

    const counts = {};
    stages.forEach(s => {
      counts[s.id] = bills.filter(b => b.status === s.id).length;
    });

    return `
      <div class="space-y-3">
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          ${stages.map(s => {
            const count = counts[s.id] || 0;
            const subtotal = bills.filter(b => b.status === s.id).reduce((acc, b) => acc + b.netPayable, 0);
            return `
              <div class="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition-colors">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="w-2.5 h-2.5 rounded-full ${s.color}"></span>
                  <span class="text-[11px] font-bold text-slate-700 truncate">${s.label}</span>
                </div>
                <div class="text-xl font-bold text-slate-900">${count}</div>
                <div class="text-[10px] text-slate-500 font-mono truncate">${UI.formatINR(subtotal)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderPipelineTrackerView() {
    const bills = AppState.getBills();

    return `
      <div class="space-y-6">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Stage-Wise Pipeline & SLA Monitoring</h2>
          <p class="text-xs text-slate-500">End-to-end audit lifecycle oversight across Gujarat State Civil Supplies offices</p>
        </div>

        ${this.renderPipelineSummaryBar(bills)}

        <div class="portal-card p-5">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">All Active Processing Cases</h3>
          ${this.renderBillsTableHTML(bills)}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 7. EXCEPTION MANAGEMENT & ALERTS PANEL
  // -------------------------------------------------------------
  renderExceptionsHubView() {
    const exceptions = AppState.getBills().filter(b => b.status === "Exception Raised");

    return `
      <div class="space-y-6">
        <div class="portal-card bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 text-white p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-white text-rose-900 uppercase">Alerts & Compliance Hub</span>
              <span class="text-xs text-rose-200">Quality, Weight & Document Mismatches</span>
            </div>
            <h2 class="text-xl md:text-2xl font-bold">Exception Management & Dispute Resolution Panel</h2>
            <p class="text-xs text-rose-100 mt-1">Dedicated clearing center for flagged bills, moisture discrepancies, weighbridge variances & laboratory report exceptions</p>
          </div>
          <div class="px-4 py-2 bg-rose-950/60 border border-rose-300/30 rounded-lg text-center">
            <span class="text-2xl font-bold text-white">${exceptions.length}</span>
            <p class="text-[11px] text-rose-200 uppercase font-bold">Active Exceptions</p>
          </div>
        </div>

        <div class="portal-card p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Flagged Cases Requiring Administrative Action</h3>
              <p class="text-xs text-slate-500">Apply statutory penalty deductions, request supplier clarification or grant authorized waivers</p>
            </div>
          </div>

          ${exceptions.length === 0 ? `
            <div class="p-12 text-center text-slate-400">
              <i class="fa-solid fa-circle-check text-4xl text-emerald-500 mb-3"></i>
              <h4 class="text-base font-bold text-slate-700">No Active Exceptions Flagged</h4>
              <p class="text-xs text-slate-500 mt-1">All commodity supplier bills are proceeding smoothly through standard verification channels.</p>
            </div>
          ` : `
            <div class="space-y-4">
              ${exceptions.map(b => `
                <div class="border border-rose-200 rounded-xl p-5 bg-rose-50/40 hover:bg-rose-50/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div class="space-y-2 flex-1">
                    <div class="flex items-center gap-2.5 flex-wrap">
                      <span class="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-xs">
                        ${b.id}
                      </span>
                      <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white uppercase">
                        ${b.exception.code || 'EXC-FLAGGED'}
                      </span>
                      <span class="text-xs text-slate-500">Severity: <strong class="text-rose-700 font-bold">${b.exception.severity || 'Medium'}</strong></span>
                      <span class="text-xs text-slate-500">Raised On: <strong>${b.exception.raisedOn}</strong> by <strong>${b.exception.raisedBy}</strong></span>
                    </div>

                    <h4 class="text-sm font-bold text-slate-900">
                      ${b.commodity} • <span class="text-slate-600 font-normal">${b.supplierName}</span>
                    </h4>

                    <div class="p-3 bg-white rounded-lg border border-rose-200 text-xs text-rose-900 font-medium leading-relaxed">
                      <i class="fa-solid fa-triangle-exclamation text-rose-600 mr-1.5"></i>
                      ${b.exception.reason}
                    </div>

                    <div class="flex items-center gap-4 text-xs text-slate-600">
                      <span>GRN: <strong class="font-mono text-slate-800">${b.grnNumber}</strong></span>
                      <span>Gross Claim: <strong class="font-mono text-slate-800">₹${b.grossAmount.toLocaleString('en-IN')}</strong></span>
                      <span>Godown: <strong class="text-slate-800">${b.godownName}</strong></span>
                    </div>
                  </div>

                  <div class="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                    <button onclick="appController.openResolveExceptionModal('${b.id}')" 
                      class="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2">
                      <i class="fa-solid fa-wrench"></i> Quick Resolve Action
                    </button>
                    <button onclick="appController.openBillDetailsModal('${b.id}')" 
                      class="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 flex items-center justify-center gap-2">
                      <i class="fa-solid fa-file-lines"></i> View Complete Case
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // MASTER TABLE & FILTERS
  // -------------------------------------------------------------
  renderGenericMasterTableView(title) {
    const bills = this.getFilteredBills();

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">${title}</h2>
            <p class="text-xs text-slate-500">Comprehensive database view with multi-attribute filtering and export tools</p>
          </div>
          <button onclick="appController.exportBillsToCSV()" class="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5">
            <i class="fa-solid fa-file-excel"></i> Export CSV
          </button>
        </div>

        ${this.renderFiltersBarHTML()}

        <div class="portal-card overflow-hidden">
          ${this.renderBillsTableHTML(bills)}
        </div>
      </div>
    `;
  }

  renderFiltersBarHTML() {
    const districts = GSCSCL_DATA.districts;

    return `
      <div class="portal-card p-4 bg-slate-50/80 border-slate-200">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div class="lg:col-span-2 relative">
            <input type="text" id="table-search-input" 
              placeholder="Search by Bill ID, Supplier, Commodity, GRN, District..." 
              value="${this.currentFilter.search}"
              oninput="appController.setSearch(this.value)"
              class="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
          </div>

          <div>
            <select onchange="appController.setStatusFilter(this.value)" 
              class="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
              <option value="All" ${this.currentFilter.status === 'All' ? 'selected' : ''}>Status: All Stages</option>
              <option value="Submitted" ${this.currentFilter.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
              <option value="Under Verification" ${this.currentFilter.status === 'Under Verification' ? 'selected' : ''}>Under Verification</option>
              <option value="Pre-Audit" ${this.currentFilter.status === 'Pre-Audit' ? 'selected' : ''}>Pre-Audit</option>
              <option value="Approval Pending" ${this.currentFilter.status === 'Approval Pending' ? 'selected' : ''}>Approval Pending</option>
              <option value="Sent to Finance" ${this.currentFilter.status === 'Sent to Finance' ? 'selected' : ''}>Sent to Finance</option>
              <option value="Payment Processed" ${this.currentFilter.status === 'Payment Processed' ? 'selected' : ''}>Payment Processed</option>
              <option value="Exception Raised" ${this.currentFilter.status === 'Exception Raised' ? 'selected' : ''}>Exception Raised</option>
            </select>
          </div>

          <div>
            <select onchange="appController.setCategoryFilter(this.value)" 
              class="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
              <option value="All" ${this.currentFilter.category === 'All' ? 'selected' : ''}>Category: All (CGP / TOC)</option>
              <option value="CGP" ${this.currentFilter.category === 'CGP' ? 'selected' : ''}>CGP (Grains & Pulses)</option>
              <option value="TOC" ${this.currentFilter.category === 'TOC' ? 'selected' : ''}>TOC (Salt, Bags, Oil)</option>
            </select>
          </div>

          <div>
            <select onchange="appController.setDistrictFilter(this.value)" 
              class="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
              <option value="All" ${this.currentFilter.district === 'All' ? 'selected' : ''}>District: All Districts</option>
              ${districts.map(d => `
                <option value="${d}" ${this.currentFilter.district === d ? 'selected' : ''}>${d}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
    `;
  }

  renderBillsTableHTML(bills, isCompact = false, actionType = "default") {
    const currentRole = AppState.getCurrentRole() || { id: "guest" };
    if (currentRole.id === "supplier") {
      return this.renderSupplierInvoicesTableHTML(bills, isCompact);
    }

    if (bills.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400">
          <i class="fa-solid fa-folder-open text-4xl mb-3"></i>
          <h4 class="text-sm font-bold text-slate-700">No Matching Bills Found</h4>
          <p class="text-xs text-slate-500 mt-1">Try modifying your search query or stage filters.</p>
          <button onclick="appController.resetFilters()" class="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded">
            Reset Filters
          </button>
        </div>
      `;
    }

    return `
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th class="p-3">Bill ID & Ref</th>
              <th class="p-3">Supplier & District</th>
              <th class="p-3">Commodity & GRN</th>
              <th class="p-3 text-right">Quantity</th>
              <th class="p-3 text-right">Net Amount</th>
              <th class="p-3 text-center">Lifecycle Status</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            ${bills.map(b => `
              <tr class="hover:bg-slate-50 transition-colors group">
                <td class="p-3">
                  <div class="font-mono font-bold text-blue-900 flex items-center gap-1.5">
                    ${b.id}
                    ${b.isDelayed ? '<span class="w-2 h-2 rounded-full bg-rose-500 pulse-indicator" title="SLA Delayed"></span>' : ''}
                  </div>
                  <div class="text-[11px] text-slate-500 font-mono">Inv: ${b.invoiceNumber}</div>
                  <div class="text-[10px] text-slate-400">${b.submissionDate}</div>
                </td>

                <td class="p-3">
                  <div class="font-semibold text-slate-900 truncate max-w-[200px]" title="${b.supplierName}">
                    ${b.supplierName}
                  </div>
                  <div class="text-[11px] text-slate-500 flex items-center gap-1">
                    <i class="fa-solid fa-location-dot text-slate-400"></i> ${b.district}
                  </div>
                </td>

                <td class="p-3">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    ${UI.renderCategoryBadge(b.category)}
                    <span class="font-medium text-slate-800 truncate max-w-[180px]" title="${b.commodity}">${b.commodity}</span>
                  </div>
                  <div class="text-[11px] font-mono text-emerald-700">${b.grnNumber}</div>
                </td>

                <td class="p-3 text-right">
                  <div class="font-mono font-bold text-slate-900">${b.billedQty.toLocaleString('en-IN')} ${b.unit}</div>
                  <div class="text-[11px] text-slate-500 font-mono">@ ₹${b.ratePerUnit.toFixed(0)}</div>
                </td>

                <td class="p-3 text-right">
                  <div class="font-mono font-bold text-slate-900 text-[13px]">₹${b.netPayable.toLocaleString('en-IN')}</div>
                  <div class="text-[10px] text-slate-400 line-through">Gross: ₹${b.grossAmount.toLocaleString('en-IN')}</div>
                </td>

                <td class="p-3 text-center">
                  ${UI.renderStatusBadge(b.status)}
                  <div class="text-[10px] text-slate-400 mt-1">${b.currentStage}</div>
                </td>

                <td class="p-3 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    ${this.renderRowActionButton(b, actionType, currentRole)}
                    <button onclick="appController.openLifecycleModal('${b.id}')" 
                      class="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded" 
                      title="View Lifecycle Timeline">
                      <i class="fa-solid fa-timeline"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderRowActionButton(bill, actionType, currentRole) {
    if (currentRole && currentRole.id === "supplier") {
      return this.renderSupplierRowActions(bill);
    }

    if (bill.status === "Exception Raised") {
      return `
        <button onclick="appController.openResolveExceptionModal('${bill.id}')" 
          class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-wrench"></i> Resolve
        </button>
      `;
    }

    if (currentRole.id === "godown_manager" && (bill.status === "Submitted" || bill.status === "Under Verification")) {
      return `
        <button onclick="appController.openBillDetailsModal('${bill.id}')" 
          class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-magnifying-glass-check"></i> Verify Inward
        </button>
      `;
    }

    if (currentRole.id === "pre_audit" && bill.status === "Pre-Audit") {
      return `
        <button onclick="appController.openBillDetailsModal('${bill.id}')" 
          class="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-clipboard-check"></i> Pre-Audit Scrutiny
        </button>
      `;
    }

    if (currentRole.id === "general_manager" && bill.status === "Approval Pending") {
      return `
        <button onclick="appController.openBillDetailsModal('${bill.id}')" 
          class="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-stamp"></i> Sanction Bill
        </button>
      `;
    }

    if (currentRole.id === "finance" && bill.status === "Sent to Finance") {
      return `
        <button onclick="appController.openBillDetailsModal('${bill.id}')" 
          class="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-money-bill-transfer"></i> Disburse RTGS
        </button>
      `;
    }

    if (bill.status === "Payment Processed") {
      return `
        <button onclick="appController.openVoucherModal('${bill.id}')" 
          class="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-receipt"></i> Voucher
        </button>
      `;
    }

    return `
      <button onclick="appController.openBillDetailsModal('${bill.id}')" 
        class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1">
        <i class="fa-solid fa-eye"></i> Details
      </button>
    `;
  }

  // -------------------------------------------------------------
  // MODALS ORCHESTRATION
  // -------------------------------------------------------------
  closeModal() {
    const modalContainer = document.getElementById('app-modal-container');
    if (modalContainer) {
      modalContainer.classList.add('hidden');
      modalContainer.innerHTML = "";
    }
  }

  openModalHTML(htmlContent) {
    const modalContainer = document.getElementById('app-modal-container');
    if (modalContainer) {
      modalContainer.innerHTML = htmlContent;
      modalContainer.classList.remove('hidden');
    }
  }

  openSubmitBillModal(preselectedGrnNumber = null) {
    const availableGRNs = AppState.getAvailableGRNs();
    const defaultGRN = preselectedGrnNumber 
      ? availableGRNs.find(g => g.grnNumber === preselectedGrnNumber) || availableGRNs[0]
      : availableGRNs[0];

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
          <div class="bg-blue-900 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-lg">
                <i class="fa-solid fa-file-invoice"></i>
              </div>
              <div>
                <h3 class="text-base font-bold">Submit Bill</h3>
                <p class="text-xs text-blue-200">Submit a new bill or save as draft against verified godown receipt (GRN)</p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-blue-200 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form id="submit-bill-form" onsubmit="appController.handleBillFormSubmit(event)" class="p-6 space-y-5">
            ${availableGRNs.length === 0 ? `
              <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                <strong>Notice:</strong> No unbilled GRNs available in the mock pool. You can enter an ad-hoc GRN number below for testing.
              </div>
            ` : ''}

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Select Digital Godown Receipt (GRN) <span class="text-rose-500">*</span>
              </label>
              <select id="bill-grn-select" onchange="appController.handleGRNSelectionChange(this.value)" 
                class="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:bg-white">
                ${availableGRNs.map(g => `
                  <option value="${g.grnNumber}" ${defaultGRN && defaultGRN.grnNumber === g.grnNumber ? 'selected' : ''}>
                    ${g.grnNumber} — ${g.commodity} (${g.quantityQuintals} Qtl) @ ${g.godownName}
                  </option>
                `).join('')}
                <option value="CUSTOM">-- Enter Ad-Hoc / Other GRN Number --</option>
              </select>
            </div>

            <div id="grn-auto-preview" class="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-1.5 text-slate-700">
              <div class="flex justify-between">
                <span>Commodity:</span>
                <strong id="preview-commodity" class="text-blue-950">${defaultGRN ? defaultGRN.commodity : 'Wheat (FAQ Grade)'}</strong>
              </div>
              <div class="flex justify-between">
                <span>Category:</span>
                <strong id="preview-category" class="text-blue-950">${defaultGRN ? defaultGRN.category : 'CGP'}</strong>
              </div>
              <div class="flex justify-between">
                <span>Godown Destination:</span>
                <strong id="preview-godown" class="text-blue-950">${defaultGRN ? defaultGRN.godownName : 'State Base Godown, Sector-28'}</strong>
              </div>
              <div class="flex justify-between">
                <span>Sanction PO Ref:</span>
                <strong id="preview-po" class="font-mono text-blue-950">${defaultGRN ? defaultGRN.poNumber : 'PO/GSCSCL/2026/MSP-841'}</strong>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Tax Invoice Number <span class="text-rose-500">*</span>
                </label>
                <input type="text" id="bill-invoice-no" required placeholder="e.g. SGAC/26/0499" 
                  value="SGAC/26/${Math.floor(1000 + Math.random() * 9000)}"
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Date <span class="text-rose-500">*</span>
                </label>
                <input type="date" id="bill-invoice-date" required 
                  value="${new Date().toISOString().split('T')[0]}"
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Billed Quantity</label>
                <input type="number" id="bill-qty" step="0.01" required 
                  value="${defaultGRN ? defaultGRN.quantityQuintals : 300}"
                  oninput="appController.recalculateFormTotals()"
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                <input type="text" id="bill-unit" readonly value="Quintal" 
                  class="w-full text-xs p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Rate (₹ / Unit)</label>
                <input type="number" id="bill-rate" step="0.01" required 
                  value="2275"
                  oninput="appController.recalculateFormTotals()"
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
              </div>
            </div>

            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div class="flex justify-between font-bold text-slate-800">
                <span>Gross Claim Amount:</span>
                <span id="calc-gross" class="font-mono text-sm text-blue-950">₹6,82,500</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Less: TDS IT Act Sec 194Q (0.1%):</span>
                <span id="calc-tds" class="font-mono text-rose-700">- ₹683</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Less: GST TDS (2.0% - 1% CGST + 1% SGST):</span>
                <span id="calc-gst" class="font-mono text-rose-700">- ₹13,650</span>
              </div>
              <div class="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-900 text-sm">
                <span>Estimated Net Payable to Bank:</span>
                <span id="calc-net" class="font-mono text-base text-emerald-700">₹6,68,167</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Upload Signed Tax Invoice & Weighbridge Certificate (PDF / Scanned Copy)
              </label>
              <div class="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors">
                <i class="fa-solid fa-cloud-arrow-up text-2xl text-slate-400 mb-1"></i>
                <p class="text-xs text-slate-600 font-medium">Click to select file or drag and drop</p>
                <p class="text-[10px] text-slate-400">PDF, JPG, PNG up to 15MB (Digitally certified)</p>
                <span class="inline-block mt-2 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                  <i class="fa-solid fa-file-pdf text-red-500 mr-1"></i> Invoice_eWay_Signed.pdf (Attached)
                </span>
              </div>
            </div>

            <div class="flex items-start gap-2 pt-2">
              <input type="checkbox" id="vendor-declaration" required checked 
                class="mt-0.5 text-blue-600 rounded focus:ring-blue-500">
              <label for="vendor-declaration" class="text-[11px] text-slate-600 leading-snug">
                I hereby certify that the commodities claimed above conform strictly to Agmark specifications and no dual billing has been claimed for this GRN.
              </label>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <button type="button" onclick="appController.closeModal()" 
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
                Cancel
              </button>
              <div class="flex items-center gap-2">
                <button type="button" onclick="appController.handleSaveDraftSubmit(event)" 
                  class="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                  <i class="fa-solid fa-floppy-disk"></i> Save as Draft
                </button>
                <button type="submit" 
                  class="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2">
                  <i class="fa-solid fa-paper-plane"></i> Submit Bill
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    this.openModalHTML(html);
    this.recalculateFormTotals();
  }

  handleSaveDraftSubmit(e) {
    if (e) e.preventDefault();
    const grnSelect = document.getElementById('bill-grn-select');
    let grnNumber = grnSelect ? grnSelect.value : "GRN-GJ-2026-9088";
    if (grnNumber === "CUSTOM") {
      grnNumber = `GRN-GJ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const grn = AppState.state.availableGRNs.find(g => g.grnNumber === grnNumber);
    const commodity = grn ? grn.commodity : (document.getElementById('preview-commodity')?.innerText || "Wheat (FAQ Grade) / ઘઉં");
    const category = grn ? grn.category : (document.getElementById('preview-category')?.innerText || "CGP");
    const district = grn ? grn.district : "Gandhinagar";
    const godownName = grn ? grn.godownName : "State Base Godown, Sector-28";
    const poNumber = grn ? grn.poNumber : "PO/GSCSCL/2026/MSP-841";

    const invoiceNo = document.getElementById('bill-invoice-no')?.value || `DRAFT-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceDate = document.getElementById('bill-invoice-date')?.value || new Date().toISOString().split('T')[0];
    const qty = parseFloat(document.getElementById('bill-qty')?.value || 0);
    const rate = parseFloat(document.getElementById('bill-rate')?.value || 0);

    const draft = AppState.saveDraftBill({
      grnNumber,
      poNumber,
      invoiceNumber: invoiceNo,
      invoiceDate: invoiceDate,
      category,
      commodity,
      district,
      godownName,
      receivedQty: qty,
      billedQty: qty,
      ratePerUnit: rate
    });

    this.closeModal();
    this.showToast(`Draft bill ${draft.id} saved successfully. You can edit and submit it anytime from My Invoices.`, "success");
  }

  handleGRNSelectionChange(selectedGrnNo) {
    const grn = AppState.state.availableGRNs.find(g => g.grnNumber === selectedGrnNo);
    if (grn) {
      document.getElementById('preview-commodity').innerText = grn.commodity;
      document.getElementById('preview-category').innerText = grn.category;
      document.getElementById('preview-godown').innerText = grn.godownName;
      document.getElementById('preview-po').innerText = grn.poNumber;
      document.getElementById('bill-qty').value = grn.quantityQuintals;

      let rate = 2275;
      const list = GSCSCL_DATA.commodities[grn.category] || [];
      const match = list.find(c => c.name === grn.commodity);
      if (match) rate = match.defaultRate;
      document.getElementById('bill-rate').value = rate;
      this.recalculateFormTotals();
    }
  }

  recalculateFormTotals() {
    const qty = parseFloat(document.getElementById('bill-qty')?.value || 0);
    const rate = parseFloat(document.getElementById('bill-rate')?.value || 0);
    const gross = qty * rate;
    const tds = Math.round(gross * 0.001);
    const gst = Math.round(gross * 0.02);
    const net = gross - (tds + gst);

    const grossEl = document.getElementById('calc-gross');
    const tdsEl = document.getElementById('calc-tds');
    const gstEl = document.getElementById('calc-gst');
    const netEl = document.getElementById('calc-net');

    if (grossEl) grossEl.innerText = `₹${gross.toLocaleString('en-IN')}`;
    if (tdsEl) tdsEl.innerText = `- ₹${tds.toLocaleString('en-IN')}`;
    if (gstEl) gstEl.innerText = `- ₹${gst.toLocaleString('en-IN')}`;
    if (netEl) netEl.innerText = `₹${net.toLocaleString('en-IN')}`;
  }

  handleBillFormSubmit(e) {
    e.preventDefault();
    const grnSelect = document.getElementById('bill-grn-select');
    let grnNumber = grnSelect ? grnSelect.value : "GRN-GJ-2026-9088";
    if (grnNumber === "CUSTOM") {
      grnNumber = `GRN-GJ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const grn = AppState.state.availableGRNs.find(g => g.grnNumber === grnNumber);
    const commodity = grn ? grn.commodity : document.getElementById('preview-commodity')?.innerText || "Wheat (FAQ Grade) / ઘઉં";
    const category = grn ? grn.category : (document.getElementById('preview-category')?.innerText || "CGP");
    const district = grn ? grn.district : "Gandhinagar";
    const godownName = grn ? grn.godownName : "State Base Godown, Sector-28";
    const poNumber = grn ? grn.poNumber : "PO/GSCSCL/2026/MSP-841";

    const invoiceNo = document.getElementById('bill-invoice-no').value;
    const invoiceDate = document.getElementById('bill-invoice-date').value;
    const qty = parseFloat(document.getElementById('bill-qty').value);
    const rate = parseFloat(document.getElementById('bill-rate').value);

    const newBill = AppState.submitNewBill({
      grnNumber,
      poNumber,
      invoiceNumber: invoiceNo,
      invoiceDate: invoiceDate,
      category,
      commodity,
      district,
      godownName,
      receivedQty: qty,
      billedQty: qty,
      ratePerUnit: rate
    });

    this.closeModal();
    this.showToast(`Bill ${newBill.id} submitted successfully! Your bill is now waiting for verification.`, "success");
  }

  openBillDetailsModal(billId) {
    const bill = AppState.getBillById(billId);
    if (!bill) return;

    const currentRole = AppState.getCurrentRole() || { id: "guest", name: "Officer" };
    if (currentRole.id === "supplier") {
      return this.openSupplierBillDetailsModal(billId);
    }

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          
          <div class="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                <i class="fa-solid fa-file-shield"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-bold font-mono">${bill.id}</h3>
                  ${UI.renderStatusBadge(bill.status)}
                </div>
                <p class="text-xs text-slate-300">${bill.supplierName} • GSTIN: ${bill.supplierGstin}</p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-slate-400 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            ${UI.renderLifecycleSteps(bill.status)}
            ${UI.renderThreeWayMatch(bill)}

            <div class="portal-card p-4 bg-slate-50 border-slate-200">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                <i class="fa-solid fa-vial text-emerald-600"></i>
                Godown Digital Receipt & Lab Parameter Verification
              </h4>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="bg-white p-2.5 rounded border border-slate-200">
                  <span class="text-slate-400 text-[11px] block">GRN Reference:</span>
                  <span class="font-mono font-bold text-slate-900">${bill.grnNumber}</span>
                </div>
                <div class="bg-white p-2.5 rounded border border-slate-200">
                  <span class="text-slate-400 text-[11px] block">Physically Received:</span>
                  <span class="font-mono font-bold text-slate-900">${bill.receivedQty} ${bill.unit}</span>
                </div>
                <div class="bg-white p-2.5 rounded border border-slate-200">
                  <span class="text-slate-400 text-[11px] block">Moisture Test:</span>
                  <span class="font-bold text-emerald-700">11.4% (Standard Passed)</span>
                </div>
                <div class="bg-white p-2.5 rounded border border-slate-200">
                  <span class="text-slate-400 text-[11px] block">Bank Payee:</span>
                  <span class="font-bold text-slate-800">${bill.supplierBank.bankName}</span>
                </div>
              </div>
            </div>

            <div class="portal-card p-4">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                <i class="fa-solid fa-list-check text-blue-700"></i>
                Mandatory GSCSCL Audit Verification Checklist
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label class="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input type="checkbox" id="chk-weighment" ${bill.auditChecklist.weighmentSlipVerified ? 'checked' : ''} 
                    class="text-blue-600 rounded focus:ring-blue-500">
                  <span>1. Weighbridge Gross & Tare Receipts Reconciled</span>
                </label>
                <label class="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input type="checkbox" id="chk-quality" ${bill.auditChecklist.qualityReportCompliant ? 'checked' : ''} 
                    class="text-blue-600 rounded focus:ring-blue-500">
                  <span>2. Agmark / FSSAI Lab Quality Report Compliant</span>
                </label>
                <label class="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input type="checkbox" id="chk-gst" ${bill.auditChecklist.gstinActive ? 'checked' : ''} 
                    class="text-blue-600 rounded focus:ring-blue-500">
                  <span>3. Active GSTIN & e-Way Bill Clearance Confirmed</span>
                </label>
                <label class="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input type="checkbox" id="chk-statutory" ${bill.auditChecklist.statutoryDeductionsCorrect ? 'checked' : ''} 
                    class="text-blue-600 rounded focus:ring-blue-500">
                  <span>4. Statutory Deductions (TDS 194Q & GST TDS 2%) Verified</span>
                </label>
                <label class="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input type="checkbox" id="chk-nodual" ${bill.auditChecklist.noDualClaimCertified ? 'checked' : ''} 
                    class="text-blue-600 rounded focus:ring-blue-500">
                  <span>5. No Dual Claim Certificate Endorsed by Godown</span>
                </label>
                <label class="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input type="checkbox" id="chk-sanction" ${bill.auditChecklist.sanctionOrderApproved ? 'checked' : ''} 
                    class="text-blue-600 rounded focus:ring-blue-500">
                  <span>6. Sanction Order & Budget Provision Allocated</span>
                </label>
              </div>
            </div>

            <div class="portal-card p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide">Financial Settlement & Deduction Schedule</h4>
                <span class="text-xs text-slate-500">Gross: <strong class="text-slate-900 font-mono">₹${bill.grossAmount.toLocaleString('en-IN')}</strong></span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span class="text-[11px] text-slate-500 block">IT TDS 194Q (0.1%):</span>
                  <span class="font-mono font-bold text-rose-700">₹${(bill.deductions.tds194Q || 0).toLocaleString('en-IN')}</span>
                </div>
                <div class="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span class="text-[11px] text-slate-500 block">GST TDS (2.0%):</span>
                  <span class="font-mono font-bold text-rose-700">₹${(bill.deductions.gstTds || 0).toLocaleString('en-IN')}</span>
                </div>
                <div class="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span class="text-[11px] text-slate-500 block">Refraction / Cuts:</span>
                  <span class="font-mono font-bold text-rose-700">₹${(bill.deductions.refractionCut || 0).toLocaleString('en-IN')}</span>
                </div>
                <div class="p-2.5 bg-emerald-50 rounded border border-emerald-200">
                  <span class="text-[11px] text-emerald-800 block font-bold">Net Payable:</span>
                  <span class="font-mono font-bold text-emerald-900 text-sm">₹${bill.netPayable.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            ${UI.renderNotingSheet(bill.notingSheet, true, bill.id)}

          </div>

          <div class="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500">Current Role: <strong>${currentRole.name}</strong></span>
            </div>

            <div class="flex items-center gap-2">
              ${bill.status !== 'Payment Processed' && bill.status !== 'Exception Raised' ? `
                <button onclick="appController.openRaiseExceptionModal('${bill.id}')" 
                  class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                  <i class="fa-solid fa-triangle-exclamation"></i> Raise Exception / Query
                </button>
              ` : ''}

              ${(bill.status === 'Submitted' || bill.status === 'Under Verification') ? `
                <button onclick="appController.executePassGodown('${bill.id}')" 
                  class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                  <i class="fa-solid fa-check"></i> Certify Stock & Forward to Pre-Audit
                </button>
              ` : ''}

              ${bill.status === 'Pre-Audit' ? `
                <button onclick="appController.executePassPreAudit('${bill.id}')" 
                  class="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                  <i class="fa-solid fa-clipboard-check"></i> Pass Pre-Audit & Forward to GM
                </button>
              ` : ''}

              ${bill.status === 'Approval Pending' ? `
                <button onclick="appController.executeApproveGM('${bill.id}')" 
                  class="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                  <i class="fa-solid fa-stamp"></i> Sanction & Send to Finance
                </button>
              ` : ''}

              ${bill.status === 'Sent to Finance' ? `
                <button onclick="appController.executeDisbursePayment('${bill.id}')" 
                  class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                  <i class="fa-solid fa-money-bill-transfer"></i> Disburse Treasury Payment (IFMS)
                </button>
              ` : ''}

              ${bill.status === 'Payment Processed' ? `
                <button onclick="appController.openVoucherModal('${bill.id}')" 
                  class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                  <i class="fa-solid fa-print"></i> View Payment Voucher
                </button>
              ` : ''}

              <button onclick="appController.closeModal()" class="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold">
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    this.openModalHTML(html);
  }

  // -------------------------------------------------------------
  // DEDICATED SUPPLIER VIEWS & ACTIONS (STRICT SUPPLIER PERMISSIONS)
  // -------------------------------------------------------------
  openSupplierBillDetailsModal(billId) {
    const bill = AppState.getBillById(billId);
    if (!bill) return;

    const isReturned = bill.status === "Exception Raised" || bill.status === "Returned for Correction";
    const isPaid = bill.status === "Payment Processed";
    const isProcessing = bill.status === "Sent to Finance";

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Supplier Modal Header -->
          <div class="bg-blue-950 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center text-lg font-bold">
                <i class="fa-solid fa-file-invoice"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-base font-bold font-mono">${bill.id}</h3>
                  ${UI.renderSupplierStatusBadge(bill.status)}
                </div>
                <p class="text-xs text-blue-200">
                  Tax Invoice: <span class="font-mono text-white">${bill.invoiceNumber || '—'}</span> • Submitted on: ${bill.submissionDate}
                </p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-blue-200 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <!-- Simple English Progress Stepper -->
            ${UI.renderSupplierProgressSteps(bill.status)}

            <!-- Return Reason Banner (If returned for correction) -->
            ${isReturned ? `
              <div class="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2.5">
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2 text-amber-950 font-bold text-sm">
                    <i class="fa-solid fa-triangle-exclamation text-amber-600 text-base"></i>
                    This bill has been returned for correction
                  </div>
                  <button onclick="appController.openResubmitBillModal('${bill.id}')" 
                    class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5">
                    <i class="fa-solid fa-rotate-right"></i> Correct & Resubmit Bill
                  </button>
                </div>
                <div class="bg-white p-3 rounded-lg border border-amber-200 text-xs text-amber-950">
                  <strong class="text-amber-900 block mb-1">Reason from GSCSCL official:</strong>
                  <p class="leading-relaxed">${bill.exception?.reason || bill.publicRemark || 'Document or quantity correction required.'}</p>
                </div>
                <p class="text-[11px] text-amber-800">
                  <strong>What you need to do:</strong> Click "Correct & Resubmit Bill" to update the invoice details or upload corrected documents, then resubmit your bill for verification.
                </p>
              </div>
            ` : ''}

            <!-- Bill & Receipt Details Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <!-- Card 1: Bill & Godown Information -->
              <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <i class="fa-solid fa-circle-info text-blue-700"></i>
                  Bill Information
                </h4>
                <div class="flex justify-between py-1 border-b border-slate-200/60">
                  <span class="text-slate-500">Bill Number:</span>
                  <span class="font-mono font-bold text-slate-900">${bill.id}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-200/60">
                  <span class="text-slate-500">Tax Invoice No:</span>
                  <span class="font-mono font-bold text-slate-900">${bill.invoiceNumber || '—'}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-200/60">
                  <span class="text-slate-500">Digital Receipt (GRN):</span>
                  <span class="font-mono font-bold text-blue-900">${bill.grnNumber}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-200/60">
                  <span class="text-slate-500">Godown / District:</span>
                  <span class="font-semibold text-slate-800">${bill.godownName} (${bill.district})</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-200/60">
                  <span class="text-slate-500">Commodity:</span>
                  <span class="font-semibold text-slate-900">${bill.commodity} [${bill.category}]</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-200/60">
                  <span class="text-slate-500">Billed Quantity:</span>
                  <span class="font-mono font-bold text-slate-900">${bill.billedQty.toLocaleString('en-IN')} ${bill.unit}</span>
                </div>
                <div class="flex justify-between py-1">
                  <span class="text-slate-500">Rate per Unit:</span>
                  <span class="font-mono font-bold text-slate-900">₹${bill.ratePerUnit.toFixed(2)}</span>
                </div>
              </div>

              <!-- Card 2: Financial Calculation -->
              <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <i class="fa-solid fa-calculator text-blue-700"></i>
                  Payment Breakdown
                </h4>
                <div class="flex justify-between py-1 border-b border-slate-200/60">
                  <span class="text-slate-600">Gross Claim Amount:</span>
                  <span class="font-mono font-bold text-slate-900">₹${bill.grossAmount.toLocaleString('en-IN')}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-200/60 text-rose-700">
                  <span>Less: IT TDS Sec 194Q (0.1%):</span>
                  <span class="font-mono font-bold">- ₹${(bill.deductions.tds194Q || 0).toLocaleString('en-IN')}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-200/60 text-rose-700">
                  <span>Less: GST TDS 2% (1% CGST + 1% SGST):</span>
                  <span class="font-mono font-bold">- ₹${(bill.deductions.gstTds || 0).toLocaleString('en-IN')}</span>
                </div>
                ${bill.deductions && bill.deductions.refractionCut > 0 ? `
                  <div class="flex justify-between py-1 border-b border-slate-200/60 text-rose-700">
                    <span>Less: Quality / Moisture Deduction:</span>
                    <span class="font-mono font-bold">- ₹${bill.deductions.refractionCut.toLocaleString('en-IN')}</span>
                  </div>
                ` : ''}
                <div class="flex justify-between pt-2 border-t-2 border-slate-300 font-bold text-emerald-900 text-sm">
                  <span>Net Payable Amount:</span>
                  <span class="font-mono text-emerald-800 text-base">₹${bill.netPayable.toLocaleString('en-IN')}</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-1">
                  * Deductions are calculated automatically according to statutory tax guidelines.
                </div>
              </div>
            </div>

            <!-- Card 3: Bank & Payment Status (Read-Only for Suppliers) -->
            <div class="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <i class="fa-solid fa-building-columns text-emerald-700"></i>
                Bank & Payment Status
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span class="text-slate-400 text-[11px] block">Payee Bank Name:</span>
                  <span class="font-semibold text-slate-900">${bill.supplierBank?.bankName || 'State Bank of India'}</span>
                </div>
                <div>
                  <span class="text-slate-400 text-[11px] block">Account Number:</span>
                  <span class="font-mono font-bold text-slate-900">**** **** 4491</span>
                </div>
                <div>
                  <span class="text-slate-400 text-[11px] block">IFSC Code:</span>
                  <span class="font-mono font-semibold text-slate-800">${bill.supplierBank?.ifsc || 'SBIN0001234'}</span>
                </div>
              </div>

              ${isPaid ? `
                <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1.5">
                  <div class="font-bold text-emerald-900 flex items-center gap-1.5">
                    <i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
                    Payment Completed (Direct Bank Transfer via RTGS)
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700 pt-1 border-t border-emerald-200">
                    <div>
                      <span class="text-slate-500 text-[11px] block">Bank Reference (UTR):</span>
                      <strong class="font-mono text-emerald-950">${bill.utrNumber || 'CMS/SBIN/2026/0491823'}</strong>
                    </div>
                    <div>
                      <span class="text-slate-500 text-[11px] block">Disbursement Date:</span>
                      <strong class="text-slate-900">${bill.timeline.find(t=>t.stage.includes('Payment'))?.timestamp || bill.submissionDate}</strong>
                    </div>
                    <div>
                      <span class="text-slate-500 text-[11px] block">Amount Transferred:</span>
                      <strong class="font-mono text-emerald-900">₹${bill.netPayable.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              ` : isProcessing ? `
                <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                  <div class="font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                    <i class="fa-solid fa-hourglass-half text-indigo-600"></i>
                    Payment in Process
                  </div>
                  <p class="text-indigo-800">
                    Your bill has received executive approval from the General Manager and has been sent to the Finance branch for electronic IFMS disbursement.
                  </p>
                </div>
              ` : `
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div class="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <i class="fa-solid fa-clock text-slate-500"></i>
                    Payment Pending
                  </div>
                  <p class="text-slate-500">
                    Payment will be released directly to your registered bank account after godown, pre-audit, and GM sanction stages are completed.
                  </p>
                </div>
              `}
            </div>

            <!-- Card 4: Documents Attached -->
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <i class="fa-solid fa-paperclip text-slate-600"></i>
                Uploaded Documents
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div class="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                  <div class="flex items-center gap-2 truncate">
                    <i class="fa-solid fa-file-pdf text-rose-500"></i>
                    <span class="truncate font-medium">Tax_Invoice_Signed.pdf</span>
                  </div>
                  <span class="text-[10px] text-blue-700 font-semibold cursor-pointer hover:underline">Download</span>
                </div>
                <div class="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                  <div class="flex items-center gap-2 truncate">
                    <i class="fa-solid fa-file-pdf text-rose-500"></i>
                    <span class="truncate font-medium">Weighbridge_Slip.pdf</span>
                  </div>
                  <span class="text-[10px] text-blue-700 font-semibold cursor-pointer hover:underline">Download</span>
                </div>
                <div class="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                  <div class="flex items-center gap-2 truncate">
                    <i class="fa-solid fa-file-pdf text-rose-500"></i>
                    <span class="truncate font-medium">Lab_Moisture_Report.pdf</span>
                  </div>
                  <span class="text-[10px] text-blue-700 font-semibold cursor-pointer hover:underline">Download</span>
                </div>
              </div>
            </div>

            <!-- Card 5: Official Remarks & Queries -->
            <div class="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <i class="fa-solid fa-comments text-blue-700"></i>
                  Official Remarks & Query Support
                </h4>
                <button onclick="appController.openRaiseQueryModal('${bill.id}')" 
                  class="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <i class="fa-solid fa-comment-medical"></i> Raise a Query
                </button>
              </div>

              ${bill.publicRemark ? `
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <strong class="text-slate-900 block mb-0.5">Latest Remark from Official:</strong>
                  <p class="leading-relaxed">${bill.publicRemark}</p>
                </div>
              ` : `
                <p class="text-xs text-slate-500 italic">No official remarks or issues noted for this bill.</p>
              `}

              ${bill.queries && bill.queries.length > 0 ? `
                <div class="space-y-2 pt-2 border-t border-slate-100">
                  <h5 class="text-[11px] font-bold text-slate-600 uppercase">Your Queries on this Bill</h5>
                  ${bill.queries.map(q => `
                    <div class="p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-xs space-y-1">
                      <div class="flex justify-between text-[11px] text-slate-500">
                        <span class="font-semibold text-blue-950">${q.sender || 'Supplier'}</span>
                        <span>${q.timestamp}</span>
                      </div>
                      <p class="text-slate-800">${q.text}</p>
                      ${q.officialReply ? `
                        <div class="mt-1.5 p-2 bg-white rounded border border-blue-200 text-[11px] text-slate-700">
                          <strong class="text-slate-900 block mb-0.5"><i class="fa-solid fa-reply text-emerald-600 mr-1"></i> Official Reply:</strong>
                          ${q.officialReply}
                        </div>
                      ` : `
                        <span class="inline-block mt-1 text-[10px] text-amber-700 font-semibold">
                          <i class="fa-solid fa-clock mr-1"></i> Waiting for official response
                        </span>
                      `}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Supplier Modal Action Footer -->
          <div class="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button onclick="appController.openLifecycleModal('${bill.id}')" 
              class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-timeline"></i> Track Status Timeline
            </button>

            <div class="flex items-center gap-2">
              ${isReturned ? `
                <button onclick="appController.openResubmitBillModal('${bill.id}')" 
                  class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                  <i class="fa-solid fa-rotate-right"></i> Correct & Resubmit Bill
                </button>
              ` : ''}

              ${isPaid ? `
                <button onclick="appController.openVoucherModal('${bill.id}')" 
                  class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                  <i class="fa-solid fa-receipt"></i> Download Voucher
                </button>
              ` : ''}

              <button onclick="appController.openRaiseQueryModal('${bill.id}')" 
                class="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                <i class="fa-solid fa-circle-question"></i> Raise a Query
              </button>

              <button onclick="appController.closeModal()" class="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold">
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    this.openModalHTML(html);
  }

  // Resubmit Bill Modal for Returned Bills
  openResubmitBillModal(billId) {
    const bill = AppState.getBillById(billId);
    if (!bill) return;

    const reason = bill.exception?.reason || bill.publicRemark || "Correction required by reviewing officer.";

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-amber-300 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          <div class="bg-amber-600 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-white text-amber-700 flex items-center justify-center text-lg font-bold">
                <i class="fa-solid fa-rotate-right"></i>
              </div>
              <div>
                <h3 class="text-base font-bold">Correct & Resubmit Bill: ${bill.id}</h3>
                <p class="text-xs text-amber-100">Update permitted bill details and provide corrected documentation</p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-amber-100 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onsubmit="appController.handleResubmitBillSubmit(event, '${bill.id}')" class="p-6 space-y-4">
            <!-- Reason for Return Banner -->
            <div class="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950">
              <div class="font-bold flex items-center gap-1.5 text-amber-900 mb-1">
                <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
                Official Reason for Return:
              </div>
              <p class="leading-relaxed font-medium">${reason}</p>
            </div>

            <!-- Read-only Receipt Reference -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between items-center text-slate-700">
              <div>
                <span class="text-slate-400 block text-[11px]">Digital Receipt (GRN):</span>
                <strong class="font-mono text-blue-900">${bill.grnNumber}</strong>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">Commodity:</span>
                <strong class="text-slate-900">${bill.commodity}</strong>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">Godown:</span>
                <span class="text-slate-800">${bill.godownName}</span>
              </div>
            </div>

            <!-- Permitted Editable Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Tax Invoice Number <span class="text-rose-500">*</span>
                </label>
                <input type="text" id="resubmit-invoice-no" required value="${bill.invoiceNumber || ''}" 
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Date <span class="text-rose-500">*</span>
                </label>
                <input type="date" id="resubmit-invoice-date" required value="${bill.invoiceDate || new Date().toISOString().split('T')[0]}" 
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Billed Quantity</label>
                <input type="number" id="resubmit-qty" step="0.01" required value="${bill.billedQty}" 
                  oninput="appController.recalculateResubmitTotals()" 
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                <input type="text" readonly value="${bill.unit}" 
                  class="w-full text-xs p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Rate (₹ / Unit)</label>
                <input type="number" id="resubmit-rate" step="0.01" required value="${bill.ratePerUnit}" 
                  oninput="appController.recalculateResubmitTotals()" 
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono">
              </div>
            </div>

            <!-- Recalculated Summary -->
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div class="flex justify-between font-bold text-slate-800">
                <span>Revised Gross Claim:</span>
                <span id="resubmit-calc-gross" class="font-mono text-sm text-blue-950">₹${bill.grossAmount.toLocaleString('en-IN')}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Less: TDS IT Act Sec 194Q (0.1%):</span>
                <span id="resubmit-calc-tds" class="font-mono text-rose-700">- ₹${(bill.deductions.tds194Q || 0).toLocaleString('en-IN')}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Less: GST TDS (2.0%):</span>
                <span id="resubmit-calc-gst" class="font-mono text-rose-700">- ₹${(bill.deductions.gstTds || 0).toLocaleString('en-IN')}</span>
              </div>
              <div class="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-emerald-900 text-sm">
                <span>Estimated Revised Net Payable:</span>
                <span id="resubmit-calc-net" class="font-mono text-base text-emerald-700">₹${bill.netPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <!-- Upload Corrected Document -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Upload Corrected Document / Fresh Invoice Copy <span class="text-rose-500">*</span>
              </label>
              <div class="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/20 rounded-xl p-3 text-center cursor-pointer transition-colors">
                <i class="fa-solid fa-cloud-arrow-up text-xl text-amber-600 mb-1"></i>
                <p class="text-xs text-slate-700 font-medium">Click to select corrected file or drag and drop</p>
                <span class="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
                  <i class="fa-solid fa-file-pdf text-red-500 mr-1"></i> Corrected_Invoice_Signed.pdf (Attached)
                </span>
              </div>
            </div>

            <!-- Explanation Note -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Your Explanation / Reply to Official <span class="text-rose-500">*</span>
              </label>
              <textarea id="resubmit-supplier-reply" rows="2" required 
                placeholder="State the corrections made (e.g. Attached corrected weighbridge certificate with matching tare weight)..." 
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"></textarea>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button type="button" onclick="appController.closeModal()" 
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
                Cancel
              </button>
              <button type="submit" 
                class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2">
                <i class="fa-solid fa-rotate-right"></i> Resubmit Bill
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.openModalHTML(html);
    this.recalculateResubmitTotals();
  }

  recalculateResubmitTotals() {
    const qty = parseFloat(document.getElementById('resubmit-qty')?.value || 0);
    const rate = parseFloat(document.getElementById('resubmit-rate')?.value || 0);
    const gross = qty * rate;
    const tds = Math.round(gross * 0.001);
    const gst = Math.round(gross * 0.02);
    const net = gross - (tds + gst);

    const grossEl = document.getElementById('resubmit-calc-gross');
    const tdsEl = document.getElementById('resubmit-calc-tds');
    const gstEl = document.getElementById('resubmit-calc-gst');
    const netEl = document.getElementById('resubmit-calc-net');

    if (grossEl) grossEl.innerText = `₹${gross.toLocaleString('en-IN')}`;
    if (tdsEl) tdsEl.innerText = `- ₹${tds.toLocaleString('en-IN')}`;
    if (gstEl) gstEl.innerText = `- ₹${gst.toLocaleString('en-IN')}`;
    if (netEl) netEl.innerText = `₹${net.toLocaleString('en-IN')}`;
  }

  handleResubmitBillSubmit(e, billId) {
    e.preventDefault();
    const invoiceNumber = document.getElementById('resubmit-invoice-no')?.value;
    const invoiceDate = document.getElementById('resubmit-invoice-date')?.value;
    const billedQty = parseFloat(document.getElementById('resubmit-qty')?.value || 0);
    const ratePerUnit = parseFloat(document.getElementById('resubmit-rate')?.value || 0);
    const supplierReply = document.getElementById('resubmit-supplier-reply')?.value || "";

    const success = AppState.resubmitBill(billId, {
      invoiceNumber,
      invoiceDate,
      billedQty,
      ratePerUnit,
      supplierReply
    });

    this.closeModal();

    if (success) {
      this.showToast(`Bill ${billId} has been corrected and resubmitted successfully. It is now waiting for verification.`, "success");
    } else {
      this.showToast(`Unable to resubmit bill ${billId}.`, "warning");
    }
  }

  // Edit Draft Bill Modal
  openEditDraftModal(billId) {
    const bill = AppState.getBillById(billId);
    if (!bill || bill.status !== "Draft") return;

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
          <div class="bg-blue-900 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-lg">
                <i class="fa-solid fa-pen-to-square"></i>
              </div>
              <div>
                <h3 class="text-base font-bold">Edit Draft Bill: ${bill.id}</h3>
                <p class="text-xs text-blue-200">Update draft details or submit bill when ready</p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-blue-200 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onsubmit="event.preventDefault();" class="p-6 space-y-4">
            <div class="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs flex justify-between items-center text-slate-700">
              <div>
                <span class="text-slate-400 block text-[11px]">Digital Receipt (GRN):</span>
                <strong class="font-mono text-blue-900">${bill.grnNumber}</strong>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">Commodity:</span>
                <strong class="text-slate-900">${bill.commodity}</strong>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">Godown:</span>
                <span class="text-slate-800">${bill.godownName}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Tax Invoice Number <span class="text-rose-500">*</span>
                </label>
                <input type="text" id="draft-invoice-no" required value="${bill.invoiceNumber || ''}" 
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Date <span class="text-rose-500">*</span>
                </label>
                <input type="date" id="draft-invoice-date" required value="${bill.invoiceDate || new Date().toISOString().split('T')[0]}" 
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Billed Quantity</label>
                <input type="number" id="draft-qty" step="0.01" required value="${bill.billedQty}" 
                  oninput="appController.recalculateEditDraftTotals()" 
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                <input type="text" readonly value="${bill.unit}" 
                  class="w-full text-xs p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Rate (₹ / Unit)</label>
                <input type="number" id="draft-rate" step="0.01" required value="${bill.ratePerUnit}" 
                  oninput="appController.recalculateEditDraftTotals()" 
                  class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono">
              </div>
            </div>

            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div class="flex justify-between font-bold text-slate-800">
                <span>Gross Claim Amount:</span>
                <span id="draft-calc-gross" class="font-mono text-sm text-blue-950">₹${bill.grossAmount.toLocaleString('en-IN')}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Less: TDS IT Act Sec 194Q (0.1%):</span>
                <span id="draft-calc-tds" class="font-mono text-rose-700">- ₹${(bill.deductions.tds194Q || 0).toLocaleString('en-IN')}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Less: GST TDS (2.0%):</span>
                <span id="draft-calc-gst" class="font-mono text-rose-700">- ₹${(bill.deductions.gstTds || 0).toLocaleString('en-IN')}</span>
              </div>
              <div class="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-emerald-900 text-sm">
                <span>Estimated Net Payable:</span>
                <span id="draft-calc-net" class="font-mono text-base text-emerald-700">₹${bill.netPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <button type="button" onclick="appController.closeModal()" 
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
                Cancel
              </button>
              <div class="flex items-center gap-2">
                <button type="button" onclick="appController.handleUpdateDraftSubmit(event, '${bill.id}')" 
                  class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                  <i class="fa-solid fa-floppy-disk"></i> Save Changes
                </button>
                <button type="button" onclick="appController.executeSubmitDraft('${bill.id}')" 
                  class="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2">
                  <i class="fa-solid fa-paper-plane"></i> Submit Bill Now
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    this.openModalHTML(html);
    this.recalculateEditDraftTotals();
  }

  recalculateEditDraftTotals() {
    const qty = parseFloat(document.getElementById('draft-qty')?.value || 0);
    const rate = parseFloat(document.getElementById('draft-rate')?.value || 0);
    const gross = qty * rate;
    const tds = Math.round(gross * 0.001);
    const gst = Math.round(gross * 0.02);
    const net = gross - (tds + gst);

    const grossEl = document.getElementById('draft-calc-gross');
    const tdsEl = document.getElementById('draft-calc-tds');
    const gstEl = document.getElementById('draft-calc-gst');
    const netEl = document.getElementById('draft-calc-net');

    if (grossEl) grossEl.innerText = `₹${gross.toLocaleString('en-IN')}`;
    if (tdsEl) tdsEl.innerText = `- ₹${tds.toLocaleString('en-IN')}`;
    if (gstEl) gstEl.innerText = `- ₹${gst.toLocaleString('en-IN')}`;
    if (netEl) netEl.innerText = `₹${net.toLocaleString('en-IN')}`;
  }

  handleUpdateDraftSubmit(e, billId) {
    if (e) e.preventDefault();
    const invoiceNumber = document.getElementById('draft-invoice-no')?.value;
    const invoiceDate = document.getElementById('draft-invoice-date')?.value;
    const billedQty = parseFloat(document.getElementById('draft-qty')?.value || 0);
    const ratePerUnit = parseFloat(document.getElementById('draft-rate')?.value || 0);

    const updated = AppState.saveDraftBill({
      id: billId,
      invoiceNumber,
      invoiceDate,
      billedQty,
      ratePerUnit
    });

    this.closeModal();
    this.showToast(`Draft bill ${billId} updated successfully.`, "success");
  }

  executeSubmitDraft(billId) {
    const success = AppState.submitDraftBill(billId);
    this.closeModal();
    if (success) {
      this.showToast(`Bill ${billId} submitted successfully! Your bill is now waiting for verification.`, "success");
    } else {
      this.showToast(`Unable to submit draft bill ${billId}.`, "warning");
    }
  }

  executeDeleteDraft(billId) {
    if (confirm(`Are you sure you want to delete draft bill ${billId}?`)) {
      const success = AppState.deleteDraftBill(billId);
      if (success) {
        this.showToast(`Draft bill ${billId} deleted.`, "info");
      }
    }
  }

  // Raise Query Modal
  openRaiseQueryModal(billId) {
    const bill = AppState.getBillById(billId);
    if (!bill) return;

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-blue-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          <div class="bg-blue-900 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center text-sm font-bold">
                <i class="fa-solid fa-circle-question"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold">Raise a Query</h3>
                <p class="text-xs text-blue-200 font-mono">${bill.id} • ${bill.commodity}</p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-blue-200 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onsubmit="appController.handleSupplierQuerySubmit(event, '${bill.id}')" class="p-6 space-y-4">
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div class="flex justify-between">
                <span class="text-slate-500">Current Status:</span>
                <span class="font-bold text-slate-800">${bill.status}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Digital Receipt (GRN):</span>
                <span class="font-mono text-blue-900">${bill.grnNumber}</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Your Question / Clarification Request <span class="text-rose-500">*</span>
              </label>
              <textarea id="supplier-query-text" rows="4" required 
                placeholder="Ask about payment status, document verification, or inspection feedback..." 
                class="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:bg-white"></textarea>
              <p class="text-[11px] text-slate-400 mt-1">This query will be sent directly to the GSCSCL review officers for this bill.</p>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button type="button" onclick="appController.closeModal()" 
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
                Cancel
              </button>
              <button type="submit" 
                class="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5">
                <i class="fa-solid fa-paper-plane"></i> Send Query
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.openModalHTML(html);
  }

  handleSupplierQuerySubmit(e, billId) {
    e.preventDefault();
    const queryText = document.getElementById('supplier-query-text')?.value || "";

    const success = AppState.raiseSupplierQuery(billId, queryText);
    this.closeModal();

    if (success) {
      this.showToast(`Your query regarding bill ${billId} has been submitted. Review officials will reply shortly.`, "success");
    } else {
      this.showToast(`Unable to submit query for bill ${billId}.`, "warning");
    }
  }

  openLifecycleModal(billId) {
    const bill = AppState.getBillById(billId);
    if (!bill) return;

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          <div class="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                <i class="fa-solid fa-timeline"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold">Audit Trail & Lifecycle History</h3>
                <p class="text-xs text-slate-300 font-mono">${bill.id} • ${bill.commodity}</p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-slate-400 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            ${UI.renderLifecycleSteps(bill.status)}

            <div class="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              ${bill.notingSheet.map((item, idx) => `
                <div class="relative group">
                  <div class="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-600 group-hover:scale-125 transition-transform"></div>
                  <div class="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white transition-colors">
                    <div class="flex items-center justify-between text-xs mb-1">
                      <span class="font-bold text-slate-900">${item.action}</span>
                      <span class="font-mono text-slate-400 text-[11px]">${item.timestamp}</span>
                    </div>
                    <p class="text-xs text-slate-700 leading-relaxed font-serif">"${item.remarks}"</p>
                    <div class="mt-2 text-[11px] text-blue-900 font-semibold flex items-center gap-1">
                      <i class="fa-solid fa-user-check text-[10px]"></i> ${item.officer} 
                      <span class="text-slate-400 font-normal">(${item.designation})</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="bg-slate-50 p-4 border-t border-slate-200 text-right">
            <button onclick="appController.closeModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg">
              Close History
            </button>
          </div>
        </div>
      </div>
    `;

    this.openModalHTML(html);
  }

  openRaiseExceptionModal(billId) {
    const bill = AppState.getBillById(billId);
    if (!bill) return;

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-rose-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          <div class="bg-rose-900 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-rose-500 text-white flex items-center justify-center text-sm font-bold">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold">Flag Exception / Discrepancy Query</h3>
                <p class="text-xs text-rose-200 font-mono">${bill.id} • ${bill.supplierName}</p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-rose-200 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onsubmit="appController.handleRaiseExceptionSubmit(event, '${bill.id}')" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Discrepancy Category <span class="text-rose-500">*</span>
              </label>
              <select id="exc-code-select" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500">
                <option value="EXC-QTY-MISMATCH">Weight Variance > 0.5% (Physical vs Invoiced Quantity)</option>
                <option value="EXC-MOISTURE-EXCEEDED">High Moisture Content (> Prescribed Agmark Standard)</option>
                <option value="EXC-DOC-MISSING">Missing / Illegible Laboratory Certificate or Mandi Receipt</option>
                <option value="EXC-BANK-MISMATCH">Bank IFSC / Account Name Mismatch on Mandate</option>
                <option value="EXC-GST-MISMATCH">GSTIN Inactive or Tax Rate Discrepancy</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Severity Level
              </label>
              <select id="exc-severity-select" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500">
                <option value="High">High (Halts processing until GM / Committee review)</option>
                <option value="Medium" selected>Medium (Standard penalty deduction or doc re-upload)</option>
                <option value="Low">Low (Informational query / slight clarification)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Observation & Reason for Raising Exception <span class="text-rose-500">*</span>
              </label>
              <textarea id="exc-reason-text" rows="4" required 
                placeholder="Enter specific audit observation, tare slip discrepancy, or laboratory test variation..."
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"></textarea>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button type="button" onclick="appController.closeModal()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
                Cancel
              </button>
              <button type="submit" class="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5">
                <i class="fa-solid fa-flag"></i> Flag Exception Now
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.openModalHTML(html);
  }

  handleRaiseExceptionSubmit(e, billId) {
    e.preventDefault();
    const code = document.getElementById('exc-code-select').value;
    const severity = document.getElementById('exc-severity-select').value;
    const reason = document.getElementById('exc-reason-text').value;

    AppState.raiseException(billId, {
      code,
      severity,
      reason
    });

    this.closeModal();
    this.showToast(`Bill ${billId} has been flagged with an exception.`, "warning");
  }

  openResolveExceptionModal(billId) {
    const bill = AppState.getBillById(billId);
    if (!bill) return;

    const html = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-emerald-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          <div class="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                <i class="fa-solid fa-wrench"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold">Resolve Flagged Exception</h3>
                <p class="text-xs text-slate-300 font-mono">${bill.id} • ${bill.supplierName}</p>
              </div>
            </div>
            <button onclick="appController.closeModal()" class="text-slate-400 hover:text-white text-lg">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onsubmit="appController.handleResolveExceptionSubmit(event, '${bill.id}')" class="p-6 space-y-4">
            <div class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
              <div class="font-bold mb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-triangle-exclamation text-rose-600"></i>
                Active Flag: [${bill.exception.code || 'EXCEPTION'}]
              </div>
              <p class="text-rose-800 leading-relaxed">${bill.exception.reason}</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Resolution Action <span class="text-rose-500">*</span>
              </label>
              <select id="resolve-action-type" onchange="appController.handleResolutionActionChange(this.value)" 
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600">
                <option value="PENALTY_CUT">Apply Quality / Moisture Deduction and Proceed</option>
                <option value="GM_OVERRIDE">GM Administrative Waiver (Accept Discrepancy under Discretion)</option>
                <option value="DOC_VERIFIED">Supplier Revised Document Verified & Accepted</option>
              </select>
            </div>

            <div id="penalty-input-container">
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Penalty / Moisture Cut Amount (₹)
              </label>
              <input type="number" id="resolve-penalty-cut" value="12500" step="100" 
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-mono">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Next Stage To Resume <span class="text-rose-500">*</span>
              </label>
              <select id="resolve-target-stage" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600">
                <option value="Pre-Audit" selected>Resume to Pre-Audit Verification</option>
                <option value="Approval Pending">Escalate Directly to General Manager Sanction</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Official Resolution Minutes / Justification <span class="text-rose-500">*</span>
              </label>
              <textarea id="resolve-notes-text" rows="3" required 
                placeholder="Enter resolution notes, committee decision, or officer justification..." 
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600">Clarification accepted and deduction adjusted in accordance with GSCSCL Procurement Rules.</textarea>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button type="button" onclick="appController.closeModal()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
                Cancel
              </button>
              <button type="submit" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5">
                <i class="fa-solid fa-check"></i> Clear Exception & Resume
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.openModalHTML(html);
  }

  handleResolutionActionChange(actionType) {
    const penContainer = document.getElementById('penalty-input-container');
    if (penContainer) {
      if (actionType === 'PENALTY_CUT') {
        penContainer.classList.remove('hidden');
      } else {
        penContainer.classList.add('hidden');
      }
    }
  }

  handleResolveExceptionSubmit(e, billId) {
    e.preventDefault();
    const actionType = document.getElementById('resolve-action-type').value;
    const penaltyCut = actionType === 'PENALTY_CUT' 
      ? parseFloat(document.getElementById('resolve-penalty-cut').value || 0) 
      : 0;
    const targetStatus = document.getElementById('resolve-target-stage').value;
    const notes = document.getElementById('resolve-notes-text').value;

    AppState.resolveException(billId, {
      penaltyCut,
      targetStatus,
      notes
    });

    this.closeModal();
    this.showToast(`Exception on Bill ${billId} resolved. Resumed to ${targetStatus}.`, "success");
  }

  openVoucherModal(billId) {
    const bill = AppState.getBillById(billId);
    if (!bill) return;

    const modalHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div class="max-w-3xl w-full my-6">
          ${UI.renderVoucherModal(bill)}
        </div>
      </div>
    `;
    this.openModalHTML(modalHTML);
  }

  // -------------------------------------------------------------
  // FAST ACTION HANDLERS
  // -------------------------------------------------------------
  executePassGodown(billId) {
    AppState.passGodownVerification(billId);
    this.closeModal();
    this.showToast(`Bill ${billId} verified by Godown Manager and sent to Pre-Audit.`, "success");
  }

  executePassPreAudit(billId) {
    const weighment = document.getElementById('chk-weighment')?.checked ?? true;
    const quality = document.getElementById('chk-quality')?.checked ?? true;
    const gst = document.getElementById('chk-gst')?.checked ?? true;

    AppState.passPreAudit(billId, {
      weighmentSlipVerified: weighment,
      qualityReportCompliant: quality,
      gstinActive: gst
    });
    this.closeModal();
    this.showToast(`Bill ${billId} passed Pre-Audit scrutiny and forwarded to GM for sanction.`, "success");
  }

  executeApproveGM(billId) {
    AppState.approveGMBill(billId);
    this.closeModal();
    this.showToast(`Bill ${billId} sanctioned by General Manager and sent to Finance.`, "success");
  }

  approveAllPendingGM() {
    const pending = AppState.getBills().filter(b => b.status === "Approval Pending");
    if (pending.length === 0) {
      this.showToast("No pending bills for GM sanction.", "info");
      return;
    }

    pending.forEach(b => {
      AppState.approveGMBill(b.id, "Bulk approved by General Manager under Special Kharif/Rabi Sanction Batch.");
    });

    this.showToast(`All ${pending.length} pending bills sanctioned successfully!`, "success");
  }

  executeDisbursePayment(billId) {
    AppState.disbursePayment(billId);
    this.closeModal();
    this.openVoucherModal(billId);
    this.showToast(`Payment disbursed for Bill ${billId} via IFMS-Gujarat RTGS Gateway.`, "success");
  }

  appendNotingSheetRemark(billId) {
    const input = document.getElementById('quick-note-input');
    if (!input || !input.value.trim()) return;

    const bill = AppState.getBillById(billId);
    if (!bill) return;

    const currentRole = AppState.getCurrentRole() || { officer: "Auditing Officer", designation: "GSCSCL" };
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bill.notingSheet.push({
      timestamp: `${dateStr} ${timeStr}`,
      officer: currentRole.officer,
      designation: currentRole.designation,
      action: "Officer Minute / Observation",
      remarks: input.value.trim()
    });

    AppState.saveState();
    this.openBillDetailsModal(billId);
    this.showToast("Official noting recorded successfully.", "info");
  }

  // -------------------------------------------------------------
  // CHART INITIALIZATION
  // -------------------------------------------------------------
  initAdminCharts() {
    if (typeof Chart === 'undefined') return;

    const ctx1 = document.getElementById('districtProcurementChart');
    if (ctx1) {
      if (this.chartInstances.district) this.chartInstances.district.destroy();

      const districtMap = {};
      GSCSCL_DATA.districts.slice(0, 7).forEach(d => districtMap[d] = 0);
      AppState.getBills().forEach(b => {
        if (districtMap[b.district] !== undefined) {
          districtMap[b.district] += (b.grossAmount / 100000);
        }
      });

      this.chartInstances.district = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: Object.keys(districtMap),
          datasets: [{
            label: 'Procurement Invoiced (₹ Lakhs)',
            data: Object.values(districtMap).map(v => Math.round(v)),
            backgroundColor: '#1d4ed8',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { font: { size: 10 } }
            },
            x: {
              ticks: { font: { size: 10 } }
            }
          }
        }
      });
    }

    const ctx2 = document.getElementById('commodityCategoryChart');
    if (ctx2) {
      if (this.chartInstances.category) this.chartInstances.category.destroy();

      let cgpVal = 0;
      let tocVal = 0;
      AppState.getBills().forEach(b => {
        if (b.category === 'CGP') cgpVal += b.grossAmount;
        else tocVal += b.grossAmount;
      });

      this.chartInstances.category = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['CGP - Coarse Grains & Pulses', 'TOC - Salt, Bags, Edible Oils'],
          datasets: [{
            data: [cgpVal, tocVal],
            backgroundColor: ['#d97706', '#0284c7'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }
  }

  // -------------------------------------------------------------
  // NOTIFICATIONS & EXPORT
  // -------------------------------------------------------------
  toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    if (dropdown.classList.contains('hidden')) {
      dropdown.classList.remove('hidden');
      this.renderNotificationList();
    } else {
      dropdown.classList.add('hidden');
    }
  }

  renderNotificationList() {
    const listEl = document.getElementById('notification-list-body');
    if (!listEl) return;

    const notifs = AppState.state.notifications;
    if (notifs.length === 0) {
      listEl.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No new alerts or notifications.</div>`;
      return;
    }

    listEl.innerHTML = notifs.map(n => {
      let icon = "fa-bell text-blue-600";
      if (n.type === "warning") icon = "fa-triangle-exclamation text-rose-600";
      if (n.type === "success") icon = "fa-circle-check text-emerald-600";

      return `
        <div class="p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors text-xs ${!n.read ? 'bg-blue-50/40' : ''}">
          <div class="flex items-start gap-2.5">
            <i class="fa-solid ${icon} mt-0.5 text-sm"></i>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800">${n.title}</span>
                <span class="text-[10px] text-slate-400">${n.time}</span>
              </div>
              <p class="text-slate-600 mt-0.5 leading-snug">${n.message}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  showToast(message, type = "info") {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold text-white transition-all transform translate-y-4 opacity-0 animate-in fade-in slide-in-from-bottom duration-200 ${
      type === 'success' ? 'bg-emerald-800' : (type === 'warning' ? 'bg-rose-800' : 'bg-slate-900')
    }`;

    let icon = "fa-info-circle";
    if (type === 'success') icon = "fa-circle-check text-emerald-400";
    if (type === 'warning') icon = "fa-triangle-exclamation text-amber-400";

    toast.innerHTML = `
      <i class="fa-solid ${icon} text-sm"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('opacity-0', 'translate-y-4');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-4');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  resetToInitialDemoData() {
    if (confirm("Reset all bills, receipts, and workflows to the initial factory seed state?")) {
      AppState.resetToDefaults(true);
      this.showToast("All GSCSCL application data restored to defaults.", "info");
    }
  }

  exportBillsToCSV() {
    const bills = AppState.getBills();
    let csv = "Bill ID,Invoice No,GRN No,Supplier,District,Commodity,Category,Quantity,Unit,Rate,Gross Claim,TDS 194Q,GST TDS,Net Payable,Status,Current Stage\n";

    bills.forEach(b => {
      csv += `"${b.id}","${b.invoiceNumber}","${b.grnNumber}","${b.supplierName}","${b.district}","${b.commodity}","${b.category}",${b.billedQty},"${b.unit}",${b.ratePerUnit},${b.grossAmount},${b.deductions.tds194Q || 0},${b.deductions.gstTds || 0},${b.netPayable},"${b.status}","${b.currentStage}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GSCSCL_Billing_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast("Billing ledger exported successfully.", "success");
  }
}

// Global Application Controller Instance
const appController = new AppController();
