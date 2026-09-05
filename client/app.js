// =============================================================
// REVIFY PLATFORM FRONTEND CONTROLLER // LIGHT PASTEL SPA
// Merchant Center + AI Shopping + Merchant Intelligence
// =============================================================

let currentSessionId = 'sess_' + Math.random().toString(36).substring(2, 8);
let cartData = { items: [], subtotal: 0, total: 0, appliedDiscount: 0 };
let currentPolicyEvaluation = null;
let lastUserIntent = 'I need headphones under ₹5,000 for travel';
let latestAIResponseText = '';
let latestRecommendedCrossSell = null;
let currentProductsList = [];
let currentSmartCartOpportunity = null;

// Customer Authentication & Profile State (Backend DB & JWT Session-Driven)
let currentCustomer = null;
let currentMandate = null;
let currentUserOrders = [];

// Merchant Authentication & Profile State
let currentMerchant = null;
try {
  const saved = localStorage.getItem('revify_merchant') || localStorage.getItem('omnigrowth_merchant');
  if (saved) {
    currentMerchant = JSON.parse(saved);
    if (currentMerchant) {
      if (currentMerchant.businessName && (currentMerchant.businessName.includes('OmniGrowth') || currentMerchant.businessName === 'OmniGrowth Labs')) {
        currentMerchant.businessName = 'Revify Labs';
      }
      if (currentMerchant.name && (currentMerchant.name.includes('OmniGrowth') || currentMerchant.name === 'OmniGrowth Labs')) {
        currentMerchant.name = 'Revify Labs';
      }
      localStorage.setItem('revify_merchant', JSON.stringify(currentMerchant));
    }
  }
  localStorage.removeItem('omnigrowth_merchant');
} catch (e) {
  currentMerchant = null;
}

let topRecommendationsList = [];
let currentRecFilter = 'all';

// High-Resolution Editorial Product Imagery
const PRODUCT_IMAGES = {
  prod_anc_headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  prod_anc_headphones_pro: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80',
  prod_travel_case: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
  prod_bt_adapter: 'https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=600&q=80',
  prod_travel_backpack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
  prod_mech_keyboard: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
  prod_coiled_cable: 'https://images.unsplash.com/photo-1605792657660-596af9009e82?auto=format&fit=crop&w=600&q=80',
  prod_desk_mat: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=600&q=80',
  prod_laptop_stand: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80',
  prod_usbc_hub: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=600&q=80',
  prod_gan_charger: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
  prod_earbuds_anc: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80'
};

function getProductImageUrl(productId) {
  return PRODUCT_IMAGES[productId] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80';
}

function getNaturalRecNote(rec) {
  if (!rec) return 'Popular with customers this week';
  if (rec.naturalNote) return rec.naturalNote;
  if (rec.reasonBadge) {
    const b = rec.reasonBadge.toLowerCase();
    if (b.includes('search') || b.includes('recent')) {
      return 'Picked for you based on your recent searches';
    }
    if (b.includes('companion') || b.includes('pair')) {
      return 'Pairs seamlessly with your current setup';
    }
    if (b.includes('trending') || b.includes('popular') || b.includes('best')) {
      return 'Popular with customers who bought this';
    }
    if (b.includes('margin') || b.includes('deal') || b.includes('value')) {
      return 'Exceptional value in high-performance audio';
    }
    return rec.reasonBadge;
  }
  return 'Curated recommendation for your setup';
}

function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Speech-to-Text (STT) and Text-to-Speech (TTS) state
let isListening = false;
let isSpeaking = false;

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupCustomerLoginModal();
  setupUserProfilePanel();
  setupMerchantAuth();
  setupTopRecommendations();
  setupCustomerOrdersModal();
  setupMerchantSubviews();
  setupShoppingChat();
  setupSessionMemory();
  setupVoiceAndSpeakerControls();
  setupCartDrawer();
  setupCheckoutModals();
  setupMerchantControls();
  setupSimulatorControls();
  setupNLPolicyBuilder();

  // Restore session from httpOnly cookie via /api/auth/me
  await checkAuthSession();

  updateMerchantUI();
  refreshCart();
  refreshMerchantData();
  refreshSessionMemory();
  loadTopRecommendations();
});

// =============================================================
// 1. SPA ROUTING & NAVIGATION
// =============================================================
function setupNavigation() {
  const switchBtns = document.querySelectorAll('.nav-switch-btn');
  const appViews = document.querySelectorAll('.app-view');

  window.switchAppView = function(targetViewId, updateHash = true) {
    // Role-based access control: open login modal if customer tries to access shopping without account
    if (targetViewId === 'view-shopping' && !currentCustomer) {
      openCustomerLoginModal('login');
      return;
    }
    if (targetViewId === 'view-merchant' && !currentMerchant) {
      targetViewId = 'view-merchant-auth';
    }

    appViews.forEach(view => view.classList.remove('active'));
    switchBtns.forEach(btn => btn.classList.remove('active'));

    const targetView = document.getElementById(targetViewId);
    if (targetView) targetView.classList.add('active');

    // Sync active nav button — map auth views to their parent nav button
    let navBtnTarget = targetViewId;
    if (targetViewId === 'view-customer-auth') navBtnTarget = 'view-shopping';
    if (targetViewId === 'view-merchant-auth') navBtnTarget = 'view-merchant';
    const activeBtn = document.querySelector(`.nav-switch-btn[data-target="${navBtnTarget}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update URL hash
    if (updateHash) {
      const hashMap = {
        'view-landing': '',
        'view-customer-auth': '#customer-login',
        'view-shopping': '#shopping',
        'view-merchant-auth': '#merchant-login',
        'view-merchant': '#merchant'
      };
      if (hashMap[targetViewId] !== undefined) {
        history.replaceState(null, '', window.location.pathname + (hashMap[targetViewId] || ''));
      }
    }

    if (targetViewId === 'view-merchant') {
      refreshMerchantData();
      updateMerchantUI();
    } else if (targetViewId === 'view-shopping') {
      loadTopRecommendations();
      updateCustomerGreeting();
    }
  };

  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => window.switchAppView(btn.dataset.target));
  });

  document.getElementById('nav-brand-home')?.addEventListener('click', () => window.switchAppView('view-landing'));

  // Landing page portal card click handlers — open login popup directly if not logged in
  document.getElementById('card-enter-shopping')?.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-hero-login-popup') return;
    if (currentCustomer) {
      window.switchAppView('view-shopping');
    } else {
      openCustomerLoginModal('login');
    }
  });
  document.getElementById('btn-enter-shopping-direct')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCustomer) {
      window.switchAppView('view-shopping');
    } else {
      openCustomerLoginModal('login');
    }
  });
  document.getElementById('btn-hero-login-popup')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openCustomerLoginModal('login');
  });

  document.getElementById('card-enter-merchant')?.addEventListener('click', () => {
    window.switchAppView(currentMerchant ? 'view-merchant' : 'view-merchant-auth');
  });

  // Top Navbar Direct Login Button
  document.getElementById('btn-open-login-popup')?.addEventListener('click', () => {
    openCustomerLoginModal('login');
  });

  // Top Navbar Customer Account button
  document.getElementById('btn-nav-customer')?.addEventListener('click', () => {
    if (currentCustomer) {
      openUserProfilePanel();
    } else {
      openCustomerLoginModal('login');
    }
  });

  // URL Hash Routing Support
  function handleRouteHash() {
    const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
    if (['login', 'auth', 'customer-auth', 'customer-login', 'signin', 'signup'].includes(hash)) {
      openCustomerLoginModal(hash === 'signup' ? 'signup' : 'login');
    } else if (hash === 'shopping') {
      window.switchAppView('view-shopping', false);
    } else if (['merchant-login', 'merchant-auth', 'merchant-signin'].includes(hash)) {
      window.switchAppView('view-merchant-auth', false);
    } else if (hash === 'merchant' || hash === 'command') {
      window.switchAppView('view-merchant', false);
    } else if (hash === 'landing' || hash === 'home') {
      window.switchAppView('view-landing', false);
    }
  }

  window.addEventListener('hashchange', handleRouteHash);
  if (window.location.hash) {
    handleRouteHash();
  }
}

// =============================================================
// 1.1 CUSTOMER AUTHENTICATION & USER PROFILE CONTROLLER
// =============================================================

async function checkAuthSession() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    if (data.authenticated && data.user) {
      currentCustomer = data.user;
      currentMandate = data.mandate || null;
    } else {
      currentCustomer = null;
      currentMandate = null;
    }
  } catch (err) {
    console.error('Session check failed:', err);
    currentCustomer = null;
    currentMandate = null;
  }
  updateCustomerUI();
}

function setAuthenticatedCustomer(user, mandate = null) {
  currentCustomer = user;
  currentMandate = mandate;
  updateCustomerUI();
  updateCustomerGreeting();
  loadTopRecommendations();
  refreshCustomerOrdersCount();
}

function updateCustomerUI() {
  const btnLogin = document.getElementById('btn-open-login-popup');
  const btnNavCustomer = document.getElementById('btn-nav-customer');
  const navCustomerMonogram = document.getElementById('nav-customer-monogram');
  const navCustomerName = document.getElementById('nav-customer-name');
  const globalAgentPill = document.getElementById('global-agent-pill');
  const storeCustomerName = document.getElementById('store-customer-name');
  const customerBadge = document.getElementById('customer-avatar-badge');
  const statusBadge = document.getElementById('customer-status-badge');
  const historyIndicator = document.getElementById('customer-history-indicator');

  if (currentCustomer) {
    const initials = currentCustomer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const firstName = currentCustomer.name.split(' ')[0];

    if (btnLogin) btnLogin.style.display = 'none';
    if (btnNavCustomer) btnNavCustomer.style.display = 'inline-flex';
    if (navCustomerMonogram) navCustomerMonogram.textContent = initials || 'US';
    if (navCustomerName) navCustomerName.textContent = currentCustomer.name;
    if (storeCustomerName) storeCustomerName.textContent = firstName;
    if (customerBadge) customerBadge.textContent = initials || 'US';
    if (statusBadge) {
      statusBadge.textContent = 'Verified Customer';
      statusBadge.className = 'badge-customer-status font-bold';
    }
    if (historyIndicator) {
      historyIndicator.textContent = 'Curated recommendations for your verified account';
    }

    // Dynamic Agent Pill: check active mandate
    const isMandateActive = currentMandate && currentMandate.status === 'ACTIVE' && new Date(currentMandate.expires_at) > new Date();
    if (globalAgentPill) {
      if (isMandateActive) {
        globalAgentPill.className = 'agent-status-pill';
        const txt = globalAgentPill.querySelector('.status-text');
        if (txt) txt.textContent = `Agent: Active (₹${Number(currentMandate.max_amount).toLocaleString('en-IN')})`;
      } else {
        globalAgentPill.className = 'agent-status-pill pill-no-mandate';
        const txt = globalAgentPill.querySelector('.status-text');
        if (txt) txt.textContent = 'Agent: No Mandate';
      }
    }

    refreshCustomerOrdersCount();
  } else {
    // Honest Unauthenticated / Guest state
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    if (btnNavCustomer) btnNavCustomer.style.display = 'none';
    if (storeCustomerName) storeCustomerName.textContent = 'Guest';
    if (customerBadge) customerBadge.textContent = '--';
    if (statusBadge) {
      statusBadge.textContent = 'Guest Mode';
      statusBadge.className = 'badge-customer-status font-bold new-acc';
    }
    if (historyIndicator) {
      historyIndicator.textContent = 'Catalog preview & AI shopping exploration';
    }
    if (globalAgentPill) {
      globalAgentPill.className = 'agent-status-pill pill-no-mandate';
      const txt = globalAgentPill.querySelector('.status-text');
      if (txt) txt.textContent = 'Agent: No Mandate';
    }
  }

  updateCartBadge();
  updateCustomerGreeting();
}

function openUserProfilePanel() {
  if (!currentCustomer) {
    openCustomerLoginModal('login');
    return;
  }

  const panel = document.getElementById('panel-user-profile');
  if (!panel) return;

  const initials = currentCustomer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const monogramEl = document.getElementById('profile-monogram-large');
  const nameEl = document.getElementById('profile-user-fullname');
  const emailEl = document.getElementById('profile-user-email');

  if (monogramEl) monogramEl.textContent = initials || '--';
  if (nameEl) nameEl.textContent = currentCustomer.name;
  if (emailEl) emailEl.textContent = currentCustomer.email;

  const inputName = document.getElementById('input-edit-fullname');
  const inputNotif = document.getElementById('input-edit-notif');
  if (inputName) inputName.value = currentCustomer.name || '';
  if (inputNotif) inputNotif.value = currentCustomer.notification_pref || 'email';
  const saveFeedback = document.getElementById('profile-save-feedback');
  if (saveFeedback) saveFeedback.textContent = '';

  renderProfileMandateSection();
  fetchAndRenderUserOrders();

  panel.classList.add('active');
  panel.style.display = 'flex';
}

function closeUserProfilePanel() {
  const panel = document.getElementById('panel-user-profile');
  if (panel) {
    panel.classList.remove('active');
    panel.style.display = 'none';
  }
}

window.openUserProfilePanel = openUserProfilePanel;
window.closeUserProfilePanel = closeUserProfilePanel;

function renderProfileMandateSection() {
  const statusTag = document.getElementById('profile-mandate-status-tag');
  const activeBox = document.getElementById('box-mandate-active');
  const createForm = document.getElementById('form-create-mandate');
  const valCeiling = document.getElementById('mandate-val-ceiling');
  const valCategory = document.getElementById('mandate-val-category');
  const valExpires = document.getElementById('mandate-val-expires');

  const isMandateValid = currentMandate && currentMandate.status === 'ACTIVE' && new Date(currentMandate.expires_at) > new Date();

  if (isMandateValid) {
    if (statusTag) {
      statusTag.textContent = `ACTIVE (₹${Number(currentMandate.max_amount).toLocaleString('en-IN')})`;
      statusTag.className = 'mandate-status-tag active';
    }
    if (activeBox) activeBox.style.display = 'block';
    if (createForm) createForm.style.display = 'none';

    if (valCeiling) valCeiling.textContent = `₹${Number(currentMandate.max_amount).toLocaleString('en-IN')}`;
    if (valCategory) valCategory.textContent = currentMandate.category_scope || 'all';
    if (valExpires) {
      const exp = new Date(currentMandate.expires_at);
      valExpires.textContent = `${exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${exp.toLocaleDateString()})`;
    }
  } else {
    if (statusTag) {
      statusTag.textContent = 'NO MANDATE';
      statusTag.className = 'mandate-status-tag';
    }
    if (activeBox) activeBox.style.display = 'none';
    if (createForm) createForm.style.display = 'block';
  }
}

async function fetchAndRenderUserOrders() {
  const container = document.getElementById('profile-transactions-list');
  const countBadge = document.getElementById('profile-order-count-badge');
  if (!container) return;

  container.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:14px;text-align:center;">Loading audit trail...</div>';

  try {
    const res = await fetch('/api/customer/orders', { credentials: 'include' });
    const data = await res.json();
    const orders = data.orders || [];
    currentUserOrders = orders;

    if (countBadge) {
      countBadge.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
    }

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-transactions-box" style="text-align: center; padding: 24px 12px; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px;">
          <p style="margin: 0 0 4px; font-weight: 700; font-size: 13px; color: var(--text-primary);">No transactions recorded yet</p>
          <span style="font-size: 11.5px; color: var(--text-muted);">Autonomous AI purchases and authorized checkouts will appear here.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(o => {
      const dateStr = new Date(o.created_at || o.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const itemsDesc = (o.items || []).map(i => `${i.name} (x${i.quantity || 1})`).join(', ') || 'Revify Order';
      return `
        <div class="user-tx-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 700; font-size: 12.5px; color: var(--text-primary);">${o.id} &bull; <span style="font-weight: 500; color: var(--text-secondary);">${itemsDesc}</span></div>
            <div style="font-size: 11px; color: var(--text-muted);">${dateStr} &bull; ${o.ai_assisted ? 'AI Autonomous Order' : 'Direct Store Order'}</div>
          </div>
          <div style="text-align: right;">
            <div class="font-mono font-bold" style="font-size: 13.5px; color: #1e293b;">₹${o.total.toLocaleString('en-IN')}</div>
            <span class="badge-ai-feed font-mono" style="font-size: 10px; padding: 1px 6px;">${o.payment_status || 'PAID'}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="font-size:12px;color:var(--pastel-crimson-text);padding:10px;">Failed to load transactions: ${err.message}</div>`;
  }
}

function setupUserProfilePanel() {
  const panel = document.getElementById('panel-user-profile');
  const closeBtn = document.getElementById('btn-close-profile-panel');
  const bottomDoneBtn = document.getElementById('btn-close-profile-bottom');
  const logoutBtn = document.getElementById('btn-profile-logout');

  closeBtn?.addEventListener('click', closeUserProfilePanel);
  bottomDoneBtn?.addEventListener('click', closeUserProfilePanel);
  panel?.addEventListener('click', (e) => {
    if (e.target === panel) closeUserProfilePanel();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel?.classList.contains('active')) {
      closeUserProfilePanel();
    }
  });

  // Edit profile button in shopping view opens the panel
  document.getElementById('btn-edit-profile-name')?.addEventListener('click', () => {
    openUserProfilePanel();
  });

  // Revoke Mandate button
  document.getElementById('btn-revoke-mandate')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/mandates/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        currentMandate = null;
        updateCustomerUI();
        renderProfileMandateSection();
      } else {
        alert(data.error || 'Failed to revoke mandate.');
      }
    } catch (err) {
      alert('Network error revoking mandate: ' + err.message);
    }
  });

  // Adjust Limit toggle
  document.getElementById('btn-toggle-new-mandate')?.addEventListener('click', () => {
    const form = document.getElementById('form-create-mandate');
    if (form) {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
  });

  // Mandate creation form submit
  document.getElementById('form-create-mandate')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const maxAmount = Number(document.getElementById('mandate-input-max')?.value || 5000);
    const categoryScope = document.getElementById('mandate-input-category')?.value || '*';
    const durationSeconds = Number(document.getElementById('mandate-input-duration')?.value || 3600);

    const submitBtn = document.getElementById('btn-submit-mandate');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing AP2 Mandate...';
    }

    try {
      const res = await fetch('/api/mandates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          max_amount: maxAmount,
          category_scope: categoryScope,
          duration_seconds: durationSeconds
        })
      });
      const data = await res.json();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign & Authorize Spend Mandate →';
      }

      if (data.success && data.mandate) {
        currentMandate = data.mandate;
        updateCustomerUI();
        renderProfileMandateSection();
      } else {
        alert(data.error || 'Failed to authorize mandate.');
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign & Authorize Spend Mandate →';
      }
      alert('Network error creating mandate: ' + err.message);
    }
  });

  // Profile Edit form submit (PATCH)
  document.getElementById('form-profile-edit')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('input-edit-fullname')?.value.trim();
    const notif = document.getElementById('input-edit-notif')?.value;
    const feedback = document.getElementById('profile-save-feedback');
    const submitBtn = document.getElementById('btn-save-profile-patch');

    if (!name) return alert('Name cannot be empty.');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, notification_pref: notif })
      });
      const data = await res.json();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
      }

      if (data.success && data.user) {
        currentCustomer = data.user;
        updateCustomerUI();
        const initials = currentCustomer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const monogramEl = document.getElementById('profile-monogram-large');
        const nameEl = document.getElementById('profile-user-fullname');
        if (monogramEl) monogramEl.textContent = initials;
        if (nameEl) nameEl.textContent = currentCustomer.name;

        if (feedback) {
          feedback.textContent = 'Profile updated successfully!';
          feedback.style.color = '#16a34a';
          setTimeout(() => { feedback.textContent = ''; }, 3000);
        }
      } else {
        if (feedback) {
          feedback.textContent = data.error || 'Failed to update profile.';
          feedback.style.color = '#dc2626';
        }
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
      }
      if (feedback) {
        feedback.textContent = 'Network error: ' + err.message;
        feedback.style.color = '#dc2626';
      }
    }
  });

  // Logout button
  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}

    currentCustomer = null;
    currentMandate = null;
    currentUserOrders = [];

    closeUserProfilePanel();
    updateCustomerUI();
    window.switchAppView('view-landing');
  });
}

function updateCustomerGreeting() {
  const greetingEl = document.getElementById('shopping-customer-greeting');
  const chatStream = document.getElementById('chat-stream');

  const firstName = currentCustomer ? currentCustomer.name.split(' ')[0] : 'there';
  const timeGreeting = getTimeOfDayGreeting();
  const greetingTitle = `${timeGreeting}, ${firstName}`;

  if (greetingEl) {
    greetingEl.textContent = greetingTitle;
  }

  // Set natural assistant welcome message without diagnostic labels
  const isReturning = currentCustomer && (currentCustomer.isReturning || currentCustomer.purchaseHistory?.length > 0);
  let welcomeDetails = '';
  if (isReturning) {
    welcomeDetails = `Welcome back, ${firstName}. I'm here to help you discover products, recommend matching companion accessories, and unlock bundle savings for your setup.`;
  } else {
    welcomeDetails = `Welcome, ${firstName}. I can help you find high-performance audio, travel essentials, and desk gear tailored to your exact budget.`;
  }

  latestAIResponseText = `${greetingTitle}. ${welcomeDetails}`;

  if (chatStream && chatStream.children.length <= 1) {
    chatStream.innerHTML = `
      <div class="chat-bubble bubble-assistant">
        <div class="bubble-sender">Shopping Assistant</div>
        <div class="bubble-text">
          <strong>${welcomeDetails}</strong>
        </div>
      </div>
    `;
  }
}

async function refreshCustomerOrdersCount() {
  const countEl = document.getElementById('customer-order-count');
  if (!countEl || !currentCustomer) return;

  try {
    const res = await fetch(`/api/customer/orders?customerId=${currentCustomer.id}`);
    const data = await res.json();
    if (data.orders) {
      countEl.textContent = data.orders.length;
    }
  } catch (e) {
    console.error('Fetch customer orders count error:', e);
  }
}

// =============================================================
// 1.1b MERCHANT AUTHENTICATION CONTROLLER
// =============================================================
function setupMerchantAuth() {
  const tabLogin = document.getElementById('tab-merchant-login');
  const tabSignup = document.getElementById('tab-merchant-signup');
  const formLogin = document.getElementById('form-merchant-login');
  const formSignup = document.getElementById('form-merchant-signup');

  tabLogin?.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    formLogin.classList.add('active');
    formSignup.classList.remove('active');
  });

  tabSignup?.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    formSignup.classList.add('active');
    formLogin.classList.remove('active');
  });

  // Merchant Login Form
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('merchant-login-email').value.trim();
    const password = document.getElementById('merchant-login-password').value;
    const btn = document.getElementById('btn-submit-merchant-login');
    btn.disabled = true;
    btn.textContent = 'Authenticating...';

    try {
      const res = await fetch('/api/merchant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      btn.disabled = false;
      btn.textContent = 'Log In to Merchant Center →';

      if (data.success && data.merchant) {
        setAuthenticatedMerchant(data.merchant);
        window.switchAppView('view-merchant');
      } else {
        alert(data.error || 'Merchant login failed. Please try again.');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Log In to Merchant Center →';
      alert('Network error during merchant login: ' + err.message);
    }
  });

  // Merchant Sign Up Form
  formSignup?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const businessName = document.getElementById('merchant-signup-business').value.trim();
    const ownerName = document.getElementById('merchant-signup-owner').value.trim();
    const email = document.getElementById('merchant-signup-email').value.trim();
    const password = document.getElementById('merchant-signup-password').value;
    const btn = document.getElementById('btn-submit-merchant-signup');
    btn.disabled = true;
    btn.textContent = 'Creating Account...';

    try {
      const res = await fetch('/api/merchant/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, ownerName, email, password })
      });
      const data = await res.json();
      btn.disabled = false;
      btn.textContent = 'Create Merchant Account →';

      if (data.success && data.merchant) {
        setAuthenticatedMerchant(data.merchant);
        window.switchAppView('view-merchant');
      } else {
        alert(data.error || 'Merchant registration failed. Please try again.');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Create Merchant Account →';
      alert('Network error during merchant registration: ' + err.message);
    }
  });

  // 1-Click Demo Merchant Profiles
  const btnDemoRevify = document.getElementById('btn-fill-demo-revify') || document.getElementById('btn-fill-demo-omnigrowth');
  btnDemoRevify?.addEventListener('click', () => {
    document.getElementById('merchant-login-email').value = 'admin@revify.com';
    document.getElementById('merchant-login-password').value = 'password123';
    // Switch to login tab if on signup
    tabLogin?.click();
    formLogin?.dispatchEvent(new Event('submit'));
  });

  document.getElementById('btn-fill-demo-acousticpro')?.addEventListener('click', () => {
    document.getElementById('merchant-login-email').value = 'meera@acousticpro.com';
    document.getElementById('merchant-login-password').value = 'password123';
    tabLogin?.click();
    formLogin?.dispatchEvent(new Event('submit'));
  });
}

function setAuthenticatedMerchant(merchant) {
  currentMerchant = merchant;
  try {
    localStorage.setItem('revify_merchant', JSON.stringify(merchant));
  } catch (e) {}
  updateMerchantUI();
}

function logoutMerchant() {
  currentMerchant = null;
  try {
    localStorage.removeItem('revify_merchant');
    localStorage.removeItem('omnigrowth_merchant');
  } catch (e) {}
  updateMerchantUI();
  window.switchAppView('view-merchant-auth');
}

function updateMerchantUI() {
  const merchantNameEl = document.querySelector('.merchant-name');
  const merchantPlanEl = document.querySelector('.merchant-plan');
  const merchantAvatarEl = document.querySelector('.merchant-avatar-pill');

  if (currentMerchant) {
    let bName = currentMerchant.businessName || currentMerchant.name || 'Revify Labs';
    if (bName.includes('OmniGrowth')) {
      bName = bName.replace(/OmniGrowth/gi, 'Revify');
      currentMerchant.businessName = bName;
    }
    if (merchantNameEl) merchantNameEl.textContent = bName;
    if (merchantPlanEl) merchantPlanEl.textContent = currentMerchant.plan || 'Razorpay Test Mode';
    if (merchantAvatarEl) {
      const initials = bName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      merchantAvatarEl.textContent = initials || 'RL';
    }
  } else {
    if (merchantNameEl) merchantNameEl.textContent = 'Revify Labs';
  }
}

// =============================================================
// 1.2 TOP "RECOMMENDED FOR YOU" HORIZONTAL RAIL ENGINE
// =============================================================
function setupTopRecommendations() {
  const filterBtns = document.querySelectorAll('.btn-rec-filter');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRecFilter = btn.dataset.filter;
      renderTopRecommendations();
    });
  });

  const prevBtn = document.getElementById('btn-rec-prev');
  const nextBtn = document.getElementById('btn-rec-next');
  const rail = document.getElementById('top-recommendations-grid');

  prevBtn?.addEventListener('click', () => {
    if (rail) rail.scrollBy({ left: -340, behavior: 'smooth' });
  });

  nextBtn?.addEventListener('click', () => {
    if (rail) rail.scrollBy({ left: 340, behavior: 'smooth' });
  });
}

async function loadTopRecommendations() {
  try {
    const customerId = currentCustomer ? currentCustomer.id : '';
    const res = await fetch(`/api/shopping/recommendations/top?customerId=${customerId}`);
    const data = await res.json();
    topRecommendationsList = data.recommendations || [];

    const badgeRecType = document.getElementById('badge-rec-mode');
    const subtitle = document.getElementById('top-rec-subtitle');

    if (badgeRecType) {
      badgeRecType.textContent = data.isPersonalized ? 'Personalized for you' : 'Popular this week';
    }

    if (subtitle) {
      if (data.isPersonalized && currentCustomer) {
        subtitle.textContent = `Tailored selections based on your shopping preferences and gear compatibility.`;
      } else {
        subtitle.textContent = `Curated electronics and accessories popular with verified shoppers.`;
      }
    }

    renderTopRecommendations();
  } catch (err) {
    console.error('Error loading top recommendations:', err);
  }
}

function renderTopRecommendations() {
  const grid = document.getElementById('top-recommendations-grid');
  if (!grid) return;

  let filtered = topRecommendationsList;
  if (currentRecFilter && currentRecFilter !== 'all') {
    filtered = topRecommendationsList.filter(rec => {
      if (currentRecFilter === 'electronics') return rec.product.category === 'electronics';
      if (currentRecFilter === 'accessories') return rec.product.category === 'accessories';
      return true;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="padding: 40px; color: var(--text-muted); font-size: 13.5px; text-align: center; width: 100%;">No products found in this category.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(rec => {
    const p = rec.product;
    const imgUrl = getProductImageUrl(p.id);
    const naturalNote = getNaturalRecNote(rec);
    const merchant = p.source || 'Revify Direct';

    return `
      <article class="store-product-card" data-product-id="${p.id}">
        <div class="prod-hero-wrap">
          <img src="${imgUrl}" alt="${p.name}" class="prod-hero-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'">
          <span class="prod-hero-rating">★ ${p.rating || '4.8'}</span>
        </div>
        
        <div class="prod-body">
          <div class="prod-source">${merchant} &bull; ${p.category || 'Gear'}</div>

          <h3 class="prod-title" title="${p.name}">${p.name}</h3>

          <p class="prod-recommendation-note">${naturalNote}</p>

          <div class="prod-footer-row">
            <span class="prod-price">₹${p.price.toLocaleString('en-IN')}</span>
            <button class="prod-why-link" onclick="openWhyThisModal('${p.id}', '${encodeURIComponent(JSON.stringify(rec.whyThisReasons || []))}')">Why this?</button>
          </div>

          <button class="prod-add-btn" onclick="addItemToCart('${p.id}', 1, false, false)" title="Add ${p.name} to cart">
            + Add to Cart
          </button>
        </div>
      </article>
    `;
  }).join('');
}

// =============================================================
// 1.3 CUSTOMER ORDER HISTORY MODAL CONTROLLER
// =============================================================
function setupCustomerOrdersModal() {
  const closeBtn = document.getElementById('btn-close-customer-orders');
  const footerCloseBtn = document.getElementById('btn-close-customer-orders-footer');
  const switchAccountBtn = document.getElementById('btn-orders-switch-account');
  const modal = document.getElementById('modal-customer-orders');

  closeBtn?.addEventListener('click', () => modal?.classList.remove('active'));
  footerCloseBtn?.addEventListener('click', () => modal?.classList.remove('active'));
  switchAccountBtn?.addEventListener('click', () => {
    modal?.classList.remove('active');
    openCustomerLoginModal('login');
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

// =============================================================
// 1.4 CUSTOMER LOGIN & AUTHENTICATION POP-UP MODAL CONTROLLER
// =============================================================
// =============================================================
// 1.4 CUSTOMER LOGIN & AUTHENTICATION POP-UP MODAL CONTROLLER
// =============================================================
function openCustomerLoginModal(defaultTab = 'login') {
  const modal = document.getElementById('modal-customer-login');
  if (!modal) return;

  const tabLogin = document.getElementById('tab-popup-login');
  const tabSignup = document.getElementById('tab-popup-signup');
  const formLogin = document.getElementById('form-popup-login');
  const formSignup = document.getElementById('form-popup-signup');
  const popupTitle = document.getElementById('auth-popup-title');
  const errBanner = document.getElementById('auth-popup-error');

  if (errBanner) {
    errBanner.style.display = 'none';
    errBanner.textContent = '';
  }
  document.querySelectorAll('.field-error-text').forEach(el => el.textContent = '');

  if (defaultTab === 'signup') {
    tabSignup?.classList.add('active');
    tabLogin?.classList.remove('active');
    if (formSignup) formSignup.style.display = 'block';
    if (formLogin) formLogin.style.display = 'none';
    if (popupTitle) popupTitle.textContent = 'Create Customer Account';
  } else {
    tabLogin?.classList.add('active');
    tabSignup?.classList.remove('active');
    if (formLogin) formLogin.style.display = 'block';
    if (formSignup) formSignup.style.display = 'none';
    if (popupTitle) popupTitle.textContent = currentCustomer ? `Switch Account (Signed in as ${currentCustomer.name.split(' ')[0]})` : 'Sign In to Revify';
  }

  modal.classList.add('active');
  modal.style.display = 'flex';
}

function closeCustomerLoginModal() {
  const modal = document.getElementById('modal-customer-login');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  const errBanner = document.getElementById('auth-popup-error');
  if (errBanner) {
    errBanner.style.display = 'none';
    errBanner.textContent = '';
  }
  document.querySelectorAll('.field-error-text').forEach(el => el.textContent = '');
}

window.openCustomerLoginModal = openCustomerLoginModal;
window.closeCustomerLoginModal = closeCustomerLoginModal;

function setupCustomerLoginModal() {
  const modal = document.getElementById('modal-customer-login');
  const closeBtn = document.getElementById('btn-close-customer-login-modal');
  const footerCloseBtn = document.getElementById('btn-close-customer-login-footer');
  const tabLogin = document.getElementById('tab-popup-login');
  const tabSignup = document.getElementById('tab-popup-signup');
  const formLogin = document.getElementById('form-popup-login');
  const formSignup = document.getElementById('form-popup-signup');
  const popupTitle = document.getElementById('auth-popup-title');
  const errBanner = document.getElementById('auth-popup-error');

  function clearErrors() {
    if (errBanner) {
      errBanner.style.display = 'none';
      errBanner.textContent = '';
    }
    document.querySelectorAll('.field-error-text').forEach(el => el.textContent = '');
  }

  function setTab(tab) {
    clearErrors();
    if (tab === 'signup') {
      tabSignup?.classList.add('active');
      tabLogin?.classList.remove('active');
      if (formSignup) formSignup.style.display = 'block';
      if (formLogin) formLogin.style.display = 'none';
      if (popupTitle) popupTitle.textContent = 'Create Customer Account';
    } else {
      tabLogin?.classList.add('active');
      tabSignup?.classList.remove('active');
      if (formLogin) formLogin.style.display = 'block';
      if (formSignup) formSignup.style.display = 'none';
      if (popupTitle) popupTitle.textContent = 'Sign In to Revify';
    }
  }

  // Close popup triggers
  closeBtn?.addEventListener('click', closeCustomerLoginModal);
  footerCloseBtn?.addEventListener('click', closeCustomerLoginModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeCustomerLoginModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      closeCustomerLoginModal();
    }
  });

  // Tab switcher
  tabLogin?.addEventListener('click', () => setTab('login'));
  tabSignup?.addEventListener('click', () => setTab('signup'));

  // Live input error reset
  ['popup-login-email', 'popup-login-password', 'popup-signup-name', 'popup-signup-email', 'popup-signup-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      clearErrors();
    });
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Real Database-Backed Login
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('popup-login-email')?.value.trim();
    const password = document.getElementById('popup-login-password')?.value;

    let hasError = false;
    if (!email || !emailRegex.test(email)) {
      const err = document.getElementById('error-login-email');
      if (err) err.textContent = 'Please enter a valid email address.';
      hasError = true;
    }
    if (!password || password.length < 6) {
      const err = document.getElementById('error-login-password');
      if (err) err.textContent = 'Password must be at least 6 characters.';
      hasError = true;
    }
    if (hasError) return;

    const submitBtn = document.getElementById('btn-popup-submit-login');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In →';
      }

      if (data.success && data.user) {
        setAuthenticatedCustomer(data.user, data.mandate || null);
        closeCustomerLoginModal();
        window.switchAppView('view-shopping');
        appendChatBubble('Shopping Assistant', `Welcome back, **${data.user.name}**! Your account and active spend mandates have been verified.`, 'assistant');
      } else {
        if (errBanner) {
          errBanner.textContent = data.error || 'Invalid email or password.';
          errBanner.style.display = 'block';
        }
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In →';
      }
      if (errBanner) {
        errBanner.textContent = 'Network error during login: ' + err.message;
        errBanner.style.display = 'block';
      }
    }
  });

  // Real Database-Backed Registration
  formSignup?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById('popup-signup-name')?.value.trim();
    const email = document.getElementById('popup-signup-email')?.value.trim();
    const password = document.getElementById('popup-signup-password')?.value;

    let hasError = false;
    if (!name || name.length < 2) {
      const err = document.getElementById('error-signup-name');
      if (err) err.textContent = 'Full name is required (min. 2 characters).';
      hasError = true;
    }
    if (!email || !emailRegex.test(email)) {
      const err = document.getElementById('error-signup-email');
      if (err) err.textContent = 'Please enter a valid email address.';
      hasError = true;
    }
    if (!password || password.length < 6) {
      const err = document.getElementById('error-signup-password');
      if (err) err.textContent = 'Password must be at least 6 characters.';
      hasError = true;
    }
    if (hasError) return;

    const submitBtn = document.getElementById('btn-popup-submit-signup');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account →';
      }

      if (data.success && data.user) {
        setAuthenticatedCustomer(data.user, data.mandate || null);
        closeCustomerLoginModal();
        window.switchAppView('view-shopping');
        appendChatBubble('Shopping Assistant', `Welcome to Revify, **${data.user.name}**! Your account is created and secured with bcrypt.`, 'assistant');
      } else {
        if (errBanner) {
          errBanner.textContent = data.error || 'Registration failed.';
          errBanner.style.display = 'block';
        }
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account →';
      }
      if (errBanner) {
        errBanner.textContent = 'Network error during registration: ' + err.message;
        errBanner.style.display = 'block';
      }
    }
  });
}

async function openCustomerOrderHistory() {
  const modal = document.getElementById('modal-customer-orders');
  const body = document.getElementById('customer-orders-body');
  const title = document.getElementById('orders-modal-title');
  if (!modal || !body) return;

  if (!currentCustomer) {
    alert('Please sign in or create an account to view your order history.');
    window.switchAppView('view-customer-auth');
    return;
  }

  if (title) title.textContent = `${currentCustomer.name}'s Orders & Razorpay Settlements`;
  body.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted);">Loading confirmed orders...</div>`;
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/customer/orders?customerId=${currentCustomer.id}`);
    const data = await res.json();
    const orders = data.orders || [];

    if (orders.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 36px 12px; color: var(--text-muted);">
          <span style="font-size: 32px; display: block; margin-bottom: 8px;">🛒</span>
          <p class="font-bold" style="font-size: 15px; margin-bottom: 4px;">No orders placed yet</p>
          <p style="font-size: 13px;">Add products from our recommendations or conversational AI assistant to experience test checkout!</p>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="order-history-list">
        ${orders.map(o => `
          <div class="order-history-card">
            <div class="oh-header">
              <div>
                <span class="oh-id">#${o.id}</span>
                <span class="oh-date">&bull; ${new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <span class="oh-status">✓ ${o.payment_status || 'PAID'}</span>
            </div>

            <div class="oh-items-list">
              ${(o.items || []).map(i => `
                <div class="oh-item-row">
                  <span>${i.name} &times; ${i.quantity || 1}</span>
                  <span class="font-mono font-bold">₹${((i.price || 0) * (i.quantity || 1)).toLocaleString('en-IN')}</span>
                </div>
              `).join('')}
            </div>

            <div class="oh-total-row">
              <div>
                <span class="oh-payment-badge">Method: ${o.payment_method || 'Razorpay Test Card'}</span>
                ${o.razorpay_payment_id ? `<div class="font-mono" style="font-size: 10.5px; color: var(--text-muted);">Payment ID: ${o.razorpay_payment_id}</div>` : ''}
              </div>
              <div class="font-mono" style="font-size: 16px; color: var(--purple-deep);">Total: ₹${(o.total || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color: var(--pastel-crimson-text); padding: 16px;">Error loading order history: ${err.message}</div>`;
  }
}

// Global subview switcher for navigation links
window.switchMerchantSubview = function(subviewId) {
  const sideNavBtns = document.querySelectorAll('.side-nav-btn');
  const subViews = document.querySelectorAll('.sub-view');

  sideNavBtns.forEach(b => b.classList.remove('active'));
  subViews.forEach(v => v.classList.remove('active'));

  const targetBtn = document.querySelector(`.side-nav-btn[data-subview="${subviewId}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  const targetSub = document.getElementById(subviewId);
  if (targetSub) targetSub.classList.add('active');

  // If switching to view-merchant from another view, ensure view-merchant is active
  const merchantView = document.getElementById('view-merchant');
  if (merchantView && !merchantView.classList.contains('active')) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-switch-btn').forEach(b => b.classList.remove('active'));
    merchantView.classList.add('active');
    document.getElementById('btn-nav-merchant')?.classList.add('active');
  }
};

// =============================================================
// 2. MERCHANT PORTAL SUB-VIEWS
// =============================================================
function setupMerchantSubviews() {
  const sideNavBtns = document.querySelectorAll('.side-nav-btn');

  sideNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      window.switchMerchantSubview(btn.dataset.subview);
    });
  });

  document.getElementById('btn-refresh-overview')?.addEventListener('click', refreshMerchantData);
  document.getElementById('btn-refresh-insights')?.addEventListener('click', refreshMerchantData);
  document.getElementById('btn-reset-demo')?.addEventListener('click', async () => {
    if (confirm('Reset store demo state back to seeded baseline?')) {
      try {
        await fetch('/api/merchant/reset', { method: 'POST' });
        refreshMerchantData();
        refreshCart();
        alert('Demo state reset successfully.');
      } catch (e) {
        console.error('Reset error:', e);
      }
    }
  });
}

// =============================================================
// 3. AI SHOPPING EXPERIENCE (CHAT, MEMORY & RECOMMENDATIONS)
// =============================================================
function setupShoppingChat() {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const streamChatForm = document.getElementById('stream-chat-form');
  const streamChatInput = document.getElementById('stream-chat-input');
  const streamSendBtn = document.getElementById('btn-stream-send');
  const promptChips = document.querySelectorAll('.prompt-chip');

  // Hero search form submission
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleUserMessageSubmission(chatInput ? chatInput.value : '');
    });
  }

  // Sticky conversation composer form submission & send button
  if (streamChatForm) {
    streamChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = streamChatInput ? streamChatInput.value : '';
      if (msg && msg.trim()) {
        handleUserMessageSubmission(msg);
      }
    });
  }

  streamSendBtn?.addEventListener('click', (e) => {
    // Allows direct button click or form submit
    const msg = streamChatInput ? streamChatInput.value : '';
    if (msg && msg.trim()) {
      e.preventDefault();
      handleUserMessageSubmission(msg);
    }
  });

  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      handleUserMessageSubmission(chip.dataset.prompt);
    });
  });

  // Wire quick voice suggestion prompts tray
  document.querySelectorAll('.btn-voice-prompt').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.voiceCmd;
      if (cmd) {
        if (voiceControllerInstance) {
          voiceControllerInstance.simulateVoiceCommand(cmd);
        } else {
          handleUserMessageSubmission(cmd);
        }
      }
    });
  });
}

function setupSessionMemory() {
  const clearBtn = document.getElementById('btn-clear-memory');
  clearBtn?.addEventListener('click', async () => {
    try {
      await fetch(`/api/shopping/session/context?sessionId=${currentSessionId}`, { method: 'DELETE' });
      refreshSessionMemory();
      appendChatBubble('Shopping Assistant', 'Shopping context reset. Feel free to ask about any category of electronics!', 'assistant');
    } catch (e) {
      console.error('Clear memory error:', e);
    }
  });
}

async function refreshSessionMemory() {
  try {
    const res = await fetch(`/api/shopping/session/context?sessionId=${currentSessionId}`);
    const mem = await res.json();
    const textEl = document.getElementById('session-memory-text');
    if (textEl && mem) {
      textEl.innerHTML = `${mem.useCase || 'General'} &bull; Budget &le; ₹${(mem.budget || 5000).toLocaleString('en-IN')} &bull; ${mem.priority || 'High Quality'}`;
    }
  } catch (e) {
    console.error('Session memory fetch error:', e);
  }
}

/**
 * Main Message Dispatcher with High-Converting Voice & Chat Intent Parser
 */
async function handleUserMessageSubmission(messageText) {
  if (!messageText || !messageText.trim()) return;
  const cleanMsg = messageText.trim();
  lastUserIntent = cleanMsg;

  // Clear both hero search input and bottom conversation composer input
  const chatInput = document.getElementById('chat-input');
  if (chatInput) chatInput.value = '';
  const streamChatInput = document.getElementById('stream-chat-input');
  if (streamChatInput) streamChatInput.value = '';

  // Dismiss any voice error banners
  const errBanner = document.getElementById('composer-error-banner');
  if (errBanner) errBanner.style.display = 'none';

  // Stop active voice recording if user manually submitted
  if (voiceControllerInstance && voiceControllerInstance.state === 'LISTENING') {
    voiceControllerInstance.stopListening();
  }

  // Append user message bubble
  appendChatBubble('You', cleanMsg, 'user');

  const lower = cleanMsg.toLowerCase();

  // 1. DIRECT CONVERSATIONAL VOICE/TEXT COMMAND: "Proceed to Checkout" / "Checkout" / "Buy Now"
  if (lower === 'checkout' || lower === 'buy now' || lower.includes('proceed to checkout') || lower.includes('open cart') || lower.includes('pay now')) {
    if (cartData.items && cartData.items.length > 0) {
      appendChatBubble('Shopping Assistant', `Opening your cart with **${cartData.items.length} item(s)** (₹${cartData.total.toLocaleString('en-IN')}) and initiating secure Razorpay checkout...`, 'assistant');
      openCartDrawer();
      setTimeout(() => window.triggerCheckoutFlow(), 400);
      return;
    } else {
      appendChatBubble('Shopping Assistant', 'Your shopping cart is currently empty! Search our catalog or choose an item below to begin checkout.', 'assistant');
      return;
    }
  }

  // 2. DIRECT CONVERSATIONAL VOICE/TEXT COMMAND: "Add to cart" / "Add headphones" / "Add companion"
  const isAddCommand = lower === 'add to cart' || lower === 'add this' || lower === 'buy this' || lower.includes('add to cart') || lower.includes('add it') || lower.includes('add the case') || lower.includes('add companion') || lower.includes('add accessory');
  
  if (isAddCommand) {
    let targetProductId = null;
    let isCross = false;

    if ((lower.includes('case') || lower.includes('companion') || lower.includes('accessory')) && latestRecommendedCrossSell) {
      targetProductId = latestRecommendedCrossSell.id;
      isCross = true;
    } else if (latestRecommendedCrossSell && (lower.includes('add the case') || lower.includes('add companion'))) {
      targetProductId = latestRecommendedCrossSell.id;
      isCross = true;
    } else {
      // Default to top recommended product or seeded ANC headphones
      targetProductId = 'prod_anc_headphones';
    }

    if (targetProductId) {
      await window.addItemToCart(targetProductId, 1, false, isCross);
      const reply = `I've added the item to your cart! Your updated subtotal is **₹${cartData.total.toLocaleString('en-IN')}**. You can click **Checkout** below or continue browsing.`;
      latestAIResponseText = reply;
      return;
    }
  }

  // Show dynamic typing / reasoning indicator
  const loadingId = appendTypingIndicator('AI is searching catalog & evaluating best offers...');

  try {
    const res = await fetch('/api/shopping/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: cleanMsg,
        sessionId: currentSessionId,
        customerId: currentCustomer ? currentCustomer.id : null
      })
    });

    const data = await res.json();
    removeChatBubble(loadingId);

    // Update Agent status pill
    updateAgentStatusPill(data.agentStatus);

    // Save latest AI response for text-to-speech
    latestAIResponseText = data.reply || '';

    // Cache latest recommended cross-sell for conversational follow-ups
    if (data.upsellAndCrossSell?.crossSells && data.upsellAndCrossSell.crossSells.length > 0) {
      latestRecommendedCrossSell = data.upsellAndCrossSell.crossSells[0].product;
    }

    currentSmartCartOpportunity = data.smartCartOpportunity;

    // Render interactive assistant response with rich in-bubble product card & conversion pills
    appendAssistantChatResponse(data);

    // Refresh active session memory display
    refreshSessionMemory();

    // Dynamically refresh top recommendations as new signals arrive
    loadTopRecommendations();

    // Render Dynamic Showcase cards on right column
    renderShowcaseFeed(data);
  } catch (err) {
    removeChatBubble(loadingId);
    appendChatBubble('Shopping Assistant', 'Sorry, I encountered an issue connecting to the merchant feed. Please try again.', 'assistant');
  }
}

/**
 * Render Rich Assistant Chat Bubble with Interactive In-Bubble Conversion Cards & Action Pills
 */
function appendAssistantChatResponse(data) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return null;

  const bubbleId = 'bubble_' + Date.now();
  const bubble = document.createElement('div');
  bubble.id = bubbleId;
  bubble.className = 'chat-bubble bubble-assistant';

  let productCardHtml = '';
  let bundleCardHtml = '';
  let pillsHtml = '';

  const primaryRec = (data.recommendations && data.recommendations.length > 0) ? data.recommendations[0] : null;
  const p = primaryRec ? primaryRec.product : null;

  // 1. In-Bubble Interactive Product Card
  if (p) {
    const imgUrl = getProductImageUrl(p.id);
    const brand = p.source || p.brand || 'Revify Direct';
    const rating = p.rating || '4.8';
    const priceFormatted = `₹${p.price.toLocaleString('en-IN')}`;

    productCardHtml = `
      <div class="chat-product-card" data-product-id="${p.id}">
        <div class="cpc-header">
          <span class="cpc-badge">✦ Recommended For You</span>
          <span class="cpc-rating">★ ${rating}</span>
        </div>
        <div class="cpc-body">
          <img src="${imgUrl}" alt="${p.name}" class="cpc-thumb" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'">
          <div class="cpc-info">
            <div class="cpc-title">${p.name}</div>
            <div class="cpc-source">${brand} &bull; Verified In-Stock</div>
            <div class="cpc-price-wrap">
              <span class="cpc-price">${priceFormatted}</span>
            </div>
          </div>
        </div>
        <div class="cpc-actions">
          <button type="button" class="cpc-btn-add" onclick="window.addItemToCart('${p.id}', 1, false, false)" title="Add to cart">
            <span>+ Add to Cart</span>
          </button>
          <button type="button" class="cpc-btn-buynow" onclick="window.quickBuyNow('${p.id}')" title="Buy now with 1-click checkout">
            <span>⚡ Buy Now</span>
          </button>
        </div>
      </div>
    `;
  }

  // 2. In-Bubble Special Bundle / Negotiation Card
  if (data.negotiation) {
    if (data.negotiation.allowed) {
      bundleCardHtml = `
        <div class="chat-bundle-card">
          <div class="cbc-header">
            <span class="cbc-tag">🎉 Discount Approved</span>
            <span class="cbc-savings">Save ₹${(data.negotiation.originalPrice - data.negotiation.targetPrice).toLocaleString('en-IN')}</span>
          </div>
          <div class="cbc-title">${data.negotiation.productName || 'Negotiated Price'}</div>
          <div class="cbc-desc">${data.negotiation.explanation}</div>
          <div class="cbc-footer">
            <span class="cbc-price">₹${data.negotiation.targetPrice.toLocaleString('en-IN')}</span>
            <button type="button" class="cbc-btn-accept" onclick="window.addItemToCart('${data.negotiation.productId}', 1, false, false)">
              Accept Offer &amp; Add &rarr;
            </button>
          </div>
        </div>
      `;
    } else if (data.negotiation.bundleAlternative) {
      const b = data.negotiation.bundleAlternative;
      bundleCardHtml = `
        <div class="chat-bundle-card">
          <div class="cbc-header">
            <span class="cbc-tag">🎁 Special Bundle Alternative</span>
            <span class="cbc-savings">Save ₹${b.totalSavings.toLocaleString('en-IN')}</span>
          </div>
          <div class="cbc-title">${b.bundleName}</div>
          <div class="cbc-desc">${b.explanation || 'Special bundle pricing with complimentary accessory.'}</div>
          <div class="cbc-footer">
            <span class="cbc-price">₹${b.specialBundlePrice.toLocaleString('en-IN')}</span>
            <button type="button" class="cbc-btn-accept" onclick="window.applyBundleDiscount('${b.bundleItems[0].id}', '${b.bundleItems[1].id}', ${b.totalSavings})">
              Claim Bundle Deal &rarr;
            </button>
          </div>
        </div>
      `;
    }
  }

  // 3. Contextual Quick-Reply Conversion Action Pills
  const pills = [];
  if (p) {
    pills.push({ label: `🛒 Add to Cart`, action: `window.addItemToCart('${p.id}', 1, false, false)`, primary: true });
    pills.push({ label: `⚡ Buy Now`, action: `window.quickBuyNow('${p.id}')`, primary: false });
  }

  if (data.upsellAndCrossSell?.crossSells && data.upsellAndCrossSell.crossSells.length > 0) {
    const cs = data.upsellAndCrossSell.crossSells[0].product;
    pills.push({ label: `💼 + ${cs.name.split(' ').slice(0, 3).join(' ')} (₹${cs.price})`, action: `window.addItemToCart('${cs.id}', 1, false, true)`, deal: true });
  }

  if (data.upsellAndCrossSell?.upsell) {
    const up = data.upsellAndCrossSell.upsell.product;
    pills.push({ label: `👑 Compare Pro (₹${up.price.toLocaleString('en-IN')})`, action: `handleUserMessageSubmission('Tell me about the ${up.name}')`, primary: false });
  }

  if (!data.negotiation && p && p.price > 4000) {
    pills.push({ label: `🏷️ Negotiate ₹4,000`, action: `handleUserMessageSubmission('Can you make it ₹4,000?')`, primary: false });
  }

  if (cartData.items && cartData.items.length > 0) {
    pills.push({ label: `🛍️ Proceed to Checkout (${cartData.items.length}) →`, action: `window.triggerCheckoutFlow()`, primary: true });
  }

  if (pills.length > 0) {
    pillsHtml = `
      <div class="chat-action-pills">
        ${pills.map(pi => `
          <button type="button" class="chat-action-pill ${pi.primary ? 'pill-primary' : ''} ${pi.deal ? 'pill-deal' : ''}" onclick="${pi.action}">
            ${pi.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  bubble.innerHTML = `
    <div class="bubble-sender">Shopping Assistant</div>
    <div class="bubble-text">${formatMarkdown(data.reply || '')}</div>
    ${productCardHtml}
    ${bundleCardHtml}
    ${pillsHtml}
  `;

  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
  return bubbleId;
}

function appendChatBubble(sender, text, type) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return null;

  const bubbleId = 'bubble_' + Date.now();
  const bubble = document.createElement('div');
  bubble.id = bubbleId;
  bubble.className = `chat-bubble bubble-${type}`;
  bubble.innerHTML = `
    <div class="bubble-sender">${sender}</div>
    <div class="bubble-text">${formatMarkdown(text)}</div>
  `;

  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
  return bubbleId;
}

function appendTypingIndicator(statusText = 'AI is searching...') {
  const stream = document.getElementById('chat-stream');
  if (!stream) return null;

  const bubbleId = 'typing_' + Date.now();
  const bubble = document.createElement('div');
  bubble.id = bubbleId;
  bubble.className = 'chat-typing-bubble';
  bubble.innerHTML = `
    <div class="typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
    <span>${statusText}</span>
  `;

  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;
  return bubbleId;
}

function appendInChatCartConfirmation(item, total) {
  const stream = document.getElementById('chat-stream');
  if (!stream) return;

  const banner = document.createElement('div');
  banner.className = 'chat-cart-confirm-banner';
  banner.innerHTML = `
    <div class="ccc-info">
      <span class="ccc-icon">✓</span>
      <div>
        <div class="ccc-text">Added <strong>${item.name}</strong> to your cart!</div>
        <div style="font-size: 11px; color: #15803d;">Cart Total: <strong>₹${total.toLocaleString('en-IN')}</strong></div>
      </div>
    </div>
    <div class="ccc-actions">
      <button type="button" class="ccc-btn-view" onclick="openCartDrawer()">View Cart</button>
      <button type="button" class="ccc-btn-checkout" onclick="window.triggerCheckoutFlow()">
        <span>⚡ Checkout</span>
        <span>&rarr;</span>
      </button>
    </div>
  `;

  stream.appendChild(banner);
  stream.scrollTop = stream.scrollHeight;
}

function removeChatBubble(bubbleId) {
  const el = document.getElementById(bubbleId);
  if (el) el.remove();
}

function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// =============================================================
// 4. ADVANCED SPEECH-TO-TEXT (STT) & VOICE COMMERCE ENGINE
// =============================================================
class RobustVoiceInputController {
  constructor() {
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = null;
    this.state = 'IDLE';

    this.accumulatedFinal = '';
    this.currentInterim = '';
    this.silenceTimer = null;
    this.silenceDurationMs = 2400;
    this.preferredLang = 'en-IN';
    this.targetInputId = 'stream-chat-input';

    // Sticky conversation composer elements
    this.streamMicBtn = document.getElementById('btn-stream-mic');
    this.streamMicIcon = document.getElementById('stream-mic-icon');
    this.streamInput = document.getElementById('stream-chat-input');
    this.composerStatus = document.getElementById('composer-voice-status');
    this.composerStatusText = document.getElementById('composer-voice-state-text');
    this.composerStopBtn = document.getElementById('btn-composer-voice-stop');
    this.composerErrorBanner = document.getElementById('composer-error-banner');
    this.composerErrorText = document.getElementById('composer-error-text');
    this.composerDismissErrorBtn = document.getElementById('btn-dismiss-error');

    // Hero search voice controls (preserved)
    this.micBtn = document.getElementById('btn-toggle-mic');
    this.micIcon = document.getElementById('mic-icon');
    this.voiceBanner = document.getElementById('voice-status-banner');
    this.voiceLabel = document.getElementById('voice-status-label');
    this.voiceLiveText = document.getElementById('voice-live-text');
    this.voicePromptsTray = document.getElementById('voice-quick-prompts-tray');
    this.cancelBtn = document.getElementById('btn-cancel-voice');
    this.chatInput = document.getElementById('chat-input');

    this.setupListeners();
  }

  isSupported() {
    return !!this.SpeechRecognition;
  }

  setupListeners() {
    // Fixed / Sticky composer microphone trigger
    this.streamMicBtn?.addEventListener('click', () => {
      if (this.state === 'LISTENING') {
        this.stopListening();
      } else {
        this.startListening('stream-chat-input');
      }
    });

    // Stop listening button in sticky status bar
    this.composerStopBtn?.addEventListener('click', () => {
      this.stopListening();
    });

    // Dismiss error banner button
    this.composerDismissErrorBtn?.addEventListener('click', () => {
      if (this.composerErrorBanner) this.composerErrorBanner.style.display = 'none';
    });

    // Hero search microphone trigger
    this.micBtn?.addEventListener('click', () => {
      if (this.state === 'LISTENING') {
        this.stopListening();
      } else {
        this.startListening('chat-input');
      }
    });

    this.cancelBtn?.addEventListener('click', () => {
      this.stopListening();
    });
  }

  getTargetInput() {
    if (this.targetInputId === 'chat-input') {
      return this.chatInput || this.streamInput;
    }
    return this.streamInput || this.chatInput;
  }

  showError(msg) {
    if (this.composerErrorBanner && this.composerErrorText) {
      this.composerErrorText.textContent = msg;
      this.composerErrorBanner.style.display = 'flex';
    } else {
      alert(msg);
    }
  }

  hideError() {
    if (this.composerErrorBanner) {
      this.composerErrorBanner.style.display = 'none';
    }
  }

  startListening(targetInputId = 'stream-chat-input') {
    this.targetInputId = targetInputId;
    this.hideError();

    if (!this.isSupported()) {
      if (this.voicePromptsTray) this.voicePromptsTray.style.display = 'flex';
      this.showError('Speech recognition is not natively supported in this browser. Please type your message.');
      return;
    }

    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.recognition = null;
    }

    try {
      this.recognition = new this.SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.preferredLang;

      this.accumulatedFinal = '';
      this.currentInterim = '';

      this.recognition.onstart = () => {
        this.setState('LISTENING');
        this.resetSilenceTimer();
        this.updateLiveDisplay('Listening... Speak now');
      };

      this.recognition.onresult = (event) => {
        this.resetSilenceTimer();

        let finalConcat = '';
        let interimConcat = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0].transcript;
          if (res.isFinal) {
            finalConcat += ' ' + transcript;
          } else {
            interimConcat += ' ' + transcript;
          }
        }

        this.accumulatedFinal = finalConcat.trim();
        this.currentInterim = interimConcat.trim();

        // Accurately transcribe spoken words directly into the typing field for review/editing
        const fullDisplay = (this.accumulatedFinal + ' ' + this.currentInterim).trim();
        if (fullDisplay) {
          const target = this.getTargetInput();
          if (target) {
            target.value = fullDisplay;
            target.focus();
          }
          this.updateLiveDisplay(`"${fullDisplay}"`);
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          // User paused speaking; keep words transcribed and smoothly return to idle
          this.stopListening();
          return;
        }

        if (event.error === 'language-not-supported' && this.preferredLang === 'en-IN') {
          this.preferredLang = 'en-US';
          this.startListening(this.targetInputId);
          return;
        }

        this.clearSilenceTimer();
        this.setState('IDLE');

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.showError('Microphone access was denied. Please allow microphone permissions in browser settings.');
          if (this.voicePromptsTray) this.voicePromptsTray.style.display = 'flex';
        } else if (event.error === 'audio-capture') {
          this.showError('No microphone hardware detected. Please connect a microphone or type your message.');
        } else if (event.error === 'network') {
          this.showError('Speech recognition network error. Please try again or type your message.');
        } else {
          this.showError('Speech recognition was interrupted. You can review/edit the text and click Send.');
        }
      };

      this.recognition.onend = () => {
        this.clearSilenceTimer();
        this.setState('IDLE');
      };

      this.recognition.start();
    } catch (err) {
      this.setState('IDLE');
      this.showError('Unable to access microphone. Please type your message.');
    }
  }

  resetSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.state === 'LISTENING') {
        this.stopListening();
      }
    }, this.silenceDurationMs);
  }

  clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  stopListening() {
    this.clearSilenceTimer();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.setState('IDLE');
  }

  cancelListening() {
    this.clearSilenceTimer();
    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.recognition = null;
    }
    this.setState('IDLE');
  }

  /**
   * 1-Click Simulated Voice Query Runner (For voice chips, automated testing, and headless environments)
   */
  simulateVoiceCommand(commandText) {
    if (!commandText) return;
    const target = this.getTargetInput();
    if (target) target.value = commandText;
    this.setState('LISTENING');
    this.updateLiveDisplay(`"${commandText}"`);

    setTimeout(() => {
      this.setState('IDLE');
      handleUserMessageSubmission(commandText);
    }, 400);
  }

  setState(newState) {
    this.state = newState;

    if (newState === 'LISTENING') {
      if (this.streamMicBtn) this.streamMicBtn.classList.add('listening');
      if (this.micBtn) this.micBtn.classList.add('listening');
      if (this.streamMicIcon) this.streamMicIcon.textContent = '⏹️';
      if (this.micIcon) this.micIcon.textContent = '🎙';

      if (this.composerStatus) this.composerStatus.style.display = 'flex';
      if (this.composerStatusText) this.composerStatusText.textContent = 'Listening... Speak now';
      if (this.voiceBanner) this.voiceBanner.style.display = 'flex';
      if (this.voicePromptsTray) this.voicePromptsTray.style.display = 'flex';
      if (this.voiceLabel) this.voiceLabel.textContent = 'LISTENING...';
    } else {
      if (this.streamMicBtn) this.streamMicBtn.classList.remove('listening');
      if (this.micBtn) this.micBtn.classList.remove('listening');
      if (this.streamMicIcon) this.streamMicIcon.textContent = '🎙️';
      if (this.micIcon) this.micIcon.textContent = '🎤';

      if (this.composerStatus) this.composerStatus.style.display = 'none';
      if (this.voiceBanner) this.voiceBanner.style.display = 'none';
    }
  }

  updateLiveDisplay(text) {
    if (this.voiceLiveText) {
      this.voiceLiveText.textContent = text;
    }
    if (this.composerStatusText && this.state === 'LISTENING') {
      this.composerStatusText.textContent = 'Listening: ' + text;
    }
  }
}

function sanitizeCommerceVoiceTranscript(raw) {
  if (!raw) return '';
  let text = raw.trim();

  text = text.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  const phoneticReplacements = [
    [/\b(?:why\s*are\s*less|wide\s*headphone|wire\s*less|wirelesss)\b/gi, 'wireless'],
    [/\b(?:head\s*phones?|ear\s*phones?)\b/gi, 'headphones'],
    [/\b(?:a\s*n\s*c|a\s*and\s*c|and\s*c)\b/gi, 'ANC'],
    [/\b(?:noise\s*cancel(?:l?ation)?|noise\s*cancelling|noise\s*canceling)\b/gi, 'noise cancellation'],
    [/\b(?:travel\s*keys|travel\s*chase|trouble\s*case|travel\s*casing)\b/gi, 'travel case'],
    [/\b(?:called\s*cable|cold\s*cable|coyled\s*cable|coil\s*cable)\b/gi, 'coiled cable'],
    [/\b(?:desk\s*met|desk\s*match|deskmate)\b/gi, 'desk mat'],
    [/\b(?:type\s*c|usb\s*c\s*hub|docking\s*station)\b/gi, 'USB-C hub'],
    [/\b(?:key\s*craft|key\s*board|mech\s*keyboard)\b/gi, 'mechanical keyboard'],
    [/\bfive\s*thousand\s*(?:rupees|inr|rs)?\b/gi, '₹5,000'],
    [/\bfour\s*thousand\s*(?:rupees|inr|rs)?\b/gi, '₹4,000'],
    [/\bthree\s*thousand\s*(?:rupees|inr|rs)?\b/gi, '₹3,000'],
    [/\btwo\s*thousand\s*(?:rupees|inr|rs)?\b/gi, '₹2,000'],
    [/\bten\s*thousand\s*(?:rupees|inr|rs)?\b/gi, '₹10,000'],
    [/\bfifteen\s*thousand\s*(?:rupees|inr|rs)?\b/gi, '₹15,000'],
    [/\btwenty\s*thousand\s*(?:rupees|inr|rs)?\b/gi, '₹20,000'],
    [/\bfifteen\s*hundred\b/gi, '₹1,500'],
    [/\beight\s*hundred\b/gi, '₹800'],
    [/\bfive\s*hundred\b/gi, '₹500'],
    [/\bseven\s*hundred\s*ninety\s*nine\b/gi, '₹799'],
    [/\bforty\s*four\s*ninety\s*nine\b/gi, '₹4,499']
  ];

  for (const [pattern, replacement] of phoneticReplacements) {
    text = text.replace(pattern, replacement);
  }

  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

let voiceControllerInstance = null;

function setupVoiceAndSpeakerControls() {
  voiceControllerInstance = new RobustVoiceInputController();

  const speakerBtn = document.getElementById('btn-toggle-speaker');
  const speakerIcon = document.getElementById('speaker-icon');
  const speakerStatusText = document.getElementById('speaker-status-text');

  speakerBtn?.addEventListener('click', () => {
    if (!window.speechSynthesis) {
      alert('Voice playback (Text-to-Speech) is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      stopSpeaking();
      return;
    }

    if (!latestAIResponseText) {
      alert('No AI response available to read aloud.');
      return;
    }

    const speechText = cleanTextForSpeech(latestAIResponseText);
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en')) || null;
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      isSpeaking = true;
      if (speakerBtn) speakerBtn.classList.add('speaking');
      if (speakerIcon) speakerIcon.textContent = '🔊';
      if (speakerStatusText) speakerStatusText.textContent = 'Playing...';
    };

    utterance.onend = () => {
      stopSpeaking();
    };

    utterance.onerror = () => {
      stopSpeaking();
    };

    window.speechSynthesis.speak(utterance);
  });

  function stopSpeaking() {
    isSpeaking = false;
    if (speakerBtn) speakerBtn.classList.remove('speaking');
    if (speakerIcon) speakerIcon.textContent = '🔊';
    if (speakerStatusText) speakerStatusText.textContent = 'Listen';
  }

  function cleanTextForSpeech(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/₹(\d+[\d,]*)/g, '$1 rupees')
      .replace(/•/g, '')
      .replace(/&bull;/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/#\w+/g, '')
      .replace(/(\r\n|\n|\r)/gm, ' ')
      .trim();
  }
}

// =============================================================
// 5. DYNAMIC PRODUCT SHOWCASE & "WHY THIS?" EXPLAINER
// =============================================================
function renderShowcaseFeed(chatResponse) {
  const container = document.getElementById('showcase-feed');
  if (!container) return;

  if (chatResponse.agentStatus === 'PAUSED') {
    container.innerHTML = `
      <div class="companion-ecommerce-card" style="border-left: 3px solid #dc2626; background: #fff5f5;">
        <span class="companion-context-label" style="color: #dc2626;">NOTICE</span>
        <h4 class="companion-prod-name">Purchasing Temporarily Paused</h4>
        <p class="companion-prod-reason">The store has paused real-time checkout while catalog updates take place.</p>
      </div>
    `;
    return;
  }

  let html = '';

  // 1. Render Discovered Products
  if (chatResponse.recommendations && chatResponse.recommendations.length > 0) {
    html += `<div class="discovered-products-container">`;
    html += chatResponse.recommendations.map(rec => {
      const p = rec.product;
      const imgUrl = getProductImageUrl(p.id);
      const naturalNote = rec.explanation || 'Recommended for your preferences';
      const merchant = p.source || p.brand || 'Revify Direct';

      return `
        <div class="discovered-product-card" data-product-id="${p.id}">
          <img src="${imgUrl}" alt="${p.name}" class="discovered-thumb" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'">

          <div class="discovered-info">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="discovered-brand">${merchant} &bull; ★ ${p.rating || '4.8'}</span>
              <button class="prod-why-link" onclick="openWhyThisModal('${p.id}', '${encodeURIComponent(JSON.stringify(rec.whyThisReasons || []))}')">Why this? &rarr;</button>
            </div>
            <h4 class="discovered-title">${p.name}</h4>
            <p class="discovered-reason">${naturalNote}</p>
            
            <div class="discovered-bottom-row">
              <span class="discovered-price">₹${p.price.toLocaleString('en-IN')}</span>
              <button class="btn-discovered-add" onclick="addItemToCart('${p.id}', 1, false, false)">
                + Add to Cart
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    html += `</div>`;
  }

  // 2. Render Companion Cross-Sell / Upsell seamlessly into shopping journey
  if (chatResponse.upsellAndCrossSell) {
    const { upsell, crossSells } = chatResponse.upsellAndCrossSell;

    if (crossSells && crossSells.length > 0) {
      const cs = crossSells[0];
      const csImg = getProductImageUrl(cs.product.id);
      html += `
        <div class="companion-ecommerce-card">
          <div class="companion-header-line">
            <span>✦ Complete your travel setup</span>
          </div>
          <div class="companion-item-body">
            <img src="${csImg}" alt="${cs.product.name}" class="companion-thumb" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'">
            <div class="companion-details">
              <h4 class="companion-name">${cs.product.name}</h4>
              <p class="companion-pitch">${cs.explanation || 'Pairs well with your headphones'}</p>
            </div>
          </div>
          <div class="companion-action-row">
            <span class="companion-price">₹${cs.product.price.toLocaleString('en-IN')}</span>
            <button class="btn-add-companion" onclick="addItemToCart('${cs.product.id}', 1, false, true)">
              + Add Companion
            </button>
          </div>
        </div>
      `;
    }

    if (upsell) {
      const upImg = getProductImageUrl(upsell.product.id);
      html += `
        <div class="upgrade-ecommerce-card">
          <div class="upgrade-header-line">
            <span>✦ Flagship Upgrade</span>
          </div>
          <div class="companion-item-body">
            <img src="${upImg}" alt="${upsell.product.name}" class="companion-thumb" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'">
            <div class="companion-details">
              <h4 class="companion-name">${upsell.product.name}</h4>
              <p class="companion-pitch">${upsell.explanation || 'Enhanced active noise cancelling and premium materials.'}</p>
            </div>
          </div>
          <div class="companion-action-row">
            <span class="companion-price">₹${upsell.product.price.toLocaleString('en-IN')}</span>
            <button class="btn-upgrade-action" onclick="addItemToCart('${upsell.product.id}', 1, true, false)">
              Choose Flagship
            </button>
          </div>
        </div>
      `;
    }
  }

  // 3. Render Negotiation Result (Clean commerce bundle offer)
  if (chatResponse.negotiation && chatResponse.negotiation.bundleAlternative) {
    const b = chatResponse.negotiation.bundleAlternative;
    html += `
      <div class="bundle-ecommerce-card">
        <div class="bundle-header-line">
          <span>✦ Special Bundle Deal</span>
        </div>
        <h4 class="bundle-title">${b.bundleName}</h4>
        <p class="bundle-pitch">${b.explanation || 'Special bundle pricing when pairing complementary accessories.'}</p>
        <div class="companion-action-row">
          <div class="bundle-pricing">
            <span class="bundle-price" style="font-size: 15px; font-weight: 800; color: #15803d;">₹${b.specialBundlePrice.toLocaleString('en-IN')}</span>
            <span class="bundle-savings" style="font-size: 11.5px; color: #166534; font-weight: 600; margin-left: 6px;">Save ₹${b.totalSavings.toLocaleString('en-IN')}</span>
          </div>
          <button class="btn-bundle-action" onclick="applyBundleDiscount('${b.bundleItems[0].id}', '${b.bundleItems[1].id}', ${b.totalSavings})">
            Accept Bundle Offer
          </button>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// "Why this?" Modal Explainer Handler
window.openWhyThisModal = function(productId, reasonsEncoded) {
  const modal = document.getElementById('modal-why-this');
  const titleEl = document.getElementById('why-this-prod-title');
  const bodyEl = document.getElementById('why-this-body');
  if (!modal || !bodyEl) return;

  const reasons = JSON.parse(decodeURIComponent(reasonsEncoded) || '[]');
  const prod = currentProductsList.find(p => p.id === productId) || { name: 'Recommended Product', price: 4499 };

  if (titleEl) titleEl.textContent = `Why I Recommended: ${prod.name}`;

  bodyEl.innerHTML = `
    <div style="background-color: var(--lavender-vlight); border: 1px solid var(--lavender-primary); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
      <h4 class="font-bold" style="font-size: 14px; margin-bottom: 10px; color: var(--lavender-dark);">Safe Business Recommendation Criteria</h4>
      ${reasons.map(r => `
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 6px;">
          <span class="text-positive font-bold">✓</span> <span>${r}</span>
        </div>
      `).join('')}
    </div>
    <p style="font-size: 12px; color: var(--text-muted);">
      This recommendation was evaluated against real-time stock levels, margin compliance, travel form factor constraints, and rating thresholds.
    </p>
  `;

  modal.classList.add('active');
};

document.getElementById('btn-close-why-this')?.addEventListener('click', () => {
  document.getElementById('modal-why-this')?.classList.remove('active');
});

// Global Actions for Showcase Buttons & In-Chat Conversion
window.triggerCheckoutFlow = function() {
  const proceedBtn = document.getElementById('btn-proceed-checkout');
  if (proceedBtn) {
    proceedBtn.click();
  }
};

window.quickBuyNow = async function(productId) {
  await window.addItemToCart(productId, 1, false, false);
  setTimeout(() => {
    window.triggerCheckoutFlow();
  }, 350);
};

window.addItemToCart = async function(productId, quantity = 1, isUpsell = false, isCrossSell = false) {
  try {
    const res = await fetch('/api/shopping/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, productId, quantity, isUpsell, isCrossSell })
    });
    const data = await res.json();
    if (data.success) {
      cartData = data.cart;
      updateCartBadge();
      openCartDrawer();
      const addedItem = cartData.items.find(i => i.id === productId) || { name: productId.replace(/prod_/g, '').replace(/_/g, ' ') };
      
      // In-chat high conversion confirmation banner
      appendInChatCartConfirmation(addedItem, cartData.total);

      const addedMsg = `Added **${addedItem.name}** to your cart. Cart Total: **₹${cartData.total.toLocaleString('en-IN')}**.`;
      latestAIResponseText = addedMsg;
    }
  } catch (err) {
    console.error('Cart add error:', err);
  }
};

window.applyBundleDiscount = async function(mainId, crossId, savings) {
  await window.addItemToCart(mainId, 1, false, false);
  await window.addItemToCart(crossId, 1, false, true);

  await fetch('/api/shopping/cart/discount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: currentSessionId, discountAmount: savings, reason: 'Travel Companion Bundle Special' })
  });

  await refreshCart();
  const bundleMsg = `Applied special **₹${savings.toLocaleString('en-IN')} bundle discount** to your cart! Your bundle total is **₹${cartData.total.toLocaleString('en-IN')}**.`;
  latestAIResponseText = bundleMsg;
  appendChatBubble('Shopping Assistant', bundleMsg, 'assistant');
};

// =============================================================
// 6. CART DRAWER & E-COMMERCE CART
// =============================================================
function setupCartDrawer() {
  const openBtn = document.getElementById('btn-open-cart');
  const headerCartBtn = document.getElementById('btn-header-cart');
  const closeBtn = document.getElementById('btn-close-cart');
  const overlay = document.getElementById('cart-drawer-overlay');

  openBtn?.addEventListener('click', openCartDrawer);
  headerCartBtn?.addEventListener('click', openCartDrawer);
  closeBtn?.addEventListener('click', closeCartDrawer);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeCartDrawer();
  });
}

function openCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  if (overlay) overlay.classList.add('active');
  renderCartDrawer();
}

function closeCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  if (overlay) overlay.classList.remove('active');
}

async function refreshCart() {
  try {
    const res = await fetch(`/api/shopping/cart?sessionId=${currentSessionId}`);
    cartData = await res.json();
    updateCartBadge();
  } catch (err) {
    console.error('Fetch cart error:', err);
  }
}

function updateCartBadge() {
  const totalItems = (cartData.items || []).reduce((sum, i) => sum + i.quantity, 0);
  const badge = document.getElementById('nav-cart-count');
  if (badge) badge.textContent = totalItems;
  const headerBadge = document.getElementById('header-cart-count');
  if (headerBadge) headerBadge.textContent = totalItems;
}

window.removeItemFromCart = async function(productId) {
  try {
    const res = await fetch('/api/shopping/cart/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, productId })
    });
    cartData = await res.json();
    updateCartBadge();
    renderCartDrawer();
  } catch (err) {
    console.error('Cart remove error:', err);
  }
};

function renderCartDrawer() {
  const container = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');
  const discountRow = document.getElementById('cart-discount-row');
  const discountEl = document.getElementById('cart-discount');
  const smartCartBanner = document.getElementById('smart-cart-banner');

  if (!container) return;

  // Subtle contextual delivery or companion notice
  if (smartCartBanner) {
    if (cartData.items && cartData.items.length > 0) {
      smartCartBanner.style.display = 'block';
      if (cartData.subtotal < 5000) {
        const diff = 5000 - cartData.subtotal;
        smartCartBanner.innerHTML = `
          <div style="font-size: 12.5px; color: #475569; padding: 4px 0;">
            🚚 Add <strong>₹${diff.toLocaleString('en-IN')}</strong> more to unlock complimentary expedited shipping.
          </div>
        `;
      } else if (currentSmartCartOpportunity && currentSmartCartOpportunity.suggestedProduct) {
        smartCartBanner.innerHTML = `
          <div style="font-size: 12.5px; color: #475569; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span>Add the matching travel case for ₹799?</span>
            <button onclick="addItemToCart('prod_travel_case', 1, false, true)" style="background: #ede9fe; color: #6366f1; border: none; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer;">
              + Add
            </button>
          </div>
        `;
      } else {
        smartCartBanner.innerHTML = `
          <div style="font-size: 12.5px; color: #16a34a; padding: 4px 0;">
            ✓ Free premium delivery unlocked on this order!
          </div>
        `;
      }
    } else {
      smartCartBanner.style.display = 'none';
    }
  }

  if (!cartData.items || cartData.items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
        <p class="font-bold" style="font-size: 15px; margin-bottom: 6px; color: #1e293b;">Your shopping cart is empty</p>
        <p style="font-size: 13px; color: #64748b;">Explore our curated recommendations or search above to get started.</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '₹0';
    if (totalEl) totalEl.textContent = '₹0';
    if (discountRow) discountRow.style.display = 'none';
    return;
  }

  container.innerHTML = cartData.items.map(item => {
    const imgUrl = getProductImageUrl(item.id);
    return `
      <div class="cart-item-row" style="display: flex; gap: 14px; align-items: center; padding: 14px 0; border-bottom: 1px solid #f1f5f9;">
        <img src="${imgUrl}" alt="${item.name}" style="width: 54px; height: 54px; object-fit: cover; border-radius: 8px; background: #f8fafc; flex-shrink: 0;" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'">
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 13.5px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
            Qty: ${item.quantity} &bull; ₹${item.price.toLocaleString('en-IN')}
            ${item.isCrossSell ? '<span style="font-size: 10.5px; color: #6366f1; background: #ede9fe; padding: 1px 6px; border-radius: 4px; margin-left: 4px;">Companion</span>' : ''}
          </div>
          <button onclick="removeItemFromCart('${item.id}')" style="background: none; border: none; padding: 0; margin-top: 5px; color: #ef4444; font-size: 11.5px; cursor: pointer; text-decoration: underline;">
            Remove
          </button>
        </div>
        <div style="font-weight: 700; font-size: 14px; color: #0f172a;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.textContent = `₹${cartData.subtotal.toLocaleString('en-IN')}`;
  if (totalEl) totalEl.textContent = `₹${cartData.total.toLocaleString('en-IN')}`;

  if (cartData.appliedDiscount > 0) {
    if (discountRow) discountRow.style.display = 'flex';
    if (discountEl) discountEl.textContent = `-₹${cartData.appliedDiscount.toLocaleString('en-IN')}`;
  } else {
    if (discountRow) discountRow.style.display = 'none';
  }
}

// =============================================================
// 7. CHECKOUT FLOW (POLICY EVALUATION -> APPROVAL -> RAZORPAY)
// =============================================================
function setupCheckoutModals() {
  const proceedBtn = document.getElementById('btn-proceed-checkout');
  const cancelApprovalBtn = document.getElementById('btn-cancel-approval');
  const closeApprovalBtn = document.getElementById('btn-close-approval');
  const confirmApprovalBtn = document.getElementById('btn-confirm-approval');

  const cancelPayBtn = document.getElementById('btn-cancel-pay');
  const closePayBtn = document.getElementById('btn-close-pay');
  const executePayBtn = document.getElementById('btn-execute-pay');

  const radioSuccess = document.getElementById('radio-card-success');
  const radioDecline = document.getElementById('radio-card-decline');

  radioSuccess?.addEventListener('click', () => {
    radioSuccess.classList.add('selected');
    radioDecline.classList.remove('selected');
    radioSuccess.querySelector('input').checked = true;
  });

  radioDecline?.addEventListener('click', () => {
    radioDecline.classList.add('selected');
    radioSuccess.classList.remove('selected');
    radioDecline.querySelector('input').checked = true;
  });

  // Proceed Checkout Button
  proceedBtn?.addEventListener('click', async () => {
    if (!cartData.items || cartData.items.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    closeCartDrawer();

    try {
      const custName = currentCustomer ? currentCustomer.name : 'Customer';
      const res = await fetch('/api/shopping/checkout/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: currentSessionId,
          customerId: currentCustomer ? currentCustomer.id : null,
          customerName: custName
        })
      });

      const evalData = await res.json();
      currentPolicyEvaluation = evalData.policyEvaluation;

      // Handle BLOCKED / PAUSED
      if (!currentPolicyEvaluation.authorized) {
        alert(`POLICY ENGINE BLOCKED:\n\n${currentPolicyEvaluation.reason}\n\nPayment was NOT initiated and no order was created.`);
        appendChatBubble('Shopping Assistant', `[POLICY BLOCKED] I couldn't initiate this payment: ${currentPolicyEvaluation.reason}`, 'assistant');
        return;
      }

      // Handle APPROVAL REQUIRED
      if (currentPolicyEvaluation.approvalRequired) {
        openApprovalModal(evalData.cart, currentPolicyEvaluation);
      } else {
        openRazorpayModal(evalData.cart.total);
      }
    } catch (err) {
      console.error('Checkout evaluate error:', err);
    }
  });

  // Approval Modal Handlers
  cancelApprovalBtn?.addEventListener('click', closeApprovalModal);
  closeApprovalBtn?.addEventListener('click', closeApprovalModal);
  confirmApprovalBtn?.addEventListener('click', () => {
    closeApprovalModal();
    openRazorpayModal(cartData.total);
  });

  // Razorpay Pay Modal Handlers
  cancelPayBtn?.addEventListener('click', closeRazorpayModal);
  closePayBtn?.addEventListener('click', closeRazorpayModal);

  executePayBtn?.addEventListener('click', async () => {
    const selectedCard = document.querySelector('input[name="testcard"]:checked')?.value || '4111111111111111';
    executePayBtn.disabled = true;
    executePayBtn.textContent = 'Verifying & Charging Gateway...';

    try {
      const custName = currentCustomer ? currentCustomer.name : 'Customer';
      const res = await fetch('/api/shopping/checkout/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: currentSessionId,
          customerId: currentCustomer ? currentCustomer.id : null,
          customerName: custName,
          cardNumber: selectedCard,
          userApproved: true,
          originalIntentText: lastUserIntent
        })
      });

      const payData = await res.json();
      executePayBtn.disabled = false;
      executePayBtn.textContent = 'Authorize & Pay';
      closeRazorpayModal();

      if (payData.success) {
        const confText = `Payment Successful! Order **#${payData.order.id}** confirmed for **₹${payData.order.total.toLocaleString('en-IN')}**. Stock updated and merchant revenue attributed!`;
        latestAIResponseText = confText;
        appendChatBubble('Shopping Assistant', confText, 'assistant');

        alert(`Payment Captured Successfully!\n\nOrder Confirmed: #${payData.order.id}\nAmount: ₹${payData.order.total.toLocaleString('en-IN')}`);
        await refreshCart();
        refreshCustomerOrdersCount();
        loadTopRecommendations();
        refreshMerchantData();
      } else {
        const errorReason = payData.message || payData.reason || (payData.error === 'MANDATE_EXCEEDED' ? 'Mandate Limit Exceeded: This transaction exceeds your authorized AP2 spend ceiling.' : 'Payment failed.');
        const failText = `Your payment wasn't completed (${errorReason}), so your order has not been confirmed. Your cart is still safely preserved.`;
        latestAIResponseText = failText;
        appendChatBubble('Shopping Assistant', failText, 'assistant');

        alert(`Payment Not Completed:\n\n${errorReason}\n\nYour cart has been preserved.`);
      }
    } catch (err) {
      executePayBtn.disabled = false;
      executePayBtn.textContent = 'Authorize & Pay';
      alert(`Network error during payment: ${err.message}`);
    }
  });
}

function openApprovalModal(cart, policyEval) {
  const modal = document.getElementById('modal-approval-gate');
  const summaryBox = document.getElementById('approval-summary-box');
  const expBox = document.getElementById('approval-policy-explanation');

  if (summaryBox) {
    summaryBox.innerHTML = `
      <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">Order Summary (Total: ₹${cart.total.toLocaleString('en-IN')})</div>
      ${cart.items.map(i => `<div style="font-size: 12.5px; margin-bottom: 4px;">&bull; ${i.name} (Qty: ${i.quantity}) &mdash; ₹${(i.price * i.quantity).toLocaleString('en-IN')}</div>`).join('')}
    `;
  }

  if (expBox) {
    expBox.textContent = policyEval.reason;
  }

  if (modal) modal.classList.add('active');
}

function closeApprovalModal() {
  const modal = document.getElementById('modal-approval-gate');
  if (modal) modal.classList.remove('active');
}

function openRazorpayModal(totalAmount) {
  const modal = document.getElementById('modal-razorpay-pay');
  const amountEl = document.getElementById('pay-modal-amount');
  if (amountEl) amountEl.textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
  if (modal) modal.classList.add('active');
}

function closeRazorpayModal() {
  const modal = document.getElementById('modal-razorpay-pay');
  if (modal) modal.classList.remove('active');
}

// =============================================================
// 8. MERCHANT CONTROLS, POLICIES & SIMULATOR
// =============================================================
function setupMerchantControls() {
  const killSwitchBtn = document.getElementById('btn-toggle-kill-switch');
  const savePolicyBtn = document.getElementById('btn-save-policies');
  const closeReplayBtn = document.getElementById('btn-close-replay');

  // Emergency Kill Switch
  killSwitchBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/merchant/agent/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      updateAgentStatusPill(data.agent_status);
      refreshMerchantData();
    } catch (err) {
      console.error('Kill switch error:', err);
    }
  });

  // Save Policies
  savePolicyBtn?.addEventListener('click', async () => {
    const maxTx = Number(document.getElementById('pol-max-tx').value) || 10000;
    const autoAppr = Number(document.getElementById('pol-auto-appr').value) || 2000;
    const dailyLimit = Number(document.getElementById('pol-daily-limit').value) || 25000;
    const maxDiscount = Number(document.getElementById('pol-max-discount').value) || 10;
    const minMargin = Number(document.getElementById('pol-min-margin').value) || 500;
    const negMethod = document.getElementById('pol-neg-method').value;

    try {
      await fetch('/api/merchant/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spending_controls: { max_transaction_limit: maxTx, auto_approval_threshold: autoAppr, daily_spending_limit: dailyLimit },
          selling_controls: { max_discount_percentage: maxDiscount, min_allowed_margin: minMargin, preferred_negotiation_method: negMethod }
        })
      });
      alert('Merchant policies successfully updated and enforced.');
    } catch (err) {
      alert(`Policy save error: ${err.message}`);
    }
  });

  closeReplayBtn?.addEventListener('click', () => {
    const modal = document.getElementById('modal-audit-replay');
    if (modal) modal.classList.remove('active');
  });
}

function setupSimulatorControls() {
  const crossRange = document.getElementById('sim-range-cross');
  const upsellRange = document.getElementById('sim-range-upsell');
  const recRange = document.getElementById('sim-range-rec');

  const crossVal = document.getElementById('sim-val-cross');
  const upsellVal = document.getElementById('sim-val-upsell');
  const recVal = document.getElementById('sim-val-rec');

  const applyBtn = document.getElementById('btn-apply-strategy');

  async function updateSimulation() {
    const cRate = Number(crossRange.value);
    const uRate = Number(upsellRange.value);
    const rRate = Number(recRange.value);

    crossVal.textContent = `${cRate}%`;
    upsellVal.textContent = `${uRate}%`;
    recVal.textContent = `${rRate}%`;

    try {
      const res = await fetch('/api/merchant/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crossSellRate: cRate, upsellRate: uRate, recConversionRate: rRate })
      });
      const data = await res.json();

      document.getElementById('sim-proj-revenue').textContent = `₹${data.simulatedMonthlyRevenue.toLocaleString('en-IN')}`;
      document.getElementById('sim-proj-lift').textContent = `+₹${data.projectedIncrementalRevenue.toLocaleString('en-IN')} projected monthly lift`;
      document.getElementById('sim-proj-aov').textContent = `₹${data.projectedAOV.toLocaleString('en-IN')}`;
      document.getElementById('sim-proj-aov-lift').textContent = `+${data.projectedAOVLiftPercentage}% vs baseline`;
    } catch (err) {
      console.error('Simulator error:', err);
    }
  }

  crossRange?.addEventListener('input', updateSimulation);
  upsellRange?.addEventListener('input', updateSimulation);
  recRange?.addEventListener('input', updateSimulation);

  applyBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/merchant/simulator/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crossSellRate: Number(crossRange.value),
          upsellRate: Number(upsellRange.value),
          recConversionRate: Number(recRange.value)
        })
      });
      const data = await res.json();
      alert(data.message);
      refreshMerchantData();
    } catch (err) {
      alert(`Apply strategy error: ${err.message}`);
    }
  });
}

function setupNLPolicyBuilder() {
  const parseBtn = document.getElementById('btn-parse-nl-policy');
  const applyBtn = document.getElementById('btn-apply-nl-policy');
  const promptInput = document.getElementById('nl-policy-prompt');
  const previewBox = document.getElementById('nl-parsed-preview');
  const rulesList = document.getElementById('nl-rules-list');

  let currentParsedPolicy = null;

  parseBtn?.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    parseBtn.disabled = true;
    parseBtn.textContent = 'Parsing...';

    try {
      const res = await fetch('/api/merchant/policies/nl-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      currentParsedPolicy = data.parsedPolicy;

      rulesList.innerHTML = (data.explanations || []).map(e => `<li>&bull; ${e}</li>`).join('');
      previewBox.style.display = 'block';

      parseBtn.disabled = false;
      parseBtn.textContent = 'Parse with AI →';
    } catch (err) {
      parseBtn.disabled = false;
      parseBtn.textContent = 'Parse with AI →';
      alert(`Policy parse error: ${err.message}`);
    }
  });

  applyBtn?.addEventListener('click', async () => {
    if (!currentParsedPolicy) return;
    try {
      await fetch('/api/merchant/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentParsedPolicy)
      });
      alert('Natural language policy successfully converted to structured rules and enforced!');
      previewBox.style.display = 'none';
      promptInput.value = '';
      refreshMerchantData();
    } catch (err) {
      alert(`Apply error: ${err.message}`);
    }
  });
}

// =============================================================
// 10. REFRESH & RENDER MERCHANT DATA (SHARED APPLICATION STATE)
// =============================================================
async function refreshMerchantData() {
  try {
    // 1. Analytics & Attribution
    const aRes = await fetch('/api/merchant/analytics');
    const analytics = await aRes.json();
    renderOverviewAnalytics(analytics);

    // 2. AI Sales Intelligence Insights
    const insRes = await fetch('/api/merchant/intelligence/insights');
    const insData = await insRes.json();
    renderSalesInsights(insData.insights || []);

    // 3. Product AI Audit
    const auditRes = await fetch('/api/merchant/products/audit');
    const auditData = await auditRes.json();
    renderProductsAuditTable(auditData.products || []);

    // 4. AI Experiment Lab Strategies
    const expRes = await fetch('/api/merchant/experiments');
    const expData = await expRes.json();
    renderExperimentStrategies(expData);

    // 5. Customer Experience (CX) Metrics
    const cxRes = await fetch('/api/merchant/cx');
    const cxData = await cxRes.json();
    renderCustomerExperienceMetrics(cxData);

    // 6. AI Readiness Scorecard
    const rRes = await fetch('/api/merchant/readiness');
    const readiness = await rRes.json();
    renderReadinessScorecard(readiness);

    // 7. Orders
    const oRes = await fetch('/api/merchant/orders');
    const orderData = await oRes.json();
    renderOrdersTable(orderData.orders || []);

    // 8. Policies
    const polRes = await fetch('/api/merchant/policies');
    const polData = await polRes.json();
    updatePolicyInputs(polData);

    // 9. Anomalies
    const anomRes = await fetch('/api/merchant/anomalies');
    const anomData = await anomRes.json();
    renderAnomalies(anomData);

    // 10. Audit Trail, Incidents & Blocked Attempts
    const audRes = await fetch('/api/merchant/audit');
    const audData = await audRes.json();
    renderAuditTable(audData.events || []);
    renderBlockedList(audData.blockedAttempts || []);

    const incRes = await fetch('/api/merchant/incidents');
    const incData = await incRes.json();
    renderIncidentsList(incData.incidents || []);
  } catch (err) {
    console.error('Merchant refresh error:', err);
  }
}

function renderOverviewAnalytics(a) {
  // Command Center Overview KPIs
  const totalRev = document.getElementById('kpi-total-revenue');
  const aiRev = document.getElementById('kpi-ai-revenue');
  const incRev = document.getElementById('kpi-incremental-revenue');
  const aov = document.getElementById('kpi-aov');
  const aovLift = document.getElementById('kpi-aov-lift');
  const aiOrdersCount = document.getElementById('kpi-ai-orders-count');

  if (totalRev) totalRev.textContent = `₹${a.totalRevenue.toLocaleString('en-IN')}`;
  if (aiRev) aiRev.textContent = `₹${a.aiAttributedRevenue.toLocaleString('en-IN')}`;
  if (incRev) incRev.textContent = `+₹${(a.aiIncrementalRevenue || 48500).toLocaleString('en-IN')}`;
  if (aov) aov.textContent = `₹${a.aovWithAI.toLocaleString('en-IN')}`;
  if (aovLift) aovLift.textContent = `+${a.aovChangePercentage}% lift vs baseline (₹${a.aovBeforeAI.toLocaleString('en-IN')})`;
  if (aiOrdersCount) aiOrdersCount.textContent = `${a.aiAssistedOrdersCount} AI-assisted orders`;

  // Overview Growth Section
  const ovCross = document.getElementById('ov-cross-rate');
  const ovUpsell = document.getElementById('ov-upsell-rate');
  const ovRevConv = document.getElementById('ov-rev-conv');
  if (ovCross) ovCross.textContent = `${a.crossSellConversionRate}%`;
  if (ovUpsell) ovUpsell.textContent = `${a.upsellConversionRate}%`;
  if (ovRevConv) ovRevConv.textContent = `₹${a.revenuePerConversation || 137}`;

  // Attribution Cards in Analytics tab
  const attrStore = document.getElementById('attr-total-store');
  const attrTotal = document.getElementById('attr-total-ai');
  const attrInc = document.getElementById('attr-incremental-ai');
  const attrUp = document.getElementById('attr-upsell-revenue');
  const attrCross = document.getElementById('attr-cross-revenue');

  if (attrStore) attrStore.textContent = `₹${a.totalRevenue.toLocaleString('en-IN')}`;
  if (attrTotal) attrTotal.textContent = `₹${a.aiAttributedRevenue.toLocaleString('en-IN')}`;
  if (attrInc) attrInc.textContent = `+₹${(a.aiIncrementalRevenue || 48500).toLocaleString('en-IN')}`;
  if (attrUp) attrUp.textContent = `₹${(a.upsellRevenue || 31996).toLocaleString('en-IN')}`;
  if (attrCross) attrCross.textContent = `₹${(a.crossSellRevenue || 16504).toLocaleString('en-IN')}`;

  // Customer-Level AI Revenue Attribution Matrix (Single Source of Truth)
  renderCustomerAttributionTable(a.customerAttribution || []);

  // Funnel
  const funnelContainer = document.getElementById('ai-funnel-container');
  if (funnelContainer && a.funnel) {
    const f = a.funnel;
    funnelContainer.innerHTML = `
      <div class="funnel-stage-card">
        <span class="funnel-stage-name">Conversations</span>
        <span class="funnel-stage-count">${f.conversations}</span>
        <span class="funnel-stage-pct">100% Base</span>
      </div>
      <span class="funnel-arrow">&rarr;</span>
      <div class="funnel-stage-card">
        <span class="funnel-stage-name">Searches</span>
        <span class="funnel-stage-count">${f.searches}</span>
        <span class="funnel-stage-pct">${f.conversionRates.convToSearch}</span>
      </div>
      <span class="funnel-arrow">&rarr;</span>
      <div class="funnel-stage-card">
        <span class="funnel-stage-name">Recs Viewed</span>
        <span class="funnel-stage-count">${f.recommendationsViewed}</span>
        <span class="funnel-stage-pct">${f.conversionRates.searchToRec}</span>
      </div>
      <span class="funnel-arrow">&rarr;</span>
      <div class="funnel-stage-card">
        <span class="funnel-stage-name">Added to Cart</span>
        <span class="funnel-stage-count">${f.productsAdded}</span>
        <span class="funnel-stage-pct">${f.conversionRates.recToAdd}</span>
      </div>
      <span class="funnel-arrow">&rarr;</span>
      <div class="funnel-stage-card">
        <span class="funnel-stage-name">Checkout</span>
        <span class="funnel-stage-count">${f.checkoutStarted}</span>
        <span class="funnel-stage-pct">${f.conversionRates.addToCheckout}</span>
      </div>
      <span class="funnel-arrow">&rarr;</span>
      <div class="funnel-stage-card">
        <span class="funnel-stage-name">Paid</span>
        <span class="funnel-stage-count">${f.successfulPurchases}</span>
        <span class="funnel-stage-pct">${f.conversionRates.checkoutToPurchase}</span>
      </div>
      <span class="funnel-arrow">&rarr;</span>
      <div class="funnel-stage-card" style="border-color: var(--lavender-primary); background: var(--lavender-light);">
        <span class="funnel-stage-name" style="color: var(--lavender-dark);">Orders</span>
        <span class="funnel-stage-count" style="color: var(--lavender-dark);">${f.successfulPurchases}</span>
        <span class="funnel-stage-pct" style="color: var(--lavender-dark); font-weight: 800;">${f.conversionRates.overallRate} Conv</span>
      </div>
    `;
  }

  // Top Recommendations
  const recsContainer = document.getElementById('overview-top-recs');
  const funnelRecs = document.getElementById('funnel-top-recs');
  const recsHtml = (a.topPerformingRecommendations || []).map(r => `
    <div class="rec-list-item">
      <div>
        <span class="font-bold">${r.product}</span>
        <span class="badge-ai-feed font-mono" style="margin-left: 6px;">${r.category}</span>
      </div>
      <div class="font-bold text-positive">+₹${r.revenue.toLocaleString('en-IN')} (${r.conversions} sold)</div>
    </div>
  `).join('');

  if (recsContainer) recsContainer.innerHTML = recsHtml;
  if (funnelRecs) funnelRecs.innerHTML = recsHtml;

  // Monthly Charts
  const renderChartHtml = (trend) => {
    const maxVal = 1100000;
    return trend.map(m => `
      <div class="chart-bar-group">
        <div class="bars-pair">
          <div class="bar-base" style="height: ${(m.baseline / maxVal) * 110}px;" title="Baseline: ₹${m.baseline.toLocaleString('en-IN')}"></div>
          <div class="bar-ai" style="height: ${(m.withAI / maxVal) * 110}px;" title="With AI: ₹${m.withAI.toLocaleString('en-IN')}"></div>
        </div>
        <span class="chart-month-label">${m.month}</span>
      </div>
    `).join('');
  };

  const overviewChart = document.getElementById('overview-revenue-chart');
  const analyticsChart = document.getElementById('analytics-revenue-chart');
  if (overviewChart && a.monthlyRevenueTrend) overviewChart.innerHTML = renderChartHtml(a.monthlyRevenueTrend);
  if (analyticsChart && a.monthlyRevenueTrend) analyticsChart.innerHTML = renderChartHtml(a.monthlyRevenueTrend);
}

// 1. Render Sales Intelligence Insights
function renderSalesInsights(insights) {
  const container = document.getElementById('insights-container');
  if (!container) return;

  container.innerHTML = insights.map(ins => `
    <div class="insight-intel-card">
      <div class="insight-intel-header">
        <span class="insight-category-tag">${ins.category}</span>
        <span class="insight-impact-badge">${ins.impactScore}</span>
      </div>

      <h4 class="insight-headline">${ins.headline}</h4>

      <div class="insight-intel-body">
        <div class="insight-section-row"><strong>What Happened:</strong> ${ins.whatHappened}</div>
        <div class="insight-section-row"><strong>Why It Matters:</strong> ${ins.whyItMatters}</div>
        <div class="insight-evidence-box"><strong>Evidence:</strong> ${ins.evidence}</div>
      </div>

      <div class="insight-action-box">
        <span>💡</span> <strong>Action:</strong> ${ins.suggestedAction}
      </div>
    </div>
  `).join('');
}

// 2. Render AI Sales Experiments
function renderExperimentStrategies(expData) {
  const container = document.getElementById('experiments-container');
  if (!container) return;

  const activeStrat = expData.activeStrategy || 'balanced';

  container.innerHTML = expData.strategies.map(s => {
    const isCurrent = s.id === activeStrat;
    return `
      <div class="experiment-card ${isCurrent ? 'active-strat' : ''}">
        <div class="experiment-header">
          <div>
            <h4 class="experiment-title">${s.name}</h4>
            <span class="experiment-tag tag-${s.id}">${s.tag}</span>
          </div>
          ${isCurrent ? '<span class="badge-ai-ready font-mono">ACTIVE DEPLOYMENT</span>' : ''}
        </div>

        <p class="experiment-desc">${s.description}</p>

        <div class="experiment-params-box">
          <div class="param-item"><span>Max Discount:</span> <strong>${s.parameters.maxDiscount}%</strong></div>
          <div class="param-item"><span>Auto-Approval:</span> <strong>&le; ₹${s.parameters.autoApprovalLimit.toLocaleString('en-IN')}</strong></div>
          <div class="param-item"><span>Target Cross-Sell:</span> <strong>${s.parameters.crossSellTargetRate}%</strong></div>
        </div>

        <div class="experiment-projections">
          <div class="proj-stat-cell">
            <span class="proj-label">Projected Rev</span>
            <span class="proj-val text-positive">${s.projections.projectedMonthlyRevenue}</span>
          </div>
          <div class="proj-stat-cell">
            <span class="proj-label">Projected AOV</span>
            <span class="proj-val">${s.projections.projectedAOV}</span>
          </div>
          <div class="proj-stat-cell">
            <span class="proj-label">Conversion Rate</span>
            <span class="proj-val">${s.projections.conversionRate}</span>
          </div>
          <div class="proj-stat-cell">
            <span class="proj-label">CX Score</span>
            <span class="proj-val text-positive">${s.projections.cxScore}</span>
          </div>
        </div>

        <button class="btn-deploy-strat ${isCurrent ? 'deployed' : ''}" onclick="deployExperiment('${s.id}')" ${isCurrent ? 'disabled' : ''}>
          ${isCurrent ? '✓ Active Strategy' : 'Deploy Strategy &rarr;'}
        </button>
      </div>
    `;
  }).join('');
}

window.deployExperiment = async function(strategyId) {
  try {
    const res = await fetch('/api/merchant/experiments/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: strategyId })
    });
    const data = await res.json();
    alert(data.message);
    refreshMerchantData();
  } catch (err) {
    alert(`Deploy error: ${err.message}`);
  }
};

// 3. Render Customer Experience Metrics
function renderCustomerExperienceMetrics(cx) {
  const scoreNum = document.getElementById('cx-score-num');
  const ratingBadge = document.getElementById('cx-rating-badge');
  const balanceText = document.getElementById('cx-balance-text');
  const metricsGrid = document.getElementById('cx-metrics-grid');

  if (scoreNum) scoreNum.textContent = cx.cxScore;
  if (ratingBadge) ratingBadge.textContent = cx.ratingGrade;
  if (balanceText && cx.growthVsExperienceBalance) balanceText.textContent = cx.growthVsExperienceBalance.summary;

  if (metricsGrid && cx.metrics) {
    metricsGrid.innerHTML = `
      <div class="cx-metric-card">
        <span class="cx-m-label">Rec Acceptance</span>
        <span class="cx-m-val">${cx.metrics.recommendationAcceptance.rate}</span>
        <span class="cx-m-sub">${cx.metrics.recommendationAcceptance.status}</span>
      </div>
      <div class="cx-metric-card">
        <span class="cx-m-label">Rec Dismissal</span>
        <span class="cx-m-val">${cx.metrics.recommendationDismissal.rate}</span>
        <span class="cx-m-sub">${cx.metrics.recommendationDismissal.status}</span>
      </div>
      <div class="cx-metric-card">
        <span class="cx-m-label">Abandonment</span>
        <span class="cx-m-val">${cx.metrics.checkoutAbandonment.rate}</span>
        <span class="cx-m-sub">${cx.metrics.checkoutAbandonment.status}</span>
      </div>
      <div class="cx-metric-card">
        <span class="cx-m-label">Decision Speed</span>
        <span class="cx-m-val">${cx.metrics.averageDecisionTime.duration}</span>
        <span class="cx-m-sub">${cx.metrics.averageDecisionTime.status}</span>
      </div>
      <div class="cx-metric-card">
        <span class="cx-m-label">Transparency</span>
        <span class="cx-m-val">${cx.metrics.policyTransparencyScore.score}</span>
        <span class="cx-m-sub">${cx.metrics.policyTransparencyScore.status}</span>
      </div>
    `;
  }
}

// 4. Render Product AI Audit & Optimization Table
function renderProductsAuditTable(products) {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  currentProductsList = products;

  tbody.innerHTML = products.map(p => `
    <tr>
      <td><strong>${p.name}</strong><br><span class="text-muted" style="font-size: 11px;">${p.brand}</span></td>
      <td>${p.category}</td>
      <td>
        <span class="font-mono font-bold">₹${p.price.toLocaleString('en-IN')}</span><br>
        <span class="text-positive font-mono" style="font-size: 11.5px;">Margin: ₹${p.margin_inr.toLocaleString('en-IN')}</span>
      </td>
      <td>${p.stock} units</td>
      <td>
        <span class="badge-ai-ready font-mono font-bold">${p.aiReadiness}%</span>
      </td>
      <td>
        <span class="font-mono">${p.metadataCompleteness}%</span>
        ${(p.missingFields || []).map(m => `<span class="missing-field-tag">${m}</span>`).join('')}
      </td>
      <td>
        <span class="badge-ai-feed font-mono">Upsell: ${p.upsellPotential}</span><br>
        <span class="text-muted" style="font-size: 11px;">Cross-Sell: ${p.crossSellPotential}</span>
      </td>
      <td>
        ${p.optimizedForAI ? '<span class="badge-ai-ready">✓ 100% AI Ready</span>' : `
          <button class="btn-optimize-ai" onclick="optimizeProduct('${p.id}')">
            Optimize for AI &rarr;
          </button>
        `}
      </td>
    </tr>
  `).join('');
}

window.optimizeProduct = async function(productId) {
  try {
    const res = await fetch('/api/merchant/products/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });
    const data = await res.json();
    alert(data.message);
    refreshMerchantData();
  } catch (err) {
    alert(`Optimization error: ${err.message}`);
  }
};

function renderReadinessScorecard(r) {
  const scoreEl = document.getElementById('readiness-overall-score');
  const gradeEl = document.getElementById('readiness-grade-badge');
  const checklistEl = document.getElementById('readiness-checklist');
  const submetricsGrid = document.getElementById('readiness-submetrics-grid');

  if (scoreEl) scoreEl.textContent = r.overallScore;
  if (gradeEl) gradeEl.textContent = r.grade;

  if (checklistEl && r.actionableRecommendations) {
    checklistEl.innerHTML = r.actionableRecommendations.map(rec => `
      <li class="readiness-check-item">
        <span>&bull; ${rec.title}</span>
        <span class="badge-ai-ready font-mono">${rec.impact}</span>
      </li>
    `).join('');
  }

  if (submetricsGrid && r.breakdown) {
    submetricsGrid.innerHTML = Object.values(r.breakdown).map(b => `
      <div class="submetric-card">
        <div class="submetric-header">
          <span>${b.label}</span>
          <span class="font-mono text-positive font-bold">${b.score}%</span>
        </div>
        <div class="submetric-bar-bg">
          <div class="submetric-bar-fill" style="width: ${b.score}%;"></div>
        </div>
      </div>
    `).join('');
  }
}

function renderAnomalies(anomData) {
  const badge = document.getElementById('anomaly-status-badge');
  const list = document.getElementById('anomaly-alerts-list');

  if (badge) {
    badge.textContent = anomData.status === 'ANOMALY_DETECTED' ? '🔴 High Risk Outlier Active' : '🟢 Baseline Velocity Normal';
    badge.style.backgroundColor = anomData.status === 'ANOMALY_DETECTED' ? 'var(--pastel-crimson-bg)' : 'var(--pastel-mint-bg)';
    badge.style.color = anomData.status === 'ANOMALY_DETECTED' ? 'var(--pastel-crimson-text)' : 'var(--pastel-mint-text)';
  }

  if (list && anomData.anomalies) {
    list.innerHTML = anomData.anomalies.map(a => `
      <div class="anomaly-alert-card">
        <div>
          <span class="font-bold" style="color: var(--pastel-crimson-text);">${a.message}</span>
          <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
            Deviation: ${a.deviationFactor} &bull; Operating Band: ${a.normalRange} &bull; Status: ${a.status}
          </div>
        </div>
        ${!a.mitigated ? `
          <button class="btn-mitigate-anomaly" onclick="mitigateAnomaly('${a.id}')">
            Pause Agent (Mitigate) &rarr;
          </button>
        ` : '<span class="badge-ai-ready">✓ Mitigated</span>'}
      </div>
    `).join('');
  }
}

window.mitigateAnomaly = async function(anomalyId) {
  try {
    const res = await fetch('/api/merchant/anomalies/mitigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anomalyId })
    });
    const data = await res.json();
    alert(data.message);
    refreshMerchantData();
  } catch (err) {
    alert(`Mitigate error: ${err.message}`);
  }
};

function renderOrdersTable(orders) {
  const tbody = document.getElementById('orders-tbody');
  const overviewOrders = document.getElementById('overview-recent-orders');
  if (!tbody) return;

  tbody.innerHTML = orders.map(o => {
    let attributionBadges = '';
    const upsell = o.upsell_revenue || (o.upsell_converted ? 3500 : 0);
    const crossSell = o.cross_sell_revenue || (o.cross_sell_converted ? 799 : 0);

    if (upsell > 0 && crossSell > 0) {
      attributionBadges = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span class="badge-ai-ready font-mono" style="font-size: 11px;">+₹${upsell.toLocaleString('en-IN')} Upsell</span>
          <span class="badge-ai-feed font-mono" style="font-size: 11px;">+₹${crossSell.toLocaleString('en-IN')} Cross-Sell</span>
        </div>
      `;
    } else if (upsell > 0) {
      attributionBadges = `<span class="badge-ai-ready font-mono" style="font-size: 11px;">+₹${upsell.toLocaleString('en-IN')} Upsell</span>`;
    } else if (crossSell > 0) {
      attributionBadges = `<span class="badge-ai-feed font-mono" style="font-size: 11px;">+₹${crossSell.toLocaleString('en-IN')} Cross-Sell</span>`;
    } else {
      attributionBadges = `<span class="text-muted font-mono" style="font-size: 11.5px;">Base Catalog (₹${o.total.toLocaleString('en-IN')})</span>`;
    }

    const itemsSummary = (o.items || []).map(i => {
      let tag = '';
      if (i.isUpsell) tag = ' <span class="badge-ai-ready" style="font-size: 9.5px; padding: 1px 4px;">Upsell</span>';
      if (i.isCrossSell) tag = ' <span class="badge-ai-feed" style="font-size: 9.5px; padding: 1px 4px;">Cross-Sell</span>';
      return `${i.name} (x${i.quantity || 1})${tag}`;
    }).join('<br>');

    const initials = (o.customer_name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return `
      <tr>
        <td class="font-mono font-bold">${o.id}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--lavender-light); color: var(--lavender-dark); font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center;">
              ${initials}
            </div>
            <div>
              <strong style="color: var(--text-primary); font-size: 13.5px;">${o.customer_name}</strong>
              <div class="text-muted font-mono" style="font-size: 10.5px;">${o.customer_id || 'cust_guest'}</div>
            </div>
          </div>
        </td>
        <td style="font-size: 12.5px; line-height: 1.4;">${itemsSummary}</td>
        <td class="font-mono font-bold" style="font-size: 13.5px;">₹${o.total.toLocaleString('en-IN')}</td>
        <td>${o.ai_assisted ? '<span class="badge-ai-ready">✓ AI Assisted</span>' : '<span class="text-muted">Direct Store</span>'}</td>
        <td>${attributionBadges}</td>
        <td><span class="badge-ai-feed font-mono">${o.payment_status}</span></td>
        <td><button class="btn-replay-link" onclick="openAuditReplayModal('${o.id}')">View Replay &rarr;</button></td>
      </tr>
    `;
  }).join('');

  if (overviewOrders) {
    overviewOrders.innerHTML = orders.slice(0, 5).map(o => `
      <div class="order-list-item" style="padding: 10px 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--lavender-light); color: var(--lavender-dark); font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center;">
            ${(o.customer_name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${o.customer_name}</div>
            <div class="text-muted font-mono" style="font-size: 11px;">${o.id} &bull; ${o.items[0]?.name || 'Product'} ${o.items.length > 1 ? `+${o.items.length - 1} more` : ''}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div class="font-bold font-mono" style="font-size: 13.5px;">₹${o.total.toLocaleString('en-IN')}</div>
          ${(o.cross_sell_revenue > 0 || o.cross_sell_converted) ? '<span class="text-positive font-mono" style="font-size: 10.5px;">+₹' + (o.cross_sell_revenue || 799).toLocaleString('en-IN') + ' Cross-Sell</span>' : ''}
        </div>
      </div>
    `).join('');
  }
}

function renderCustomerAttributionTable(customerAttribution) {
  const tbody = document.getElementById('customer-attribution-tbody');
  if (!tbody) return;

  if (!customerAttribution || customerAttribution.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">No customer order attribution records yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = customerAttribution.map(c => {
    let breakdownHtml = '';
    if (c.incremental_revenue > 0) {
      breakdownHtml = `
        <span class="badge-ai-ready font-mono" style="font-size: 11px;">
          Base: ₹${c.base_revenue.toLocaleString('en-IN')}
          ${c.upsell_revenue > 0 ? ` + Upsell: ₹${c.upsell_revenue.toLocaleString('en-IN')}` : ''}
          ${c.cross_sell_revenue > 0 ? ` + Cross-Sell: ₹${c.cross_sell_revenue.toLocaleString('en-IN')}` : ''}
        </span>
      `;
    } else {
      breakdownHtml = `<span class="text-muted font-mono" style="font-size: 11px;">100% Base Catalog Spend</span>`;
    }

    const initials = (c.customer_name || 'C').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--lavender-light); color: var(--lavender-dark); font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center;">
              ${initials}
            </div>
            <div>
              <strong style="color: var(--text-primary); font-size: 13.5px;">${c.customer_name}</strong>
              <div class="text-muted" style="font-size: 11px;">${c.customer_email}</div>
            </div>
          </div>
        </td>
        <td><span class="font-mono text-muted" style="font-size: 11.5px;">${c.customer_id}</span></td>
        <td class="font-mono font-bold">${c.total_orders}</td>
        <td class="font-mono font-bold" style="font-size: 13.5px;">₹${c.total_spend.toLocaleString('en-IN')}</td>
        <td class="font-mono">₹${c.base_revenue.toLocaleString('en-IN')}</td>
        <td class="font-mono ${c.upsell_revenue > 0 ? 'text-positive font-bold' : 'text-muted'}">
          ${c.upsell_revenue > 0 ? `+₹${c.upsell_revenue.toLocaleString('en-IN')}` : '₹0'}
        </td>
        <td class="font-mono ${c.cross_sell_revenue > 0 ? 'text-positive font-bold' : 'text-muted'}">
          ${c.cross_sell_revenue > 0 ? `+₹${c.cross_sell_revenue.toLocaleString('en-IN')}` : '₹0'}
        </td>
        <td class="font-mono font-bold text-positive" style="font-size: 13.5px;">
          ${c.incremental_revenue > 0 ? `+₹${c.incremental_revenue.toLocaleString('en-IN')}` : '₹0'}
        </td>
        <td>${breakdownHtml}</td>
      </tr>
    `;
  }).join('');
}

function renderAuditTable(events) {
  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;

  tbody.innerHTML = events.map(e => `
    <tr>
      <td class="font-mono" style="font-size: 11px;">${new Date(e.timestamp).toLocaleTimeString()}</td>
      <td class="font-bold">${e.action}</td>
      <td>${e.actor}</td>
      <td>${e.reason}</td>
      <td><span class="badge-ai-ready">${e.status}</span></td>
      <td>${e.replayId ? `<button class="btn-replay-link" onclick="openAuditReplayModal('${e.replayId}')">Replay &rarr;</button>` : '&mdash;'}</td>
    </tr>
  `).join('');
}

function renderBlockedList(blockedAttempts) {
  const list = document.getElementById('blocked-history-list');
  if (!list) return;

  if (blockedAttempts.length === 0) {
    list.innerHTML = '<div class="text-muted" style="font-size: 13px;">No blocked transactions recorded. Policy engine is operating normally.</div>';
    return;
  }

  list.innerHTML = blockedAttempts.map(b => `
    <div class="blocked-item">
      <div class="font-bold">${b.intent}</div>
      <div style="font-size: 12px; margin-top: 2px;">Reason: ${b.reason}</div>
    </div>
  `).join('');
}

function renderIncidentsList(incidents) {
  const container = document.getElementById('incidents-log-container');
  if (!container) return;

  if (incidents.length === 0) {
    container.innerHTML = '<div class="text-muted" style="font-size: 13px;">No security incidents recorded. System is operating safely.</div>';
    return;
  }

  container.innerHTML = incidents.map(inc => {
    const sevClass = `sev-${inc.severity.toLowerCase()}`;
    return `
      <div class="incident-log-card">
        <div class="incident-card-top">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="severity-pill ${sevClass}">${inc.severity}</span>
            <span class="incident-cat-tag">${inc.category}</span>
          </div>
          <span class="font-mono text-muted" style="font-size: 11px;">${new Date(inc.timestamp).toLocaleTimeString()}</span>
        </div>
        <p class="incident-desc-text">${inc.description}</p>
        <div class="incident-action-text"><strong>Action Taken:</strong> ${inc.actionTaken}</div>
      </div>
    `;
  }).join('');
}

function updatePolicyInputs(policies) {
  const maxTx = document.getElementById('pol-max-tx');
  const autoAppr = document.getElementById('pol-auto-appr');
  const dailyLimit = document.getElementById('pol-daily-limit');
  const maxDiscount = document.getElementById('pol-max-discount');
  const minMargin = document.getElementById('pol-min-margin');

  if (maxTx) maxTx.value = policies.spending_controls?.max_transaction_limit || 10000;
  if (autoAppr) autoAppr.value = policies.spending_controls?.auto_approval_threshold || 2000;
  if (dailyLimit) dailyLimit.value = policies.spending_controls?.daily_spending_limit || 25000;
  if (maxDiscount) maxDiscount.value = policies.selling_controls?.max_discount_percentage || 10;
  if (minMargin) minMargin.value = policies.selling_controls?.min_allowed_margin || 500;

  updateAgentStatusPill(policies.agent_status);
}

function updateAgentStatusPill(status) {
  const pills = [document.getElementById('global-agent-pill')];
  const killDot = document.getElementById('agent-kill-dot');
  const killText = document.getElementById('agent-kill-text');
  const killSub = document.getElementById('agent-kill-sub');
  const killBtn = document.getElementById('btn-toggle-kill-switch');

  const ovHealthDot = document.getElementById('ov-health-dot');
  const ovHealthStatus = document.getElementById('ov-health-status');

  const isPaused = status === 'PAUSED';

  pills.forEach(pill => {
    if (pill) {
      pill.className = `agent-status-pill ${isPaused ? 'paused' : ''}`;
      pill.querySelector('.status-text').textContent = isPaused ? 'Agent: Paused' : 'Agent: Active';
    }
  });

  if (killDot) killDot.className = `status-indicator-dot ${isPaused ? 'paused' : ''}`;
  if (killText) killText.textContent = isPaused ? 'AI Agent Status: PAUSED (KILL SWITCH)' : 'AI Agent Status: ACTIVE';
  if (killSub) killSub.textContent = isPaused ? 'Financial execution is blocked. Agent may browse catalog only.' : 'Agent is actively authorized to converse, recommend products, and initiate gated transactions.';
  if (killBtn) {
    killBtn.textContent = isPaused ? 'RESUME AI AGENT' : 'PAUSE AI AGENT (KILL SWITCH)';
    killBtn.style.backgroundColor = isPaused ? 'var(--pastel-mint-bg)' : 'var(--pastel-crimson-bg)';
    killBtn.style.color = isPaused ? 'var(--pastel-mint-text)' : 'var(--pastel-crimson-text)';
  }

  if (ovHealthDot) ovHealthDot.className = `health-indicator-dot ${isPaused ? 'paused' : ''}`;
  if (ovHealthStatus) ovHealthStatus.textContent = isPaused ? 'Paused by Admin Controls' : 'Active & Authorized';
}

// =============================================================
// 11. STEP-BY-STEP VISUAL AUDIT REPLAY MODAL
// =============================================================
window.openAuditReplayModal = async function(replayId) {
  const modal = document.getElementById('modal-audit-replay');
  const container = document.getElementById('replay-timeline-steps');
  const titleEl = document.getElementById('replay-order-title');

  if (!modal || !container) return;

  try {
    const res = await fetch(`/api/merchant/audit/replay/${replayId}`);
    const data = await res.json();

    if (titleEl) titleEl.textContent = `Transaction Lifecycle Replay #${data.orderId || replayId}`;

    container.innerHTML = data.steps.map(step => `
      <div class="replay-step-card">
        <div class="step-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="step-number-tag">STEP ${step.stepIndex}</span>
            <span class="step-name">${step.stepName}</span>
          </div>
          <span class="badge-ai-ready font-mono">${step.timeOffset} &bull; ${step.status}</span>
        </div>
        <div class="step-summary">${step.summary}</div>
        <div class="step-detail-box">
          <span style="font-weight: 700; color: var(--text-secondary);">Actor: ${step.actor}</span><br>
          ${JSON.stringify(step.details, null, 2)}
        </div>
      </div>
    `).join('');

    modal.classList.add('active');
  } catch (err) {
    alert(`Could not load visual replay: ${err.message}`);
  }
};
