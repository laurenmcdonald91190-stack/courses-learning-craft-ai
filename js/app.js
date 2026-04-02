// ════════════════════════════════
// AUTH
// ════════════════════════════════
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t,i) => {
    t.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='register')||(i===2&&tab==='admin'));
  });
  document.getElementById('auth-login').style.display = tab==='login'?'block':'none';
  document.getElementById('auth-register').style.display = tab==='register'?'block':'none';
  document.getElementById('auth-admin').style.display = tab==='admin'?'block':'none';
}

function handleAdminLoginForm() {
  const email = document.getElementById('admin-email').value.trim().toLowerCase();
  const pass = document.getElementById('admin-pass').value;
  if (!email || !pass) { showAuthError('admin-error','Please enter your email and password.'); return; }
  if (ADMIN_EMAILS.includes(email) && pass === ADMIN_PASS) {
    handleAdminLogin(email);
  } else {
    showAuthError('admin-error','Invalid admin credentials.');
  }
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) { showAuthError('login-error','Please enter email and password.'); return; }
  // Check for demo credentials
  if (email === DEMO_EMAIL && pass === DEMO_PASS) { handleDemoLogin(); return; }
  // Check for any authorized admin email
  if (ADMIN_EMAILS.includes(email.toLowerCase()) && pass === ADMIN_PASS) { handleAdminLogin(email); return; }
  // Real Supabase auth
  const btn = document.querySelector('#view-auth .tab-content.active .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
  try {
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      showAuthError('login-error', error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message);
      if (btn) { btn.disabled = false; btn.innerHTML = 'Sign In <span class="arrow">→</span>'; }
      return;
    }
    const name = capitalize((data.user.user_metadata?.name || email.split('@')[0]).replace(/[^a-zA-Z]/g,' ').trim() || 'Learner');
    const userData = await loadSupabaseProfile(data.user.id, name, email);
    loginUser(userData);
  } catch(e) {
    showAuthError('login-error', 'Something went wrong. Please try again.');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Sign In <span class="arrow">→</span>'; }
  }
}

// ════════════════════════════════
// SUPABASE HELPERS
// ════════════════════════════════
async function loadSupabaseProfile(uid, name, email) {
  try {
    // Load or create XP record
    let { data: xpData } = await _supabase.from('user_xp').select('*').eq('user_id', uid).single();
    if (!xpData) {
      await _supabase.from('user_xp').insert({ user_id: uid, xp: 0, level: 1, streak: 1, last_active: new Date().toISOString() });
      xpData = { xp: 0, level: 1, streak: 1 };
    }
    // Load completed lessons
    const { data: progressData } = await _supabase.from('course_progress').select('course_id,lesson_id').eq('user_id', uid).eq('completed', true);
    const lessonsCompleted = (progressData || []).map(r => r.course_id + '-' + r.lesson_id);
    // Ensure profile exists
    await _supabase.from('profiles').upsert({ id: uid, email, full_name: name, role: 'student' });
    return {
      name, email,
      supabaseId: uid,
      xp: xpData.xp || 0,
      level: xpData.level || 1,
      streak: xpData.streak || 1,
      lessonsCompleted,
      correctAnswers: 0,
      badges: []
    };
  } catch(e) {
    console.warn('Supabase load failed, using defaults', e);
    return { name, email, xp: 0, lessonsCompleted: [], correctAnswers: 0, streak: 1, badges: [], level: 1 };
  }
}

async function saveProgressToSupabase(courseId, lessonId) {
  const u = appState.user;
  if (!u || !u.supabaseId || appState.isDemo || appState.isAdmin) return;
  try {
    await _supabase.from('course_progress').upsert({
      user_id: u.supabaseId, course_id: courseId, lesson_id: lessonId,
      completed: true, completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,course_id,lesson_id' });
  } catch(e) { console.warn('Progress save failed', e); }
}

async function saveXPToSupabase() {
  const u = appState.user;
  if (!u || !u.supabaseId || appState.isDemo || appState.isAdmin) return;
  try {
    await _supabase.from('user_xp').upsert({
      user_id: u.supabaseId, xp: u.xp, level: u.level,
      streak: u.streak, last_active: new Date().toISOString()
    }, { onConflict: 'user_id' });
  } catch(e) { console.warn('XP save failed', e); }
}

function handleDemoQuickLogin() {
  handleDemoLogin();
}

function handleDemoLogin() {
  appState.isDemo = true;
  appState.isAdmin = false;
  appState.user = { name: 'Demo Guest', email: DEMO_EMAIL, xp: 0, lessonsCompleted: [], correctAnswers: 0, streak: 1, badges: [], level: 1 };
  try { localStorage.setItem('lcai_session_type', 'demo'); } catch(e) {}
  if (!courses.find(c => c.id === 'course-demo')) courses.push(demoCourse);
  // Show intro overlay first, then reveal the app
  const overlay = document.getElementById('demo-intro-overlay');
  if (overlay) overlay.style.display = 'flex';
  showDemoIntro(() => {
    showView('view-app');
    renderApp();
    navigateAfterLogin();
    setTimeout(() => {
      const banner = document.getElementById('demo-banner');
      if (banner) banner.style.display = 'flex';
    }, 300);
  });
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  if (!name || !email || !pass) { showAuthError('reg-error','Please fill in all fields.'); return; }
  if (pass.length < 6) { showAuthError('reg-error','Password must be at least 6 characters.'); return; }
  const btn = document.querySelector('#view-auth .tab-content.active .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
  try {
    const { data, error } = await _supabase.auth.signUp({ email, password: pass, options: { data: { name } } });
    if (error) {
      showAuthError('reg-error', error.message);
      if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account <span class="arrow">→</span>'; }
      return;
    }
    if (data.user && !data.session) {
      // Email confirmation required
      showAuthError('reg-error', '✅ Check your email to confirm your account, then sign in.');
      if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account <span class="arrow">→</span>'; }
      return;
    }
    // Auto-confirmed — create profile and log in
    await _supabase.from('profiles').upsert({ id: data.user.id, email, full_name: name, role: 'student' });
    loginUser({ name, email, xp: 0, lessonsCompleted: [], correctAnswers: 0, streak: 1, badges: [], level: 1, supabaseId: data.user.id });
  } catch(e) {
    showAuthError('reg-error', 'Something went wrong. Please try again.');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Create Account <span class="arrow">→</span>'; }
  }
}

function handleDemoAdminView() {
  // Show read-only admin panel for demo users
  appState.isAdmin = true;
  showView('view-admin');
  renderAdminCourses();
  // Add a back button for demo users
  setTimeout(() => {
    const existing = document.getElementById('demo-back-btn');
    if (!existing) {
      const adminInner = document.querySelector('#view-admin .page-inner');
      if (adminInner) {
        const backBtn = document.createElement('div');
        backBtn.id = 'demo-back-btn';
        backBtn.style.cssText = 'margin-bottom:1.5rem;';
        backBtn.innerHTML = '<button class="btn btn-ghost btn-sm" onclick="handleDemoBackToStudent()">← Back to Student View</button>';
        adminInner.insertBefore(backBtn, adminInner.firstChild);
      }
    }
  }, 100);
}

function handleDemoBackToStudent() {
  appState.isAdmin = false;
  showView('view-app');
  renderApp();
}

function handleAdminLogin(email) {
  appState.isAdmin = true;
  const resolvedEmail = email || ADMIN_EMAIL;
  const name = resolvedEmail === ADMIN_EMAIL ? 'Admin' : capitalize(resolvedEmail.split('@')[0].replace(/[^a-zA-Z]/g,' ').trim());
  appState.user = { name, email: resolvedEmail };
  try { localStorage.setItem('lcai_session_type', 'admin'); localStorage.setItem('lcai_session_email', resolvedEmail); } catch(e) {}
  // Ensure admin tabs are injected before rendering
  ensureAdminTabs();
  showView('view-admin');
  renderAdminCourses();
}

function ensureAdminTabs() {
  const inner = document.querySelector('#view-admin .page-inner');
  if (!inner || inner.querySelector('.admin-tabs')) return;
  const tabsHtml = `<div class="admin-tabs">
    <button class="admin-tab active" onclick="adminNavTo('courses')">Courses</button>
    <button class="admin-tab" onclick="adminNavTo('builder')">Course Builder</button>
    <button class="admin-tab" onclick="adminNavTo('students')">Students</button>
    <button class="admin-tab" onclick="adminNavTo('stats')">Course Stats</button>
    <button class="admin-tab" onclick="adminNavTo('submissions')">Task Submissions</button>
    <button class="admin-tab" onclick="adminNavTo('announcements')">📣 Announcements</button>
    <button class="admin-tab" onclick="adminNavTo('baseline')">🧪 Baseline</button>
  </div>`;
  inner.insertBefore(document.createRange().createContextualFragment(tabsHtml), inner.querySelector('.admin-panel'));
}

async function loadLeaderboard() {
  try {
    const { data: xpData } = await _supabase.from('user_xp').select('user_id, xp, level').order('xp', { ascending: false }).limit(20);
    const { data: profiles } = await _supabase.from('profiles').select('id, full_name, email');
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });
    const avatarColors = ['#00e5c8','#9b5de5','#f5c842','#ff6b9d','#00d4ff'];
    leaderboard = (xpData || []).map((x, i) => {
      const profile = profileMap[x.user_id];
      const name = profile?.full_name || (profile?.email ? profile.email.split('@')[0].replace(/[^a-zA-Z]/g,' ').trim() : 'Learner');
      const isYou = appState.user && appState.user.supabaseId === x.user_id;
      return { name, xp: x.xp, level: x.level, avatar: name.slice(0,2).toUpperCase(), color: avatarColors[i % avatarColors.length], isYou };
    });
    // Ensure current user appears even if outside top 20
    if (appState.user && appState.user.supabaseId && !leaderboard.find(l => l.isYou)) {
      leaderboard.push({ name: appState.user.name, xp: appState.user.xp, level: appState.user.level, avatar: appState.user.name.slice(0,2).toUpperCase(), color: '#00e5c8', isYou: true });
    }
  } catch(e) {
    console.warn('Leaderboard load failed', e);
    if (appState.user) {
      leaderboard = [{ name: appState.user.name, xp: appState.user.xp, level: appState.user.level, avatar: appState.user.name.slice(0,2).toUpperCase(), color: '#00e5c8', isYou: true }];
    }
  }
}

// ════════════════════════════════
// WELCOME VIDEO
// ════════════════════════════════
function hasSeenWelcome() {
  try { return localStorage.getItem('lcai_welcome_seen') === '1'; } catch(e) { return false; }
}
function markWelcomeSeen() {
  try { localStorage.setItem('lcai_welcome_seen', '1'); } catch(e) {}
}
function hasStartedCourse1() {
  const u = appState.user;
  if (!u) return false;
  return (u.lessonsCompleted || []).some(k => k.startsWith('course-1'));
}
function shouldShowWelcome() {
  if (appState.isDemo || appState.isAdmin) return false;
  return !hasSeenWelcome() && !hasStartedCourse1();
}
function showLockedModal(title, body) {
  document.getElementById('locked-modal-title').textContent = title || 'This content is coming soon';
  document.getElementById('locked-modal-body').textContent = body || "Lauren is actively building this content. You'll be notified as soon as it's available.";
  document.getElementById('locked-modal').classList.add('open');
}
function closeLocked() {
  document.getElementById('locked-modal').classList.remove('open');
}

function showWelcomeVideo() {
  // Reset to thumbnail so iframe isn't preloaded (prevents bg audio)
  const slot = document.getElementById('welcome-iframe-slot');
  const thumb = document.getElementById('welcome-thumb');
  if (slot) { slot.innerHTML = ''; slot.style.display = 'none'; }
  if (thumb) thumb.style.display = 'flex';
  showView('view-welcome');
}
function loadWelcomeIframe() {
  const slot = document.getElementById('welcome-iframe-slot');
  const thumb = document.getElementById('welcome-thumb');
  if (!slot) return;
  slot.innerHTML = '<iframe src="https://app.heygen.com/embeds/5b58bf98f90842baaa7fba9381b068e3" title="Welcome to Learning Craft AI" allow="encrypted-media; fullscreen;" allowfullscreen style="width:100%;height:100%;border:none;display:block;"></iframe>';
  slot.style.display = 'block';
  if (thumb) thumb.style.display = 'none';
}
function dismissWelcome() {
  // Stop video by removing iframe before navigating away
  const slot = document.getElementById('welcome-iframe-slot');
  const thumb = document.getElementById('welcome-thumb');
  if (slot) { slot.innerHTML = ''; slot.style.display = 'none'; }
  if (thumb) thumb.style.display = 'flex';
  markWelcomeSeen();
  showView('view-app');
  renderApp();
  navTo('my-courses');
}
function dismissWelcomeCallout() {
  markWelcomeSeen();
  updateWelcomeCallout();
}
function updateWelcomeCallout() {
  const el = document.getElementById('welcome-callout');
  if (!el) return;
  const show = !hasSeenWelcome() && !hasStartedCourse1() && !appState.isDemo && !appState.isAdmin;
  el.style.display = show ? 'flex' : 'none';
}

async function loginUser(user) {
  appState.user = user;
  appState.isAdmin = false;
  await loadLeaderboard();
  showView('view-app');
  renderApp();
  navigateAfterLogin();
  showToast('success','✓', `Welcome back, ${user.name}!`);
  // Init baseline after login
  initBaseline();
}

function handleLogout() {
  appState.user = null;
  appState.isAdmin = false;
  appState.isDemo = false;
  leaderboard = [];
  try {
    localStorage.removeItem('lcai_session_type');
    localStorage.removeItem('lcai_session_email');
    localStorage.removeItem('lcai_last_page');
  } catch(e) {}
  _supabase.auth.signOut().catch(()=>{});
  showView('view-auth');
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

// ════════════════════════════════
// NAVIGATION
// ════════════════════════════════
function showView(id) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none';
  });
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');
  if (id === 'view-player') el.style.display = 'grid';
  else if (id === 'view-auth' || id === 'view-welcome') el.style.display = 'flex';
  else el.style.display = 'block';
  if (id !== 'view-baseline-tasking') clearInterval(blTimerInterval);
}

function navTo(page) {
  const VALID_NAV = ['dashboard','my-courses','leaderboard','achievements'];
  if (!VALID_NAV.includes(page)) page = 'dashboard';
  // Save current page for refresh restore
  try { localStorage.setItem('lcai_last_page', page); } catch(e) {}
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === page));
  VALID_NAV.forEach(p => {
    const el = document.getElementById('page-'+p);
    if (el) el.style.display = p===page ? 'block' : 'none';
  });
  document.getElementById('topbar-title').textContent = {
    'dashboard':'Dashboard','my-courses':'My Courses',
    'leaderboard':'Leaderboard','achievements':'Achievements'
  }[page] || 'Dashboard';
  if (page === 'leaderboard') renderLeaderboardFull();
  if (page === 'achievements') renderAllBadges();
  if (page === 'my-courses') renderMyCourses();
  if (page === 'dashboard') updateWelcomeCallout();
  initFadeIns();
  window.scrollTo({top:0,behavior:'instant'});
  // Update hash only when logged in
  if (appState.user) {
    history.pushState(null, '', '#' + page);
  }
}

// ── HASH ROUTING ──
const VALID_NAV_PAGES = ['dashboard','my-courses','leaderboard','achievements'];

function loadFromHash() {
  if (!appState.user) return; // don't route if not logged in
  const hash = window.location.hash.replace('#','').trim();
  const page = VALID_NAV_PAGES.includes(hash) ? hash : 'dashboard';
  navTo(page);
}

window.addEventListener('hashchange', loadFromHash);

// After login, check hash to land on right page
function navigateAfterLogin() {
  const hash = window.location.hash.replace('#','').trim();
  const page = VALID_NAV_PAGES.includes(hash) ? hash : 'dashboard';
  navTo(page);
}
function renderApp() {
  const u = appState.user;
  // Sidebar
  document.getElementById('sidebar-avatar').textContent = u.name.slice(0,2).toUpperCase();
  document.getElementById('sidebar-name').textContent = u.name;
  document.getElementById('topbar-avatar').textContent = u.name.slice(0,2).toUpperCase();
  // Demo mode UI
  const demoBanner = document.getElementById('demo-banner');
  const demoAdminLink = document.getElementById('demo-admin-link');
  const impersonateBanner = document.getElementById('impersonate-banner');
  if (demoBanner) demoBanner.style.display = appState.isDemo ? 'flex' : 'none';
  if (demoAdminLink) demoAdminLink.style.display = appState.isDemo ? 'block' : 'none';
  if (impersonateBanner) impersonateBanner.style.display = appState.isImpersonating ? 'flex' : 'none';
  if (appState.isImpersonating) document.getElementById('impersonate-name').textContent = appState.user.name;
  updateXPBar();
  renderDashboard();
  updateWelcomeCallout();
  initFadeIns();
}

function updateXPBar() {
  const u = appState.user;
  const xpPerLevel = 500;
  const level = Math.floor(u.xp / xpPerLevel) + 1;
  const xpInLevel = u.xp % xpPerLevel;
  u.level = level;
  document.getElementById('sidebar-level').textContent = `Level ${level}`;
  document.getElementById('sidebar-xp-label').textContent = `${xpInLevel} / ${xpPerLevel}`;
  document.getElementById('sidebar-xp-fill').style.width = (xpInLevel/xpPerLevel*100)+'%';
  document.getElementById('stat-xp').textContent = u.xp;
  document.getElementById('ws-xp').textContent = u.xp;
  document.getElementById('ws-streak').textContent = u.streak;
  document.getElementById('streak-count').textContent = u.streak;
  document.getElementById('stat-lessons').textContent = u.lessonsCompleted.length;
  document.getElementById('stat-badges').textContent = u.badges.length;
  document.getElementById('welcome-name').textContent = u.name.split(' ')[0];
  // Completion %
  const totalLessons = courses.reduce((a,c)=>a+c.lessons.filter(l=>l.type!=='quiz').length,0);
  const pct = totalLessons ? Math.round((u.lessonsCompleted.length/totalLessons)*100) : 0;
  document.getElementById('ws-complete').textContent = pct+'%';
  // Rank
  const sorted = [...leaderboard].sort((a,b)=>b.xp-a.xp);
  const rank = sorted.findIndex(l=>l.isYou)+1;
  document.getElementById('stat-rank').textContent = rank > 0 ? '#'+rank : '#—';
  // Update leaderboard entry
  const myEntry = leaderboard.find(l=>l.isYou);
  if (myEntry) { myEntry.xp = u.xp; myEntry.level = u.level; }
}

function renderDashboard() {
  renderCourseCards('dashboard-courses');
  renderBadges('dashboard-badges', true);
  renderLeaderboardMini();
}

function renderCourseCards(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const visibleCourses = courses.filter(c => appState.isDemo ? c.isDemo : !c.isDemo);
  const isAdmin = appState.isAdmin || appState.isImpersonating;
  container.innerHTML = visibleCourses.map((c,i) => {
    const isLocked = c.locked && !isAdmin;
    const prog = getCourseProgress(c.id);
    return `
    <div class="course-card ${isLocked ? 'course-locked' : ''}" onclick="handleCourseClick('${c.id}')">
      <div class="course-thumb ${c.thumb}" style="position:relative;">
        ${c.emoji}
        ${isLocked ? `<div class="course-thumb-lock">🔒</div><div class="course-coming-soon">In Progress</div>` : ''}
      </div>
      <div class="course-body">
        <div class="course-level-tag">${isLocked ? '🔒 Coming Soon' : c.level}</div>
        <h4>${c.title}</h4>
        ${isLocked
          ? `<div style="font-size:0.8rem;color:var(--text-dim);margin-top:0.5rem;line-height:1.5;">Being built now — you'll be notified when it's ready.</div>`
          : `<div class="course-progress-wrap">
              <div class="course-progress-label">
                <span>${prog.done} / ${prog.total} lessons</span>
                <span>${prog.pct}%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${prog.pct}%"></div></div>
            </div>`
        }
      </div>
    </div>`;
  }).join('');
}

function renderMyCourses() {
  renderCourseCards('my-courses-grid');
}

function getCourseProgress(courseId) {
  const u = appState.user;
  const course = courses.find(c=>c.id===courseId);
  if (!course) return { done:0, total:0, pct:0 };
  const videoLessons = course.lessons.filter(l=>l.type!=='quiz');
  const done = videoLessons.filter(l=>u.lessonsCompleted.includes(courseId+'-'+l.id)).length;
  const total = videoLessons.length;
  return { done, total, pct: total ? Math.round((done/total)*100) : 0 };
}

function renderBadges(containerId, limited=false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const u = appState.user;
  let badges = allBadges;
  if (limited) badges = allBadges.slice(0,6);
  container.innerHTML = badges.map(b => {
    const earned = u.badges.includes(b.id);
    return `<div class="badge ${earned?'earned':'locked'}">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
    </div>`;
  }).join('');
}

function renderAllBadges() {
  renderBadges('all-badges', false);
}

function formatLeaderboardName(name) {
  const parts = (name || '').trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.';
}

function renderLeaderboardMini() {
  const container = document.getElementById('dashboard-lb');
  if (!container) return;
  const sorted = [...leaderboard].sort((a,b)=>b.xp-a.xp).slice(0,5);
  if (!sorted.length) {
    container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.85rem;">No learners yet — be the first on the board!</div>';
    return;
  }
  container.innerHTML = sorted.map((l,i) => `
    <div class="lb-row ${l.isYou?'you':''}">
      <div class="lb-rank ${i<3?'top':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
      <div class="lb-avatar" style="background:${l.color};color:#080b10;">${l.avatar}</div>
      <div class="lb-name">${formatLeaderboardName(l.name)}${l.isYou?' (You)':''}</div>
      <div class="lb-xp">${l.xp} XP</div>
    </div>
  `).join('');
}

function renderLeaderboardFull() {
  const container = document.getElementById('lb-full-list');
  if (!container) return;
  const sorted = [...leaderboard].sort((a,b)=>b.xp-a.xp);
  if (!sorted.length) {
    container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:0.85rem;">No learners on the leaderboard yet. Complete lessons to earn XP and appear here!</div>';
    return;
  }
  container.innerHTML = `
    <div class="lb-full-row header">
      <div>Rank</div><div></div><div>Name</div><div>Level</div><div>XP</div>
    </div>` +
  sorted.map((l,i) => `
    <div class="lb-full-row ${l.isYou?'you':''}">
      <div class="lb-medal">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div>
      <div class="lb-avatar" style="background:${l.color};color:#080b10;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.72rem;">${l.avatar}</div>
      <div>${formatLeaderboardName(l.name)}${l.isYou?' <span style="color:var(--cyan);font-size:0.75rem;">(You)</span>':''}</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:0.8rem;color:var(--violet);">Lv ${l.level||1}</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--cyan);">${l.xp}</div>
    </div>
  `).join('');
}

// ════════════════════════════════
// COURSE PLAYER
// ════════════════════════════════
function openCourse(courseId) {
  const course = courses.find(c=>c.id===courseId);
  if (!course) return;
  appState.currentCourse = course;
  appState.currentLessonIdx = 0;
  appState.quizAnswered = {};
  document.getElementById('player-course-name').textContent = course.title;
  renderLessonList();
  loadLesson(0);
  showView('view-player');
  document.getElementById('view-player').style.display = 'grid';
}

function renderLessonList() {
  const course = appState.currentCourse;
  const u = appState.user;
  const container = document.getElementById('lesson-list');
  let html = '';
  const isAdminView = appState.isAdmin || appState.isImpersonating;
  course.lessons.forEach((l,i) => {
    const key = course.id+'-'+l.id;
    const done = u.lessonsCompleted.includes(key);
    const isActive = i === appState.currentLessonIdx;
    const isLocked = l.locked && !isAdminView;
    const typeLabel = l.type==='quiz'?'Knowledge Check':l.type==='practice'?'Practice Tasks':l.type==='interactive'?'Quick Check':'Video Lesson';
    html += `<div class="lesson-item ${isActive?'active':''} ${done?'completed':''} ${isLocked?'lesson-locked':''}" onclick="${isLocked ? `showLockedLesson(${i})` : `loadLesson(${i})`}" id="li-${i}">
      <div class="lesson-num">${isLocked ? '🔒' : done ? '✓' : i+1}</div>
      <div class="lesson-info">
        <div class="lesson-title-sm">${l.title}</div>
        <div class="lesson-type-tag">${isLocked ? 'Coming Soon' : typeLabel}</div>
      </div>
    </div>`;
  });
  container.innerHTML = html;
  updatePlayerProgress();
}

function updatePlayerProgress() {
  const course = appState.currentCourse;
  const u = appState.user;
  const total = course.lessons.length;
  const done = course.lessons.filter(l=>u.lessonsCompleted.includes(course.id+'-'+l.id)).length;
  document.getElementById('player-progress-label').textContent = `${done} of ${total} lessons`;
  document.getElementById('player-progress-fill').style.width = (done/total*100)+'%';
}

function showLockedLesson(idx) {
  const course = appState.currentCourse;
  const lesson = course ? course.lessons[idx] : null;
  const title = lesson ? lesson.title + ' — Coming Soon' : 'Coming Soon';
  showLockedModal(title, "This lesson is being built and will be available soon. You'll be notified when it's ready.");
}

function loadLesson(idx) {
  const course = appState.currentCourse;
  const lesson = course.lessons[idx];
  if (!lesson) return;
  appState.currentLessonIdx = idx;

  // Update sidebar
  document.querySelectorAll('.lesson-item').forEach((el,i) => el.classList.toggle('active', i===idx));
  document.getElementById('player-lesson-title').textContent = lesson.title;

  const body = document.getElementById('player-body');

  if (lesson.type === 'quiz') {
    body.innerHTML = renderQuizHTML(course, idx);
  } else if (lesson.type === 'interactive') {
    body.innerHTML = renderInteractiveHTML(course, lesson, idx);
  } else if (lesson.type === 'practice') {
    body.innerHTML = `
      <div class="player-meta">
        <div class="meta-chip"><span>⚡</span><span class="chip-val">+50 XP</span><span>per task</span></div>
        <div class="meta-chip gold"><span>🗂️</span><span class="chip-val">8</span><span>tasks</span></div>
      </div>
      <div class="lesson-content" id="lesson-content">
        <p style="color:var(--text-muted);">Loading tasks...</p>
      </div>`;
    taskState.currentIdx = 0;
    renderPracticeLesson();
  } else {
    const isDemoLesson = course.id === 'course-demo';
    let videoHtml;
    if (lesson.videoUrl) {
      videoHtml = `<div class="video-container">${getEmbedHTML(lesson.videoUrl)}</div>`;
    } else if (isDemoLesson) {
      videoHtml = `<div class="video-container">${getDemoHeroImage(lesson.id)}</div>`;
    } else {
      videoHtml = `<div class="video-container"><div class="video-placeholder">
          <div style="font-size:2rem;margin-bottom:0.5rem;">🎬</div>
          <p style="font-weight:600;color:var(--text);font-size:0.95rem;">Coming Soon</p>
          <p style="font-size:0.8rem;margin-top:0.25rem;">This video lesson is on its way.</p>
        </div></div>`;
    }

    const keyPtsHtml = lesson.keyPoints.length ? lesson.keyPoints.map(kp =>
      `<div class="key-point"><span class="key-point-icon">→</span><span class="key-point-text">${kp}</span></div>`
    ).join('') : '';

    // Course 1 Lesson 1 gets animated concept map instead of text block
    const isL1 = course.id === 'course-1' && lesson.id === 'l1';
    const postVideoBlock = isL1 ? `
      <div class="concept-map" id="concept-map-block">
        <div class="concept-map-label">How It Fits Together</div>
        <div class="concept-map-flow">
          <div class="cm-node" id="cm-n1">
            <div class="cm-node-icon cyan">🧠</div>
            <div class="cm-node-title">Layer 1</div>
            <div class="cm-node-sub">Pattern Prediction</div>
            <div style="margin-top:0.4rem;"><span class="cm-token">The</span><span class="cm-token">sky</span><span class="cm-token highlight">blue</span></div>
          </div>
          <div class="cm-plus" id="cm-p1">+</div>
          <div class="cm-node" id="cm-n2">
            <div class="cm-node-icon violet">👤</div>
            <div class="cm-node-title">Layer 2</div>
            <div class="cm-node-sub">Human Judgment</div>
          </div>
          <div class="cm-equals" id="cm-eq">=</div>
          <div class="cm-node" id="cm-n3">
            <div class="cm-node-icon gold">✦</div>
            <div class="cm-node-title">Result</div>
            <div class="cm-node-sub">Helpful, safe, accurate AI</div>
          </div>
        </div>
        <div class="cm-insight" id="cm-insight">
          The model predicts. <strong>You judge.</strong> Without Layer 2, there's no way to tell a confident wrong answer from a correct one. Your ratings are what close that gap — for every person who uses this AI after you.
        </div>
        <div class="cm-cta" id="cm-cta">
          <button class="btn btn-primary" onclick="goToInteractive()">Try It Yourself <span class="arrow">→</span></button>
        </div>
      </div>` : `
      <div class="lesson-content">
        <h2>${lesson.title}</h2>
        <p>${lesson.content}</p>
        ${keyPtsHtml}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1rem;">
        <button class="btn btn-primary" onclick="completeLesson(${idx})">Mark Complete & Continue <span class="arrow">→</span></button>
      </div>`;

    body.innerHTML = `
      <div class="player-meta">
        <div class="meta-chip"><span>⚡</span><span class="chip-val">+50 XP</span><span>on completion</span></div>
        <div class="meta-chip gold"><span>🔥</span><span class="chip-val">${appState.user.streak}</span><span>day streak</span></div>
      </div>
      ${videoHtml}
      ${postVideoBlock}`;

    // Trigger concept map animation after render
    if (isL1) setTimeout(() => animateConceptMap(), 400);
  }
}

function animateConceptMap() {
  const seq = [
    { el: 'cm-n1', delay: 0 },
    { el: 'cm-p1', delay: 300 },
    { el: 'cm-n2', delay: 500 },
    { el: 'cm-eq', delay: 800 },
    { el: 'cm-n3', delay: 1000 },
    { el: 'cm-insight', delay: 1400 },
    { el: 'cm-cta', delay: 1900 },
  ];
  seq.forEach(({ el, delay }) => {
    setTimeout(() => {
      const node = document.getElementById(el);
      if (node) node.classList.add('visible');
    }, delay);
  });
}

function goToInteractive() {
  const course = appState.currentCourse;
  if (!course) return;
  const interactiveIdx = course.lessons.findIndex(l => l.type === 'interactive');
  if (interactiveIdx >= 0) {
    // Mark current lesson complete without navigating via completeLesson's auto-advance
    const lesson = course.lessons[appState.currentLessonIdx];
    const key = course.id + '-' + lesson.id;
    const u = appState.user;
    if (!u.lessonsCompleted.includes(key)) {
      u.lessonsCompleted.push(key);
      saveProgressToSupabase(course.id, lesson.id);
      addXP(50);
      spawnXPPop('+50 XP');
      showMilestoneBanner('⚡', 'Lesson complete! +50 XP');
      checkBadges();
    }
    renderLessonList();
    updateXPBar();
    loadLesson(interactiveIdx);
  }
}

function renderInteractiveHTML(course, lesson, idx) {
  // Only defined for Course 1 Lesson 1 interactive — extensible later
  if (lesson.id === 'l1i' && course.id === 'course-1') {
    const alreadyCompleted = appState.user && appState.user.lessonsCompleted.includes(course.id + '-' + lesson.id);

    // If already done — show read-only revealed state with completion banner
    if (alreadyCompleted) {
      return `
        <div class="player-meta">
          <div class="meta-chip"><span>✓</span><span class="chip-val">Completed</span></div>
          <div class="meta-chip gold"><span>⚡</span><span class="chip-val">+25 XP</span><span>earned</span></div>
        </div>
        <!-- Completion notice -->
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.85rem 1.1rem;background:rgba(0,229,200,0.06);border:1px solid rgba(0,229,200,0.25);border-radius:8px;margin-bottom:1rem;">
          <span style="font-size:1.1rem;">✓</span>
          <div style="font-size:0.88rem;color:var(--text-muted);">You've already completed this check. Your answer is shown below for reference — <strong style="color:var(--cyan);">Response A</strong> was the better choice.</div>
        </div>
        <div class="interactive-wrap">
          <div class="interactive-setup">
            <div class="interactive-label">Quick Check — Review</div>
            <div class="interactive-scenario">You just learned that language models predict the next word based on patterns — not understanding. Now see if you can spot the difference in practice.</div>
            <div class="chat-bubble-wrap">
              <div class="chat-bubble-avatar">👤</div>
              <div class="chat-bubble">I've been really stressed about money lately and I don't know where to start. What should I do?</div>
            </div>
            <div class="interactive-instruction">Two AI systems responded to the same message. Which response would actually help this person?</div>
          </div>
          <div class="response-grid">
            <div class="response-card selected-correct" style="cursor:default;">
              <div class="response-card-header">
                <span class="response-card-label">Response A</span>
                <span class="response-card-badge correct-badge" style="display:block;">✓ Better response</span>
              </div>
              <div class="response-card-body">That sounds really overwhelming — money stress is one of the hardest kinds because it touches everything. A good first step is just getting a clear picture of where things stand: what's coming in, what's going out, and what feels most urgent. Would it help to start there?</div>
            </div>
            <div class="response-card" style="cursor:default;opacity:0.6;">
              <div class="response-card-header">
                <span class="response-card-label">Response B</span>
                <span class="response-card-badge wrong-badge" style="display:block;">✗ Not this one</span>
              </div>
              <div class="response-card-body">Financial stress is a common experience with significant psychological and physiological effects. Effective financial management strategies include budgeting frameworks such as the 50/30/20 rule, debt reduction methodologies including the avalanche and snowball methods, and emergency fund establishment targeting 3–6 months of expenses.</div>
            </div>
          </div>
          <div class="feedback-wrap correct show">
            <div class="feedback-heading">✓ That's right — and here's why it matters.</div>
            <div class="feedback-body">Response B is statistically plausible — it contains real financial advice that sounds authoritative. But it doesn't address what this person actually asked. They said they were stressed and didn't know where to start. Response A heard that.<br><br>A language model running on pure prediction will often produce Response B. It's seen thousands of personal finance articles. It's matching patterns. Response A required something different: understanding the person's emotional state and what they actually needed to hear first.<br><br>That gap — between what sounds right and what actually helps — is exactly what you're being trained to close.</div>
            <div class="feedback-takeaway">Your judgment is what turns pattern prediction into something genuinely useful. That's the job.</div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
          <button class="btn btn-ghost btn-sm" onclick="nextLesson()">Next Lesson <span class="arrow">→</span></button>
        </div>`;
    }

    return `
      <div class="player-meta">
        <div class="meta-chip"><span>🎯</span><span class="chip-val">Quick Check</span></div>
        <div class="meta-chip gold"><span>⚡</span><span class="chip-val">+25 XP</span><span>for completing</span></div>
      </div>
      <div class="interactive-wrap">
        <div class="interactive-setup">
          <div class="interactive-label">Quick Check</div>
          <div class="interactive-scenario">You just learned that language models predict the next word based on patterns — not understanding. Now see if you can spot the difference in practice.</div>
          <div class="chat-bubble-wrap">
            <div class="chat-bubble-avatar">👤</div>
            <div class="chat-bubble">I've been really stressed about money lately and I don't know where to start. What should I do?</div>
          </div>
          <div class="interactive-instruction">Two AI systems responded to the same message. Which response would actually help this person?</div>
        </div>
        <div class="response-grid">
          <div class="response-card" id="ic-card-a" onclick="selectInteractiveAnswer('a')">
            <div class="response-card-header">
              <span class="response-card-label">Response A</span>
              <span class="response-card-badge correct-badge">✓ Better response</span>
              <span class="response-card-badge wrong-badge">✗ Not this one</span>
            </div>
            <div class="response-card-body">That sounds really overwhelming — money stress is one of the hardest kinds because it touches everything. A good first step is just getting a clear picture of where things stand: what's coming in, what's going out, and what feels most urgent. Would it help to start there?</div>
          </div>
          <div class="response-card" id="ic-card-b" onclick="selectInteractiveAnswer('b')">
            <div class="response-card-header">
              <span class="response-card-label">Response B</span>
              <span class="response-card-badge correct-badge">✓ Better response</span>
              <span class="response-card-badge wrong-badge">✗ Not this one</span>
            </div>
            <div class="response-card-body">Financial stress is a common experience with significant psychological and physiological effects. Effective financial management strategies include budgeting frameworks such as the 50/30/20 rule, debt reduction methodologies including the avalanche and snowball methods, and emergency fund establishment targeting 3–6 months of expenses.</div>
          </div>
        </div>
        <div class="feedback-wrap correct" id="ic-feedback-correct">
          <div class="feedback-heading">✓ That's right — and here's why it matters.</div>
          <div class="feedback-body">Response B is statistically plausible — it contains real financial advice that sounds authoritative. But it doesn't address what this person actually asked. They said they were stressed and didn't know where to start. Response A heard that.<br><br>A language model running on pure prediction will often produce Response B. It's seen thousands of personal finance articles. It's matching patterns. Response A required something different: understanding the person's emotional state and what they actually needed to hear first.<br><br>That gap — between what sounds right and what actually helps — is exactly what you're being trained to close.</div>
          <div class="feedback-takeaway">Your judgment is what turns pattern prediction into something genuinely useful. That's the job.</div>
        </div>
        <div class="feedback-wrap wrong" id="ic-feedback-wrong">
          <div class="feedback-heading">Not quite — take another look.</div>
          <div class="feedback-body">Response B contains accurate information, but accuracy alone isn't what makes a response helpful. The person said they were stressed and didn't know where to start. Response B ignored both of those things and produced a structured financial overview instead.<br><br>That's what pure pattern prediction does — it matches content to topic, not response to person. Response A actually addressed what was asked: the overwhelm, the not knowing where to begin, the need for a human entry point before the strategy.<br><br>This is the gap you'll be evaluating on every platform task.</div>
          <div class="feedback-takeaway">Helpful means it served this specific person in this specific moment — not just that it was technically correct.</div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1rem;">
        <button class="btn btn-primary" id="ic-continue-btn" onclick="completeInteractive(${idx})" style="display:none;">Continue <span class="arrow">→</span></button>
      </div>`;
  }
  return '<p style="color:var(--text-muted);">Interactive content coming soon.</p>';
}

async function completeInteractive(idx) {
  const course = appState.currentCourse;
  const lesson = course.lessons[idx];
  const key = course.id + '-' + lesson.id;
  const u = appState.user;

  if (!u.lessonsCompleted.includes(key)) {
    u.lessonsCompleted.push(key);
    // Save to Supabase
    await saveProgressToSupabase(course.id, lesson.id);
    checkBadges();
  }
  renderLessonList();
  updateXPBar();

  // Navigate to next — respect lock
  const nextIdx = idx + 1;
  if (nextIdx < course.lessons.length) {
    const nextL = course.lessons[nextIdx];
    const isAdminView = appState.isAdmin || appState.isImpersonating;
    if (nextL && nextL.locked && !isAdminView) {
      showLockedModal(
        nextL.title + ' — Coming Soon',
        "This lesson is being built and will be available soon. You'll be notified when it's ready."
      );
    } else {
      loadLesson(nextIdx);
    }
  } else {
    showToast('success', '✓', "You've reached the end of this course!");
  }
}

function selectInteractiveAnswer(choice) {
  const cardA = document.getElementById('ic-card-a');
  const cardB = document.getElementById('ic-card-b');
  const feedbackCorrect = document.getElementById('ic-feedback-correct');
  const feedbackWrong = document.getElementById('ic-feedback-wrong');
  const continueBtn = document.getElementById('ic-continue-btn');
  if (!cardA || !cardB) return;
  // Already answered
  if (cardA.classList.contains('selected-correct') || cardA.classList.contains('selected-wrong')) return;

  const isCorrect = choice === 'a';
  // Check if interactive already completed — don't re-award XP
  const course = appState.currentCourse;
  const interactiveKey = course ? course.id + '-l1i' : null;
  const alreadyDone = interactiveKey && appState.user && appState.user.lessonsCompleted.includes(interactiveKey);

  if (isCorrect) {
    cardA.classList.add('selected-correct');
    cardB.classList.add('reveal-correct');
    feedbackCorrect.classList.add('show');
    if (!alreadyDone) {
      addXP(25);
      spawnXPPop('+25 XP');
      showMilestoneBanner('🎯', 'Nice judgment call! +25 XP');
    }
  } else {
    cardB.classList.add('selected-wrong');
    cardA.classList.add('reveal-correct');
    feedbackWrong.classList.add('show');
  }

  // Disable further clicks permanently
  cardA.onclick = null;
  cardB.onclick = null;
  cardA.style.cursor = 'default';
  cardB.style.cursor = 'default';
  cardA.style.transform = '';
  cardB.style.transform = '';

  // Show continue button and scroll to feedback
  if (continueBtn) continueBtn.style.display = 'inline-flex';
  setTimeout(() => {
    const fb = isCorrect ? feedbackCorrect : feedbackWrong;
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 200);
}

function getDemoHeroImage(lessonId) {
  const heroes = {
    'ld1': `
      <svg width="100%" height="100%" viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
        <defs>
          <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#080b10"/>
            <stop offset="100%" stop-color="#0d1220"/>
          </linearGradient>
          <linearGradient id="cg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00e5c8"/>
            <stop offset="100%" stop-color="#9b5de5"/>
          </linearGradient>
          <linearGradient id="pulse1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00e5c8" stop-opacity="0"/>
            <stop offset="50%" stop-color="#00e5c8" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#9b5de5" stop-opacity="0"/>
          </linearGradient>
          <filter id="glow1"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <!-- bg -->
        <rect width="800" height="420" fill="url(#bg1)"/>
        <!-- grid lines -->
        <line x1="0" y1="100" x2="800" y2="100" stroke="#00e5c8" stroke-width="0.3" stroke-opacity="0.12"/>
        <line x1="0" y1="210" x2="800" y2="210" stroke="#00e5c8" stroke-width="0.3" stroke-opacity="0.12"/>
        <line x1="0" y1="320" x2="800" y2="320" stroke="#00e5c8" stroke-width="0.3" stroke-opacity="0.12"/>
        <line x1="200" y1="0" x2="200" y2="420" stroke="#00e5c8" stroke-width="0.3" stroke-opacity="0.12"/>
        <line x1="400" y1="0" x2="400" y2="420" stroke="#00e5c8" stroke-width="0.3" stroke-opacity="0.12"/>
        <line x1="600" y1="0" x2="600" y2="420" stroke="#00e5c8" stroke-width="0.3" stroke-opacity="0.12"/>

        <!-- Human nodes -->
        <circle cx="160" cy="210" r="32" fill="none" stroke="#00e5c8" stroke-width="1.5" stroke-opacity="0.5"/>
        <circle cx="160" cy="210" r="24" fill="rgba(0,229,200,0.08)"/>
        <text x="160" y="215" text-anchor="middle" font-size="18" fill="#00e5c8">👤</text>

        <circle cx="160" cy="330" r="32" fill="none" stroke="#00e5c8" stroke-width="1.5" stroke-opacity="0.5"/>
        <circle cx="160" cy="330" r="24" fill="rgba(0,229,200,0.08)"/>
        <text x="160" y="335" text-anchor="middle" font-size="18" fill="#00e5c8">👤</text>

        <circle cx="160" cy="90" r="32" fill="none" stroke="#00e5c8" stroke-width="1.5" stroke-opacity="0.5"/>
        <circle cx="160" cy="90" r="24" fill="rgba(0,229,200,0.08)"/>
        <text x="160" y="95" text-anchor="middle" font-size="18" fill="#00e5c8">👤</text>

        <!-- Arrows to model -->
        <line x1="194" y1="100" x2="310" y2="175" stroke="url(#pulse1)" stroke-width="1.5"/>
        <line x1="194" y1="210" x2="310" y2="210" stroke="url(#pulse1)" stroke-width="1.5"/>
        <line x1="194" y1="320" x2="310" y2="245" stroke="url(#pulse1)" stroke-width="1.5"/>
        <!-- arrowheads -->
        <polygon points="310,175 300,170 303,180" fill="#00e5c8" opacity="0.7"/>
        <polygon points="310,210 300,205 300,215" fill="#00e5c8" opacity="0.7"/>
        <polygon points="310,245 300,240 303,250" fill="#00e5c8" opacity="0.7"/>

        <!-- Central brain/model -->
        <circle cx="400" cy="210" r="64" fill="none" stroke="url(#cg1)" stroke-width="2"/>
        <circle cx="400" cy="210" r="52" fill="rgba(155,93,229,0.07)"/>
        <circle cx="400" cy="210" r="38" fill="rgba(0,229,200,0.05)"/>
        <text x="400" y="220" text-anchor="middle" font-size="36" fill="url(#cg1)" filter="url(#glow1)">🧠</text>
        <text x="400" y="293" text-anchor="middle" font-size="9" fill="#9b5de5" font-family="DM Sans,sans-serif" letter-spacing="0.15em" text-transform="uppercase">LANGUAGE MODEL</text>

        <!-- Output arrow -->
        <line x1="452" y1="210" x2="560" y2="210" stroke="url(#pulse1)" stroke-width="2"/>
        <polygon points="560,210 550,204 550,216" fill="#9b5de5" opacity="0.9"/>

        <!-- Output box -->
        <rect x="568" y="170" width="170" height="80" rx="8" fill="rgba(155,93,229,0.1)" stroke="#9b5de5" stroke-width="1.2" stroke-opacity="0.5"/>
        <text x="653" y="200" text-anchor="middle" font-size="9" fill="#9b5de5" font-family="DM Sans,sans-serif" letter-spacing="0.12em">IMPROVED OUTPUT</text>
        <rect x="585" y="210" width="136" height="6" rx="3" fill="rgba(155,93,229,0.3)"/>
        <rect x="585" y="222" width="100" height="6" rx="3" fill="rgba(155,93,229,0.2)"/>
        <rect x="585" y="234" width="118" height="6" rx="3" fill="rgba(155,93,229,0.15)"/>

        <!-- Label -->
        <text x="400" y="48" text-anchor="middle" font-size="13" fill="white" font-family="DM Sans,sans-serif" font-weight="700" opacity="0.9">Reinforcement Learning from Human Feedback</text>
        <text x="400" y="66" text-anchor="middle" font-size="10" fill="#00e5c8" font-family="DM Sans,sans-serif" opacity="0.7" letter-spacing="0.12em">HUMAN SIGNAL → MODEL IMPROVEMENT</text>

        <!-- Feedback label -->
        <text x="120" y="195" text-anchor="middle" font-size="9" fill="#00e5c8" font-family="DM Sans,sans-serif" letter-spacing="0.1em">CONTRIBUTORS</text>
        <text x="120" y="207" text-anchor="middle" font-size="8" fill="#00e5c8" font-family="DM Sans,sans-serif" opacity="0.6">Rate & Rank</text>
      </svg>`,

    'ld2': `
      <svg width="100%" height="100%" viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
        <defs>
          <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#080b10"/>
            <stop offset="100%" stop-color="#0d1220"/>
          </linearGradient>
          <linearGradient id="cg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00e5c8"/>
            <stop offset="100%" stop-color="#9b5de5"/>
          </linearGradient>
          <filter id="glow2"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect width="800" height="420" fill="url(#bg2)"/>

        <!-- Rubric card: Helpfulness -->
        <rect x="50" y="60" width="155" height="110" rx="10" fill="rgba(0,229,200,0.07)" stroke="#00e5c8" stroke-width="1.2" stroke-opacity="0.5"/>
        <text x="128" y="88" text-anchor="middle" font-size="22">✅</text>
        <text x="128" y="110" text-anchor="middle" font-size="11" fill="#00e5c8" font-family="DM Sans,sans-serif" font-weight="700">Helpfulness</text>
        <text x="128" y="125" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.5)" font-family="DM Sans,sans-serif">Did it address</text>
        <text x="128" y="137" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.5)" font-family="DM Sans,sans-serif">what was asked?</text>
        <!-- score bar -->
        <rect x="68" y="150" width="120" height="7" rx="3.5" fill="rgba(0,229,200,0.15)"/>
        <rect x="68" y="150" width="104" height="7" rx="3.5" fill="#00e5c8" opacity="0.8"/>
        <text x="178" y="160" font-size="8" fill="#00e5c8" font-family="DM Mono,monospace">87%</text>

        <!-- Rubric card: Accuracy -->
        <rect x="225" y="60" width="155" height="110" rx="10" fill="rgba(155,93,229,0.07)" stroke="#9b5de5" stroke-width="1.2" stroke-opacity="0.5"/>
        <text x="303" y="88" text-anchor="middle" font-size="22">🎯</text>
        <text x="303" y="110" text-anchor="middle" font-size="11" fill="#9b5de5" font-family="DM Sans,sans-serif" font-weight="700">Accuracy</text>
        <text x="303" y="125" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.5)" font-family="DM Sans,sans-serif">Is every factual</text>
        <text x="303" y="137" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.5)" font-family="DM Sans,sans-serif">claim correct?</text>
        <rect x="243" y="150" width="120" height="7" rx="3.5" fill="rgba(155,93,229,0.15)"/>
        <rect x="243" y="150" width="72" height="7" rx="3.5" fill="#9b5de5" opacity="0.8"/>
        <text x="353" y="160" font-size="8" fill="#9b5de5" font-family="DM Mono,monospace">60%</text>

        <!-- Rubric card: Clarity -->
        <rect x="400" y="60" width="155" height="110" rx="10" fill="rgba(0,229,200,0.05)" stroke="#00e5c8" stroke-width="1.2" stroke-opacity="0.35"/>
        <text x="478" y="88" text-anchor="middle" font-size="22">💡</text>
        <text x="478" y="110" text-anchor="middle" font-size="11" fill="#00e5c8" font-family="DM Sans,sans-serif" font-weight="700">Clarity</text>
        <text x="478" y="125" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.5)" font-family="DM Sans,sans-serif">Is it easy to</text>
        <text x="478" y="137" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.5)" font-family="DM Sans,sans-serif">understand?</text>
        <rect x="418" y="150" width="120" height="7" rx="3.5" fill="rgba(0,229,200,0.15)"/>
        <rect x="418" y="150" width="96" height="7" rx="3.5" fill="#00e5c8" opacity="0.6"/>
        <text x="528" y="160" font-size="8" fill="#00e5c8" font-family="DM Mono,monospace">80%</text>

        <!-- Rubric card: Tone -->
        <rect x="575" y="60" width="155" height="110" rx="10" fill="rgba(245,200,66,0.06)" stroke="#f5c842" stroke-width="1.2" stroke-opacity="0.4"/>
        <text x="653" y="88" text-anchor="middle" font-size="22">🎭</text>
        <text x="653" y="110" text-anchor="middle" font-size="11" fill="#f5c842" font-family="DM Sans,sans-serif" font-weight="700">Tone</text>
        <text x="653" y="125" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.5)" font-family="DM Sans,sans-serif">Is the register</text>
        <text x="653" y="137" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.5)" font-family="DM Sans,sans-serif">appropriate?</text>
        <rect x="593" y="150" width="120" height="7" rx="3.5" fill="rgba(245,200,66,0.15)"/>
        <rect x="593" y="150" width="38" height="7" rx="3.5" fill="#f5c842" opacity="0.8"/>
        <text x="703" y="160" font-size="8" fill="#f5c842" font-family="DM Mono,monospace">32%</text>

        <!-- Example response area -->
        <rect x="50" y="210" width="700" height="160" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
        <text x="70" y="235" font-size="9" fill="rgba(255,255,255,0.35)" font-family="DM Sans,sans-serif" letter-spacing="0.12em">MODEL RESPONSE</text>
        <rect x="70" y="248" width="520" height="8" rx="4" fill="rgba(255,255,255,0.1)"/>
        <rect x="70" y="263" width="380" height="8" rx="4" fill="rgba(255,255,255,0.07)"/>
        <rect x="70" y="278" width="460" height="8" rx="4" fill="rgba(255,255,255,0.07)"/>
        <rect x="70" y="293" width="300" height="8" rx="4" fill="rgba(255,255,255,0.05)"/>

        <!-- Fail indicator on Tone -->
        <rect x="590" y="248" width="130" height="26" rx="6" fill="rgba(255,107,107,0.1)" stroke="rgba(255,107,107,0.4)" stroke-width="1"/>
        <text x="655" y="265" text-anchor="middle" font-size="9" fill="#ff6b6b" font-family="DM Sans,sans-serif" font-weight="600">⚠ Tone mismatch</text>

        <text x="400" y="380" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.3)" font-family="DM Sans,sans-serif" font-style="italic">Each dimension is scored independently — a response can pass three and fail one</text>

        <text x="400" y="40" text-anchor="middle" font-size="13" fill="white" font-family="DM Sans,sans-serif" font-weight="700" opacity="0.9">Evaluating Written Responses</text>
        <text x="400" y="55" text-anchor="middle" font-size="9.5" fill="#00e5c8" font-family="DM Sans,sans-serif" letter-spacing="0.12em" opacity="0.7">WHAT GOOD LOOKS LIKE ACROSS FOUR DIMENSIONS</text>
      </svg>`
  };
  return heroes[lessonId] || `<div class="video-placeholder"><div class="play-btn">▶</div><p>Video coming soon</p></div>`;
}

function getEmbedHTML(url) {
  if (!url) return '';
  // YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\n?#]+)/);
  if (ytMatch) return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen></iframe>`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" allowfullscreen></iframe>`;
  // Google Drive
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) return `<iframe src="https://drive.google.com/file/d/${driveMatch[1]}/preview" allowfullscreen></iframe>`;
  // HeyGen / Synthesia / direct iframe
  return `<iframe src="${url}" allowfullscreen></iframe>`;
}

function renderQuizHTML(course, lessonIdx) {
  const quizzes = course.quizzes;
  if (!quizzes || !quizzes.length) return '<p style="color:var(--text-muted)">No questions for this section yet.</p>';
  return `
    <div class="player-meta">
      <div class="meta-chip gam-tooltip-trigger tooltip-pulse">
        <span>❓</span><span class="chip-val">${quizzes.length}</span><span>questions</span>
        <div class="gam-tooltip"><div class="gam-tooltip-title">Knowledge Checks</div>Each question tests real understanding — not just recall. Answer correctly to earn XP and build toward badges.</div>
      </div>
      <div class="meta-chip gold gam-tooltip-trigger tooltip-pulse">
        <span>⚡</span><span class="chip-val">+25 XP</span><span>per correct answer</span>
        <div class="gam-tooltip"><div class="gam-tooltip-title">XP System</div>Contributors earn XP for every lesson and correct answer. XP drives level progression, leaderboard rank, and badge unlocks — keeping engagement high.</div>
      </div>
    </div>
    ${quizzes.map((q,qi) => `
      <div class="quiz-wrap" id="quiz-${qi}">
        <div class="quiz-header">
          <span class="quiz-badge">Question ${qi+1}</span>
          <span class="quiz-title">${course.title}</span>
        </div>
        <div class="quiz-q">${q.question}</div>
        <div class="quiz-options">
          ${q.options.map((opt,oi) => `
            <div class="quiz-option" id="qo-${qi}-${oi}" onclick="selectAnswer(${qi},${oi})">
              <div class="quiz-option-letter">${String.fromCharCode(65+oi)}</div>
              <span>${opt}</span>
            </div>
          `).join('')}
        </div>
        <div class="quiz-explanation" id="qe-${qi}"><strong>Explanation:</strong> ${q.explanation}</div>
        <div class="quiz-actions">
          <button class="btn btn-v btn-sm" id="qbtn-${qi}" onclick="submitAnswer(${qi})" disabled>Submit Answer</button>
          <span class="quiz-score" id="qscore-${qi}"></span>
        </div>
      </div>
    `).join('')}
    <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
      <button class="btn btn-primary" onclick="completeLesson(${lessonIdx})">Finish & Continue <span class="arrow">→</span></button>
    </div>`;
}

let selectedAnswers = {};
function selectAnswer(qi, oi) {
  if (appState.quizAnswered[qi]) return;
  selectedAnswers[qi] = oi;
  document.querySelectorAll(`[id^="qo-${qi}-"]`).forEach(el => el.classList.remove('selected'));
  document.getElementById(`qo-${qi}-${oi}`).classList.add('selected');
  document.getElementById(`qbtn-${qi}`).disabled = false;
}

function submitAnswer(qi) {
  if (appState.quizAnswered[qi]) return;
  const course = appState.currentCourse;
  const q = course.quizzes[qi];
  const selected = selectedAnswers[qi];
  if (selected === undefined) return;
  appState.quizAnswered[qi] = true;

  const correct = selected === q.correct;
  document.querySelectorAll(`[id^="qo-${qi}-"]`).forEach((el,oi) => {
    if (oi === q.correct) el.classList.add('correct');
    else if (oi === selected && !correct) el.classList.add('wrong');
  });
  document.getElementById(`qe-${qi}`).classList.add('show');
  document.getElementById(`qbtn-${qi}`).disabled = true;
  document.getElementById(`qscore-${qi}`).textContent = correct ? '✓ Correct! +25 XP' : '✗ Incorrect — try again next time';
  document.getElementById(`qscore-${qi}`).style.color = correct ? 'var(--cyan)' : '#ff6b6b';

  if (correct) {
    addXP(25);
    appState.user.correctAnswers = (appState.user.correctAnswers||0) + 1;
    spawnXPPop('+25 XP');
    spawnConfetti();
    showMilestoneBanner('✅', 'Correct! +25 XP earned');
    checkBadges();
  }
}

function completeLesson(idx) {
  const course = appState.currentCourse;
  const lesson = course.lessons[idx];
  const key = course.id+'-'+lesson.id;
  const u = appState.user;

  if (!u.lessonsCompleted.includes(key)) {
    u.lessonsCompleted.push(key);
    saveProgressToSupabase(course.id, lesson.id);
    if (lesson.type !== 'quiz' && lesson.type !== 'practice') {
      addXP(50);
      spawnXPPop('+50 XP');
      const lessonNum = u.lessonsCompleted.filter(k => k.startsWith(course.id)).length;
      showMilestoneBanner('⚡', `Lesson complete! +50 XP`);
      // Progress milestones
      const videoLessons = course.lessons.filter(l => l.type !== 'quiz').length;
      const doneLessons = u.lessonsCompleted.filter(k => k.startsWith(course.id)).length;
      const pct = Math.round((doneLessons / videoLessons) * 100);
      if (pct >= 50 && pct < 100) {
        setTimeout(() => { showMilestoneBanner('🔥', 'Halfway there! Keep going'); spawnConfetti(); }, 1200);
      }
    }
    checkBadges();
  }
  renderLessonList();
  updateXPBar();
  updateWelcomeCallout();

  // Check course complete
  const allDone = course.lessons.every(l => u.lessonsCompleted.includes(course.id+'-'+l.id));
  if (allDone) {
    showToast('success','🎓',`Course complete! Great work.`);
    spawnConfetti();
    setTimeout(() => spawnConfetti(), 600);
    setTimeout(() => showMilestoneBanner('🏆', 'Course complete! Outstanding work'), 400);
    if (!u.badges.includes('course-complete')) {
      u.badges.push('course-complete');
      setTimeout(() => showLevelUp('Course Complete! 🎓','You\'ve finished the full course. Outstanding work.'), 1000);
    }
  }

  // Next lesson — check if locked before navigating
  const nextIdx = idx + 1;
  if (nextIdx < course.lessons.length) {
    const nextL = course.lessons[nextIdx];
    const isAdminView = appState.isAdmin || appState.isImpersonating;
    if (nextL && nextL.locked && !isAdminView) {
      showLockedModal(
        nextL.title + ' — Coming Soon',
        "This lesson is being built and will be available soon. You'll be notified when it's ready."
      );
    } else {
      loadLesson(nextIdx);
    }
  } else {
    showToast('success','✓','You\'ve reached the end of this course!');
  }
}

function prevLesson() {
  if (appState.currentLessonIdx > 0) loadLesson(appState.currentLessonIdx-1);
}
function nextLesson() {
  const course = appState.currentCourse;
  const max = course.lessons.length - 1;
  const nextIdx = appState.currentLessonIdx + 1;
  if (nextIdx > max) return;
  const nextLesson = course.lessons[nextIdx];
  const isAdminView = appState.isAdmin || appState.isImpersonating;
  if (nextLesson && nextLesson.locked && !isAdminView) {
    showLockedModal(
      nextLesson.title + ' — Coming Soon',
      "This lesson is being built and will be available soon. You'll be notified when it's ready."
    );
    return;
  }
  loadLesson(nextIdx);
}

function exitPlayer() {
  showView('view-app');
  renderApp();
  navTo('dashboard');
}

// ════════════════════════════════
// GAMIFICATION
// ════════════════════════════════
function addXP(amount) {
  const u = appState.user;
  const prevLevel = u.level;
  u.xp += amount;
  updateXPBar();
  saveXPToSupabase();
  const newLevel = u.level;
  if (newLevel > prevLevel) {
    setTimeout(() => showLevelUp(`Level ${newLevel} Unlocked! 🚀`, `You've reached Level ${newLevel}. Keep going — you're building real skills.`), 800);
  }
}

function checkBadges() {
  const u = appState.user;
  const checks = [
    { id: 'first-lesson', condition: u.lessonsCompleted.length >= 1 },
    { id: 'quiz-ace', condition: (u.correctAnswers||0) >= 3 },
    { id: 'century', condition: u.xp >= 100 },
    { id: 'halfway', condition: u.xp >= 300 },
    { id: 'scholar', condition: u.xp >= 500 },
  ];
  checks.forEach(c => {
    if (c.condition && !u.badges.includes(c.id)) {
      u.badges.push(c.id);
      const badge = allBadges.find(b=>b.id===c.id);
      if (badge) showToast('success','✦', `Badge unlocked: ${badge.name}!`);
    }
  });
}

function spawnXPPop(text) {
  const el = document.createElement('div');
  el.className = 'xp-pop';
  el.textContent = text;
  el.style.left = (Math.random()*200+window.innerWidth/2-100)+'px';
  el.style.top = (window.innerHeight/2)+'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1900);
}

function spawnConfetti() {
  const colors = ['#00e5c8','#9b5de5','#f5c842','#ff6b9d','#00d4ff','#ffffff'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.top = '-20px';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = (Math.random() * 8 + 6) + 'px';
      el.style.height = (Math.random() * 8 + 6) + 'px';
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      el.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
      el.style.animationDelay = (Math.random() * 0.3) + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }, i * 18);
  }
}

function showMilestoneBanner(icon, text) {
  const banner = document.getElementById('milestone-banner');
  const iconEl = document.getElementById('milestone-icon');
  const textEl = document.getElementById('milestone-text');
  if (!banner) return;
  iconEl.textContent = icon;
  textEl.textContent = text;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 3500);
}

function showDemoIntro(callback) {
  const overlay = document.getElementById('demo-intro-overlay');
  if (!overlay) { if (callback) callback(); return; }
  overlay.style.display = 'flex';
  setTimeout(() => {
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('fade-out');
      if (callback) callback();
    }, 700);
  }, 2400);
}

function showLevelUp(title, desc) {
  document.getElementById('levelup-title').textContent = title;
  document.getElementById('levelup-desc').textContent = desc;
  document.getElementById('levelup-modal').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ════════════════════════════════
// ADMIN
// ════════════════════════════════
let lessonCount = 0;
let quizCount = 0;

function adminNavTo(panel) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.admin-tab[onclick="adminNavTo('${panel}')"]`)?.classList.add('active');
  document.getElementById(`admin-panel-${panel}`)?.classList.add('active');
  document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.toggle('active', n.getAttribute('onclick')?.includes(panel)));
  if (panel === 'students') renderAdminStudents();
  if (panel === 'stats') renderAdminStats();
  if (panel === 'submissions') renderAdminSubmissions();
  if (panel === 'announcements') loadAnnouncementRecipients();
  if (panel === 'baseline') loadBaselineAdmin();
}

// Inject tabs into admin on load (ensureAdminTabs also called on login)
document.addEventListener('DOMContentLoaded', () => { ensureAdminTabs(); });

function renderAdminCourses() {
  const container = document.getElementById('admin-courses-list');
  if (!container) return;
  container.innerHTML = courses.map(c => `
    <div class="pub-course-row">
      <div class="pub-emoji">${c.emoji}</div>
      <div class="pub-info">
        <div class="pub-name">${c.title}</div>
        <div class="pub-meta">${c.lessons.length} lessons · ${c.quizzes.length} questions · ${c.level}</div>
      </div>
      <span class="pub-status ${c.status}">${c.status}</span>
      <button class="btn btn-ghost btn-sm" onclick="editCourse('${c.id}')">Edit</button>
    </div>
  `).join('');
}

function editCourse(id) {
  const c = courses.find(x=>x.id===id);
  if (!c) return;
  adminNavTo('builder');
  document.getElementById('b-title').value = c.title;
  document.getElementById('b-level').value = c.level;
  document.getElementById('b-desc').value = c.desc;
  document.getElementById('b-emoji').value = c.emoji;
  document.getElementById('b-thumb').value = c.thumb;
  // Load lessons
  lessonCount = 0;
  document.getElementById('lesson-builder-list').innerHTML = '';
  c.lessons.forEach(l => addLesson(l));
  // Load quizzes
  quizCount = 0;
  document.getElementById('quiz-builder-list').innerHTML = '';
  c.quizzes.forEach(q => addQuiz(q));
  showToast('success','✓',`Editing: ${c.title}`);
}

function addLesson(data={}) {
  const idx = lessonCount++;
  const container = document.getElementById('lesson-builder-list');
  const div = document.createElement('div');
  div.className = 'lesson-builder-item';
  div.id = `lbi-${idx}`;
  div.innerHTML = `
    <div class="lbi-head" onclick="toggleLBI(${idx})">
      <span class="lbi-drag">⋮⋮</span>
      <span class="lbi-num">Lesson ${idx+1}</span>
      <span class="lbi-title-preview" id="lbi-preview-${idx}">${data.title||'New Lesson'}</span>
      <span class="lbi-remove" onclick="event.stopPropagation();removeLBI(${idx})">✕</span>
    </div>
    <div class="lbi-body" id="lbi-body-${idx}">
      <div class="field-row">
        <div class="field-group">
          <label>Lesson Title</label>
          <input type="text" id="lbi-title-${idx}" value="${data.title||''}" placeholder="e.g. How Rubrics Work" oninput="document.getElementById('lbi-preview-${idx}').textContent=this.value||'New Lesson'">
        </div>
        <div class="field-group">
          <label>Type</label>
          <select id="lbi-type-${idx}">
            <option value="video" ${data.type==='video'?'selected':''}>Video Lesson</option>
            <option value="quiz" ${data.type==='quiz'?'selected':''}>Knowledge Check</option>
          </select>
        </div>
      </div>
      <div class="field-group">
        <label>Video URL (YouTube, Vimeo, Google Drive, HeyGen, Synthesia)</label>
        <input type="text" id="lbi-video-${idx}" value="${data.videoUrl||''}" placeholder="Paste video URL here">
      </div>
      <div class="field-group">
        <label>Lesson Notes / Summary Text</label>
        <textarea id="lbi-content-${idx}" placeholder="Key concepts or notes for this lesson...">${data.content||''}</textarea>
      </div>
      <div class="field-group">
        <label>Key Points (one per line)</label>
        <textarea id="lbi-kp-${idx}" placeholder="Point 1&#10;Point 2&#10;Point 3">${(data.keyPoints||[]).join('\n')}</textarea>
      </div>
    </div>`;
  container.appendChild(div);
}

function toggleLBI(idx) {
  const body = document.getElementById(`lbi-body-${idx}`);
  body.classList.toggle('open');
}

function removeLBI(idx) {
  document.getElementById(`lbi-${idx}`)?.remove();
}

function addQuiz(data={}) {
  const idx = quizCount++;
  const container = document.getElementById('quiz-builder-list');
  const div = document.createElement('div');
  div.className = 'quiz-builder-item';
  div.id = `qbi-${idx}`;
  const opts = data.options || ['','','',''];
  div.innerHTML = `
    <div class="qbi-head">
      <span style="font-family:'DM Sans',sans-serif;font-size:0.72rem;color:var(--text-dim);">Question ${idx+1}</span>
      <span class="lbi-remove" onclick="document.getElementById('qbi-${idx}').remove()">✕</span>
    </div>
    <div class="field-group">
      <label>Question</label>
      <input type="text" id="qbi-q-${idx}" value="${data.question||''}" placeholder="What does X mean?">
    </div>
    <div class="field-group">
      <label>Answer Options (select correct)</label>
      ${opts.map((opt,oi)=>`
        <div class="option-row">
          <input type="radio" name="correct-${idx}" value="${oi}" ${data.correct===oi?'checked':''}>
          <span class="option-correct-label">${String.fromCharCode(65+oi)}</span>
          <input type="text" id="qbi-opt-${idx}-${oi}" value="${opt}" placeholder="Option ${String.fromCharCode(65+oi)}">
        </div>
      `).join('')}
    </div>
    <div class="field-group">
      <label>Explanation (shown after answer)</label>
      <textarea id="qbi-exp-${idx}" placeholder="Why is this the correct answer?">${data.explanation||''}</textarea>
    </div>`;
  container.appendChild(div);
}

function publishCourse() {
  const title = document.getElementById('b-title').value.trim();
  if (!title) { showToast('error','⚠','Please add a course title.'); return; }
  const newCourse = {
    id: 'course-'+Date.now(),
    title,
    level: document.getElementById('b-level').value,
    desc: document.getElementById('b-desc').value,
    emoji: document.getElementById('b-emoji').value || '📚',
    thumb: document.getElementById('b-thumb').value,
    status: 'live',
    lessons: collectLessons(),
    quizzes: collectQuizzes(),
  };
  courses.push(newCourse);
  showToast('success','✓',`"${title}" published successfully!`);
  adminNavTo('courses');
  renderAdminCourses();
  resetBuilder();
}

function saveDraft() {
  showToast('success','💾','Draft saved.');
}

function collectLessons() {
  const lessons = [];
  document.querySelectorAll('[id^="lbi-title-"]').forEach(el => {
    const idx = el.id.replace('lbi-title-','');
    const kpRaw = document.getElementById(`lbi-kp-${idx}`)?.value || '';
    lessons.push({
      id: 'l'+idx,
      title: el.value || `Lesson ${parseInt(idx)+1}`,
      type: document.getElementById(`lbi-type-${idx}`)?.value || 'video',
      videoUrl: document.getElementById(`lbi-video-${idx}`)?.value || '',
      content: document.getElementById(`lbi-content-${idx}`)?.value || '',
      keyPoints: kpRaw.split('\n').map(s=>s.trim()).filter(Boolean),
    });
  });
  return lessons;
}

function collectQuizzes() {
  const quizzes = [];
  document.querySelectorAll('[id^="qbi-q-"]').forEach(el => {
    const idx = el.id.replace('qbi-q-','');
    const opts = [0,1,2,3].map(oi => document.getElementById(`qbi-opt-${idx}-${oi}`)?.value || '').filter(Boolean);
    const correctRadio = document.querySelector(`input[name="correct-${idx}"]:checked`);
    quizzes.push({
      id: 'q'+idx,
      question: el.value,
      options: opts,
      correct: correctRadio ? parseInt(correctRadio.value) : 0,
      explanation: document.getElementById(`qbi-exp-${idx}`)?.value || '',
    });
  });
  return quizzes;
}

function resetBuilder() {
  document.getElementById('b-title').value = '';
  document.getElementById('b-desc').value = '';
  document.getElementById('b-emoji').value = '';
  document.getElementById('lesson-builder-list').innerHTML = '';
  document.getElementById('quiz-builder-list').innerHTML = '';
  lessonCount = 0; quizCount = 0;
}

async function renderAdminStudents() {
  const loading = document.getElementById('admin-students-loading');
  const container = document.getElementById('admin-students-list');
  if (!container) return;
  loading.style.display = 'block';
  container.style.display = 'none';

  try {
    // Get all profiles — no role filter so RLS doesn't block
    const { data: profiles, error } = await _supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });

    // If RLS blocks this, fall back to user_xp table which has less restriction
    let finalProfiles = profiles;
    if (error || !profiles || !profiles.length) {
      const { data: xpFallback } = await _supabase.from('user_xp').select('user_id, xp, level, streak, last_active');
      if (xpFallback && xpFallback.length) {
        finalProfiles = xpFallback.map(x => ({ id: x.user_id, email: 'user-' + x.user_id.slice(0,8), full_name: null, role: 'student', created_at: x.last_active }));
      } else if (error) {
        throw error;
      }
    }

    // Get XP for all users
    const { data: xpData } = await _supabase.from('user_xp').select('user_id, xp, level, streak');
    const xpMap = {};
    (xpData || []).forEach(x => { xpMap[x.user_id] = x; });

    // Get lesson completion counts
    const { data: progressData } = await _supabase.from('course_progress').select('user_id, lesson_id').eq('completed', true);
    const progressMap = {};
    (progressData || []).forEach(p => {
      progressMap[p.user_id] = (progressMap[p.user_id] || 0) + 1;
    });

    if (!finalProfiles || !finalProfiles.length) {
      loading.textContent = 'No students have signed up yet.';
      return;
    }

    loading.style.display = 'none';
    container.style.display = 'block';

    const students = finalProfiles.filter(p => p.role === 'student' || !p.role);
    const admins = finalProfiles.filter(p => p.role === 'admin');

    container.innerHTML = `
      <div style="font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.75rem;">
        ${students.length} students · ${admins.length} admins · ${finalProfiles.length} total accounts
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border-w);border-radius:10px;overflow:hidden;">
        <div style="display:grid;grid-template-columns:1.5fr 1.8fr 80px 60px 80px 100px 60px;gap:1rem;padding:0.75rem 1.2rem;background:var(--bg3);font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);">
          <div>Name</div><div>Email</div><div>Level</div><div>XP</div><div>Lessons</div><div>Joined</div><div></div>
        </div>
        ${finalProfiles.map(p => {
          const xp = xpMap[p.id] || { xp: 0, level: 1 };
          const lessons = progressMap[p.id] || 0;
          const joined = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const displayName = p.full_name || p.email.split('@')[0].replace(/[^a-zA-Z]/g,' ').trim();
          const isAdmin = ADMIN_EMAILS.includes(p.email.toLowerCase());
          return `
            <div style="display:grid;grid-template-columns:1.5fr 1.8fr 80px 60px 80px 100px 60px;gap:1rem;padding:0.85rem 1.2rem;border-top:1px solid var(--border-w);align-items:center;transition:background 0.18s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''">
              <div style="font-size:0.88rem;font-weight:500;">${displayName} ${isAdmin ? '<span style="font-size:0.65rem;color:var(--gold);border:1px solid rgba(245,200,66,0.3);padding:0.1rem 0.4rem;border-radius:3px;margin-left:0.3rem;">ADMIN</span>' : ''}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.email}</div>
              <div style="font-size:0.82rem;color:var(--violet);">Lv ${xp.level}</div>
              <div style="font-size:0.82rem;color:var(--cyan);">${xp.xp}</div>
              <div style="font-size:0.82rem;color:var(--text-muted);">${lessons}</div>
              <div style="font-size:0.78rem;color:var(--text-dim);">${joined}</div>
              <div><button class="btn btn-ghost btn-sm" onclick="impersonateStudentById('${p.id}')" style="font-size:0.72rem;padding:0.3rem 0.7rem;">👁 View</button></div>
            </div>`;
        }).join('')}
      </div>`;
  } catch(e) {
    console.error(e);
    loading.textContent = 'Failed to load students. Check Supabase connection.';
    loading.style.color = '#ff6b6b';
  }
}

function refreshStudents() { renderAdminStudents(); }

async function impersonateStudentById(uid) {
  try {
    // Always fetch fresh data from Supabase — never use stale inline values
    const [profileRes, xpRes, progressRes] = await Promise.all([
      _supabase.from('profiles').select('full_name, email').eq('id', uid).single(),
      _supabase.from('user_xp').select('xp, level, streak').eq('user_id', uid).single(),
      _supabase.from('course_progress').select('course_id, lesson_id').eq('user_id', uid).eq('completed', true)
    ]);
    const profile = profileRes.data || {};
    const xpData = xpRes.data || { xp: 0, level: 1, streak: 1 };
    const lessonsCompleted = (progressRes.data || []).map(r => r.course_id + '-' + r.lesson_id);
    const name = profile.full_name || (profile.email || '').split('@')[0].replace(/[^a-zA-Z]/g,' ').trim() || 'Student';
    const email = profile.email || '';

    appState.prevAdminState = { isAdmin: true, user: appState.user };
    appState.user = {
      name, email,
      supabaseId: uid,
      xp: xpData.xp || 0,
      level: xpData.level || 1,
      streak: xpData.streak || 1,
      lessonsCompleted,
      correctAnswers: 0,
      badges: []
    };
    appState.isAdmin = false;
    appState.isImpersonating = true;
    await loadLeaderboard();
    showView('view-app');
    renderApp();
    navTo('dashboard');
    const banner = document.getElementById('impersonate-banner');
    if (banner) banner.style.display = 'flex';
    document.getElementById('impersonate-name').textContent = name;
  } catch(e) {
    showToast('error', '⚠', 'Failed to load student data.');
    console.error(e);
  }
}

async function impersonateStudent(uid, name, email, xp, level, streak, lessons) {
  // Load their real progress from Supabase
  try {
    const { data: progressData } = await _supabase.from('course_progress').select('course_id,lesson_id').eq('user_id', uid).eq('completed', true);
    const lessonsCompleted = (progressData || []).map(r => r.course_id + '-' + r.lesson_id);
    // Store admin session so we can return
    appState.prevAdminState = { isAdmin: true, user: appState.user };
    // Set up spoofed user state
    appState.user = {
      name, email,
      supabaseId: uid,
      xp, level, streak,
      lessonsCompleted,
      correctAnswers: 0,
      badges: []
    };
    appState.isAdmin = false;
    appState.isImpersonating = true;
    await loadLeaderboard();
    showView('view-app');
    renderApp();
    navTo('dashboard');
    // Show impersonate banner
    const banner = document.getElementById('impersonate-banner');
    if (banner) { banner.style.display = 'flex'; }
    document.getElementById('impersonate-name').textContent = name;
  } catch(e) {
    showToast('error', '⚠', 'Failed to load student data.');
    console.error(e);
  }
}

function exitImpersonate() {
  appState.isImpersonating = false;
  appState.user = appState.prevAdminState?.user || { name: 'Admin', email: ADMIN_EMAIL };
  appState.isAdmin = true;
  appState.prevAdminState = null;
  const banner = document.getElementById('impersonate-banner');
  if (banner) banner.style.display = 'none';
  ensureAdminTabs();
  showView('view-admin');
  renderAdminCourses();
  adminNavTo('students');
}

async function renderAdminStats() {
  const loading = document.getElementById('admin-stats-loading');
  const content = document.getElementById('admin-stats-content');
  if (!content) return;
  loading.style.display = 'block';
  content.style.display = 'none';

  try {
    const { data: progressData } = await _supabase.from('course_progress').select('user_id, course_id, lesson_id').eq('completed', true);
    const { data: xpData } = await _supabase.from('user_xp').select('user_id, xp, level');
    const { data: profiles } = await _supabase.from('profiles').select('id').eq('role', 'student');

    const totalStudents = (profiles || []).length;
    const totalXP = (xpData || []).reduce((a, x) => a + (x.xp || 0), 0);
    const avgXP = totalStudents ? Math.round(totalXP / totalStudents) : 0;
    const totalCompletions = (progressData || []).length;

    // Per course stats
    const courseStats = {};
    courses.filter(c => !c.isDemo).forEach(c => {
      const completions = (progressData || []).filter(p => p.course_id === c.id);
      const uniqueStudents = new Set(completions.map(p => p.user_id)).size;
      const totalLessons = c.lessons.filter(l => l.type !== 'quiz').length;
      courseStats[c.id] = { title: c.title, emoji: c.emoji, uniqueStudents, completions: completions.length, totalLessons };
    });

    loading.style.display = 'none';
    content.style.display = 'block';

    content.innerHTML = `
      <!-- Summary stats -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem;">
        ${[
          { val: totalStudents, label: 'Total Students', color: 'var(--cyan)' },
          { val: totalCompletions, label: 'Lessons Completed', color: 'var(--violet)' },
          { val: avgXP, label: 'Avg XP per Student', color: 'var(--gold)' },
          { val: totalXP, label: 'Total XP Earned', color: 'var(--text)' },
        ].map(s => `
          <div style="background:var(--bg2);border:1px solid var(--border-w);border-radius:8px;padding:1.2rem 1.4rem;">
            <div style="font-size:1.8rem;font-weight:800;color:${s.color};margin-bottom:0.3rem;">${s.val}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">${s.label}</div>
          </div>`).join('')}
      </div>

      <!-- Per course breakdown -->
      <div style="font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.75rem;">Course Breakdown</div>
      <div style="display:flex;flex-direction:column;gap:1rem;">
        ${Object.values(courseStats).map(c => {
          const pct = c.totalLessons && c.uniqueStudents ? Math.round((c.completions / (c.uniqueStudents * c.totalLessons)) * 100) : 0;
          return `
            <div style="background:var(--bg2);border:1px solid var(--border-w);border-radius:10px;padding:1.4rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <span style="font-size:1.4rem;">${c.emoji}</span>
                  <span style="font-weight:700;font-size:0.95rem;">${c.title}</span>
                </div>
                <span style="font-size:0.78rem;color:var(--text-muted);">${c.uniqueStudents} students enrolled</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);margin-bottom:0.5rem;">
                <span>${c.completions} lesson completions</span>
                <span>${pct}% avg completion</span>
              </div>
              <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${Math.min(pct,100)}%;background:linear-gradient(90deg,var(--cyan),var(--violet));border-radius:3px;transition:width 1s ease;"></div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  } catch(e) {
    loading.textContent = 'Failed to load stats.';
    loading.style.color = '#ff6b6b';
  }
}

function refreshStats() { renderAdminStats(); }

async function renderAdminSubmissions() {
  const loading = document.getElementById('admin-submissions-loading');
  const container = document.getElementById('admin-submissions-list');
  if (!container) return;
  loading.style.display = 'block';
  container.style.display = 'none';

  try {
    const { data: submissions, error } = await _supabase
      .from('task_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Get profiles to show emails
    const { data: profiles } = await _supabase.from('profiles').select('id, email');
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p.email; });

    loading.style.display = 'none';
    container.style.display = 'block';

    if (!submissions || !submissions.length) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.88rem;padding:1rem 0;">No task submissions yet. Students will appear here once they complete practice tasks in Course 3.</div>';
      return;
    }

    const avgRating = (s) => ((s.helpfulness + s.accuracy + s.format + s.instruction_following) / 4).toFixed(1);

    container.innerHTML = `
      <div style="font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.75rem;">
        ${submissions.length} submissions
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        ${submissions.map(s => {
          const email = profileMap[s.user_id] || 'Unknown';
          const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const avg = avgRating(s);
          const avgColor = avg >= 4 ? 'var(--cyan)' : avg >= 3 ? 'var(--gold)' : '#ff6b6b';
          const task = practiceTasks.find(t => t.id === s.task_id);
          return `
            <div style="background:var(--bg2);border:1px solid var(--border-w);border-radius:10px;padding:1.25rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <span style="font-size:0.82rem;font-weight:600;">${email}</span>
                  <span style="font-size:0.72rem;color:var(--text-dim);">${s.task_id}</span>
                </div>
                <div style="display:flex;align-items:center;gap:1rem;">
                  <span style="font-size:1rem;font-weight:800;color:${avgColor};">★ ${avg}</span>
                  <span style="font-size:0.72rem;color:var(--text-dim);">${date}</span>
                </div>
              </div>
              ${task ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem;padding:0.6rem 0.8rem;background:var(--bg3);border-radius:6px;border-left:2px solid var(--border);">"${task.prompt}"</div>` : ''}
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-bottom:0.75rem;">
                ${[
                  { label: 'Helpfulness', val: s.helpfulness },
                  { label: 'Accuracy', val: s.accuracy },
                  { label: 'Format', val: s.format },
                  { label: 'Instruction', val: s.instruction_following },
                ].map(d => `
                  <div style="background:var(--bg3);border-radius:6px;padding:0.5rem;text-align:center;">
                    <div style="font-size:1rem;font-weight:700;color:${d.val >= 4 ? 'var(--cyan)' : d.val >= 3 ? 'var(--gold)' : '#ff6b6b'};">${d.val}</div>
                    <div style="font-size:0.65rem;color:var(--text-dim);">${d.label}</div>
                  </div>`).join('')}
              </div>
              <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.6;border-top:1px solid var(--border-w);padding-top:0.75rem;">
                <span style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;">Rationale: </span>
                ${s.rationale}
              </div>
              ${s.time_spent_seconds ? `<div style="font-size:0.72rem;color:var(--text-dim);margin-top:0.5rem;">⏱ ${Math.round(s.time_spent_seconds/60)}m ${s.time_spent_seconds%60}s spent</div>` : ''}
            </div>`;
        }).join('')}
      </div>`;
  } catch(e) {
    console.error(e);
    loading.textContent = 'Failed to load submissions. The task_submissions table may not exist yet — run the SQL in Supabase first.';
    loading.style.color = '#ff6b6b';
  }
}

function refreshSubmissions() { renderAdminSubmissions(); }

// ════════════════════════════════
// BASELINE ASSESSMENT SYSTEM
// ════════════════════════════════

let blState = {
  assessment: null,      // row from baseline_assessments
  tasks: [],             // ordered task rows
  attempts: {},          // taskId -> attempt row
  currentTaskIdx: 0,
  taskStartTime: null,
  filterReadyOnly: true,
};

// ── Entry point ──────────────────────────────────────────────────────
async function initBaseline() {
  if (!appState.user || !appState.user.supabaseId || appState.isDemo || appState.isAdmin) return;
  try {
    const { data: existing } = await _supabase
      .from('baseline_assessments')
      .select('*')
      .eq('user_id', appState.user.supabaseId)
      .single();
    blState.assessment = existing || null;
    updateBaselineNavLabel();
    // Override dashboard if not completed
    renderDashboardOrBaseline();
  } catch(e) {
    // No assessment yet — that's fine
    updateBaselineNavLabel();
    renderDashboardOrBaseline();
  }
}

function updateBaselineNavLabel() {
  const label = document.getElementById('nav-baseline-label');
  if (!label) return;
  const a = blState.assessment;
  if (!a) { label.textContent = 'Baseline Assessment'; return; }
  if (a.status === 'completed') label.textContent = 'Baseline ✓';
  else if (a.status === 'in_progress') label.textContent = `Baseline (${a.tasks_completed_count}/8)`;
  else label.textContent = 'Baseline Assessment';
}

function renderDashboardOrBaseline() {
  const a = blState.assessment;
  const dashEl = document.getElementById('page-dashboard');
  if (!dashEl) return;
  if (!a || a.status !== 'completed') {
    renderBaselineDashboard();
  }
  // If completed — normal dashboard shows
}

function renderBaselineDashboard() {
  const dashEl = document.getElementById('page-dashboard');
  if (!dashEl) return;
  const a = blState.assessment;
  const status = a ? a.status : 'not_started';
  const done = a ? (a.tasks_completed_count || 0) : 0;
  const pct = Math.round((done / 8) * 100);

  const statusLabels = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed' };
  const statusLabel = statusLabels[status] || 'Not Started';

  dashEl.innerHTML = `
    <div class="baseline-dashboard page-inner">
      <!-- Hero -->
      <div class="bl-hero fade-in">
        <div class="bl-hero-tag">📋 Baseline Assessment Required</div>
        <h2>Welcome, <span style="color:var(--cyan)">${appState.user.name.split(' ')[0]}</span> — let's establish your starting point.</h2>
        <p>Before you begin, you'll complete a short set of baseline tasks. These help establish your starting point so we can measure your progress throughout the program.<br><br>
        This isn't about getting everything right. Just approach each task with your best judgment based on what you know today.<br><br>
        <strong style="color:var(--text);">Please do not use Google or any AI tools while completing these tasks.</strong> The goal is to understand how you think today — not to test your ability to look things up. This will not count against you in any way.<br><br>
        These tasks reflect real AI evaluation work. Once you finish, your course unlock code will be emailed to you.</p>
      </div>

      <!-- Animated path -->
      <div class="bl-path fade-in" id="bl-path-card">
        <div class="bl-path-label">Your Learning Journey</div>
        <div class="bl-path-nodes">
          <div class="bl-path-line"><div class="bl-path-line-fill" id="bl-path-fill"></div></div>
          ${[
            { icon: '🧪', label: 'Baseline Tasks', active: status !== 'completed' },
            { icon: '📚', label: 'Training Program', active: false },
            { icon: '🎯', label: 'Post-Program Tasks', active: false },
            { icon: '📈', label: 'Growth', active: false },
          ].map((n,i) => `
            <div class="bl-path-node" id="bl-node-${i}">
              <div class="bl-path-node-icon ${n.active ? 'active-node' : ''}">${n.icon}</div>
              <div class="bl-path-node-label">${n.label}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Overview + Status -->
      <div class="bl-cards fade-in">
        <div class="bl-card">
          <div class="bl-card-title">Assessment Overview</div>
          <div class="bl-overview-items">
            <div class="bl-overview-item"><span>📋</span><span>8 evaluation tasks</span></div>
            <div class="bl-overview-item"><span>⏱</span><span>Estimated 25–35 minutes</span></div>
            <div class="bl-overview-item"><span>🔍</span><span>Compare responses, identify issues, explain reasoning</span></div>
            <div class="bl-overview-item"><span>💾</span><span>Progress is saved automatically</span></div>
          </div>
        </div>
        <div class="bl-card">
          <div class="bl-card-title">Your Status</div>
          <div class="bl-status-badge ${status}">${statusLabel}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.75rem;">${done} of 8 tasks completed</div>
          <div class="progress-bar" style="margin-bottom:1rem;"><div class="progress-fill" style="width:${pct}%"></div></div>
          ${status === 'completed' ?
            `<button class="btn btn-outline btn-sm" onclick="viewBaselineReview()">Review My Responses →</button>` :
            `<button class="btn btn-primary btn-full" onclick="enterBaselineAssessment()" style="margin-top:0.5rem;">${status === 'in_progress' ? 'Continue Assessment →' : 'Start Baseline Assessment →'}</button>`
          }
        </div>
      </div>

      <!-- Course lock notice -->
      <div style="background:rgba(155,93,229,0.06);border:1px solid var(--border-v);border-radius:10px;padding:1.2rem 1.5rem;display:flex;align-items:center;gap:1rem;">
        <span style="font-size:1.5rem;">🔒</span>
        <div style="font-size:0.88rem;color:var(--text-muted);line-height:1.6;">
          <strong style="color:var(--text);">Courses are locked</strong> until you complete your baseline assessment and receive your course unlock code via email.
        </div>
      </div>
    </div>`;

  // Animate path nodes
  setTimeout(() => {
    [0,1,2,3].forEach((i, idx) => {
      setTimeout(() => {
        const node = document.getElementById(`bl-node-${i}`);
        if (node) node.classList.add('visible');
      }, idx * 250);
    });
    setTimeout(() => {
      const fill = document.getElementById('bl-path-fill');
      if (fill) fill.style.width = status === 'completed' ? '100%' : status === 'in_progress' ? '25%' : '8%';
    }, 200);
  }, 300);

  initFadeIns();
}

// ── Enter tasking view ────────────────────────────────────────────────
async function enterBaselineAssessment() {
  const a = blState.assessment;
  if (a && a.status === 'completed') { viewBaselineReview(); return; }
  // Load tasks
  await loadBaselineTasks();
  if (!blState.tasks.length) {
    showToast('error', '⚠', 'No baseline tasks available. Check back soon.');
    return;
  }
  // Create or resume assessment
  if (!blState.assessment) {
    await createBaselineAssessment();
  }
  // Load existing attempts
  await loadBaselineAttempts();
  // Find current task
  const done = blState.assessment ? (blState.assessment.tasks_completed_count || 0) : 0;
  blState.currentTaskIdx = Math.min(done, blState.tasks.length - 1);
  showView('view-baseline-tasking');
  document.getElementById('view-baseline-tasking').style.display = 'block';
  renderBaselineTask();
}

async function loadBaselineTasks() {
  try {
    // Try active+phase, then active only, then most recent
    let sets = null;
    const q1 = await _supabase.from('task_sets').select('id').eq('is_active', true).eq('phase', 'baseline').limit(1);
    if (q1.data && q1.data.length) { sets = q1.data; }
    else {
      const q2 = await _supabase.from('task_sets').select('id').eq('is_active', true).limit(1);
      if (q2.data && q2.data.length) { sets = q2.data; }
      else {
        const q3 = await _supabase.from('task_sets').select('id').order('created_at', { ascending: false }).limit(1);
        if (q3.data && q3.data.length) { sets = q3.data; }
      }
    }
    if (!sets || !sets.length) { blState.tasks = []; return; }
    const setId = sets[0].id;
    const { data: tasks } = await _supabase.from('tasks').select('*').eq('task_set_id', setId).eq('is_active', true).order('order_index');
    blState.tasks = tasks || [];
  } catch(e) {
    console.warn('Failed to load tasks', e);
    blState.tasks = [];
  }
}

async function createBaselineAssessment() {
  try {
    const { data } = await _supabase.from('baseline_assessments').insert({
      user_id: appState.user.supabaseId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      tasks_completed_count: 0,
      current_task_order: 1,
      ready_for_unlock: false,
      review_viewed: false,
    }).select().single();
    blState.assessment = data;
  } catch(e) { console.warn('Failed to create assessment', e); }
}

async function loadBaselineAttempts() {
  if (!blState.assessment) return;
  try {
    const { data } = await _supabase.from('task_attempts').select('*').eq('assessment_id', blState.assessment.id);
    blState.attempts = {};
    (data || []).forEach(a => { blState.attempts[a.task_id] = a; });
  } catch(e) { console.warn('Failed to load attempts', e); }
}

// ── Task rendering ────────────────────────────────────────────────────
function renderBaselineTask() {
  const task = blState.tasks[blState.currentTaskIdx];
  if (!task) { renderBaselineComplete(); return; }
  const total = blState.tasks.length;
  const idx = blState.currentTaskIdx;
  const attempt = blState.attempts[task.id];
  const isSubmitted = !!attempt?.submitted_at;
  const pct = Math.round((idx / total) * 100);

  // Update topbar
  document.getElementById('bl-task-label').textContent = `Task ${idx + 1} of ${total}`;
  document.getElementById('bl-task-pct').textContent = pct + '%';
  document.getElementById('bl-progress-fill').style.width = pct + '%';
  document.getElementById('bl-autosave-label').textContent = isSubmitted ? '✓ Submitted' : 'Auto-saving...';

  blState.taskStartTime = Date.now();

  const body = document.getElementById('baseline-body');
  body.innerHTML = `
    ${isSubmitted ? `<div class="task-submitted-banner show">✓ You've already submitted this task. Your answers are shown below.</div>` : ''}
    <div class="task-header">
      <span class="task-number-badge">Task ${idx + 1} of ${total}</span>
      <span class="task-timer" id="bl-timer">0:00</span>
    </div>
    <div class="task-prompt-card">
      <div class="task-prompt-label">Prompt</div>
      <div class="task-prompt-text">${task.prompt_text}</div>
    </div>
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem;font-style:italic;">Two AI responses were given to this prompt. Which is better?</div>
    <div class="task-responses">
      <div class="task-response-card ${isSubmitted ? 'locked-response' : ''} ${attempt?.selected_choice === 'A' ? 'selected' : ''}" id="bl-card-a" onclick="${isSubmitted ? '' : "selectBaselineChoice('A')"}">
        <div class="task-response-header">
          <span class="task-response-label">Response A</span>
          <div class="task-response-check">${attempt?.selected_choice === 'A' ? '✓' : ''}</div>
        </div>
        <div class="task-response-body">${task.response_a}</div>
      </div>
      <div class="task-response-card ${isSubmitted ? 'locked-response' : ''} ${attempt?.selected_choice === 'B' ? 'selected' : ''}" id="bl-card-b" onclick="${isSubmitted ? '' : "selectBaselineChoice('B')"}">
        <div class="task-response-header">
          <span class="task-response-label">Response B</span>
          <div class="task-response-check">${attempt?.selected_choice === 'B' ? '✓' : ''}</div>
        </div>
        <div class="task-response-body">${task.response_b}</div>
      </div>
    </div>
    <div class="task-justification">
      <label>Your Reasoning <span style="color:var(--text-dim);font-weight:400;text-transform:none;font-size:0.75rem;">(minimum 75 characters)</span></label>
      <textarea id="bl-justification" placeholder="Explain your choice. What makes one response better than the other? Be specific about what you noticed." ${isSubmitted ? 'disabled' : ''}>${attempt?.justification || ''}</textarea>
      <div class="char-count ${(attempt?.justification || '').length >= 75 ? 'ok' : ''}" id="bl-char-count">${(attempt?.justification || '').length} / 75 min</div>
    </div>
    <div class="task-error" id="bl-error-choice">Please select Response A or B.</div>
    <div class="task-error" id="bl-error-justify">Please provide a more detailed explanation (at least 75 characters).</div>
    <div class="task-nav-row">
      <div style="display:flex;gap:0.5rem;">
        ${idx > 0 ? `<button class="btn btn-ghost btn-sm" onclick="blNavTo(${idx - 1})">← Prev</button>` : ''}
      </div>
      <div style="display:flex;gap:0.75rem;align-items:center;">
        <span class="task-autosave" id="bl-save-status"></span>
        ${isSubmitted
          ? (idx < total - 1
              ? `<button class="btn btn-primary btn-sm" onclick="blNavTo(${idx + 1})">Next Task →</button>`
              : `<button class="btn btn-primary btn-sm" onclick="renderBaselineComplete()">View Completion →</button>`)
          : `<button class="btn btn-primary" onclick="submitBaselineTask()">Submit & Continue →</button>`
        }
      </div>
    </div>`;

  // Wire up auto-save and char count if not submitted
  if (!isSubmitted) {
    const ta = document.getElementById('bl-justification');
    if (ta) {
      ta.addEventListener('input', () => {
        const len = ta.value.length;
        const cc = document.getElementById('bl-char-count');
        if (cc) { cc.textContent = `${len} / 75 min`; cc.className = `char-count ${len >= 75 ? 'ok' : ''}`; }
        clearTimeout(ta._saveTimer);
        ta._saveTimer = setTimeout(() => autoSaveBaseline(), 1500);
      });
    }
    startBlTimer();
  }
}

let blTimerInterval = null;
function startBlTimer() {
  clearInterval(blTimerInterval);
  const start = Date.now();
  blTimerInterval = setInterval(() => {
    const el = document.getElementById('bl-timer');
    if (!el) { clearInterval(blTimerInterval); return; }
    const s = Math.floor((Date.now() - start) / 1000);
    el.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  }, 1000);
}

function selectBaselineChoice(choice) {
  blState._pendingChoice = choice;
  document.getElementById('bl-card-a')?.classList.toggle('selected', choice === 'A');
  document.getElementById('bl-card-b')?.classList.toggle('selected', choice === 'B');
  const checkA = document.querySelector('#bl-card-a .task-response-check');
  const checkB = document.querySelector('#bl-card-b .task-response-check');
  if (checkA) checkA.textContent = choice === 'A' ? '✓' : '';
  if (checkB) checkB.textContent = choice === 'B' ? '✓' : '';
  document.getElementById('bl-error-choice')?.classList.remove('show');
  autoSaveBaseline();
}

async function autoSaveBaseline() {
  const task = blState.tasks[blState.currentTaskIdx];
  if (!task || !blState.assessment) return;
  const justification = document.getElementById('bl-justification')?.value || '';
  const choice = blState._pendingChoice || blState.attempts[task.id]?.selected_choice;
  const saveEl = document.getElementById('bl-save-status');
  if (saveEl) saveEl.textContent = 'Saving...';
  try {
    await _supabase.from('task_attempts').upsert({
      assessment_id: blState.assessment.id,
      user_id: appState.user.supabaseId,
      task_id: task.id,
      selected_choice: choice || null,
      justification,
      started_at: blState.attempts[task.id]?.started_at || new Date().toISOString(),
    }, { onConflict: 'assessment_id,task_id' });
    if (saveEl) saveEl.textContent = '✓ Saved';
  } catch(e) { if (saveEl) saveEl.textContent = ''; }
}

async function submitBaselineTask() {
  const task = blState.tasks[blState.currentTaskIdx];
  const choice = blState._pendingChoice || blState.attempts[task.id]?.selected_choice;
  const justification = document.getElementById('bl-justification')?.value?.trim() || '';
  let valid = true;

  if (!choice) { document.getElementById('bl-error-choice')?.classList.add('show'); valid = false; }
  if (justification.length < 75) { document.getElementById('bl-error-justify')?.classList.add('show'); valid = false; }
  if (!valid) return;

  // Guard: if assessment wasn't created yet (race condition on first submit), create it now
  if (!blState.assessment) {
    await createBaselineAssessment();
    if (!blState.assessment) {
      showToast('error', '⚠', 'Could not save — please try again.');
      return;
    }
  }

  clearInterval(blTimerInterval);
  const timeSpent = Math.round((Date.now() - blState.taskStartTime) / 1000);
  const now = new Date().toISOString();
  const isCorrect = choice === task.correct_choice;

  try {
    // Upsert attempt as submitted
    const { data: attempt } = await _supabase.from('task_attempts').upsert({
      assessment_id: blState.assessment.id,
      user_id: appState.user.supabaseId,
      task_id: task.id,
      selected_choice: choice,
      justification,
      started_at: blState.attempts[task.id]?.started_at || now,
      submitted_at: now,
      time_spent_seconds: timeSpent,
      is_correct: isCorrect,
    }, { onConflict: 'assessment_id,task_id' }).select().single();

    blState.attempts[task.id] = attempt;

    // Award XP (check duplicate)
    const xpSource = `baseline-task-${task.id}`;
    const { data: existingXp } = await _supabase.from('xp_events').select('id').eq('user_id', appState.user.supabaseId).eq('source_id', xpSource).limit(1);
    if (!existingXp || !existingXp.length) {
      await _supabase.from('xp_events').insert({ user_id: appState.user.supabaseId, source_type: 'baseline_task', source_id: xpSource, xp_amount: 20 });
      addXP(20);
      spawnXPPop('+20 XP');
    }

    // Update assessment progress
    const newCount = (blState.assessment.tasks_completed_count || 0) + 1;
    const newOrder = newCount + 1;
    const isLast = newCount >= blState.tasks.length;
    const updatePayload = {
      tasks_completed_count: newCount,
      current_task_order: newOrder,
      ...(isLast ? {
        status: 'completed',
        completed_at: now,
        ready_for_unlock: true,
        baseline_total_time_seconds: (blState.assessment.baseline_total_time_seconds || 0) + timeSpent,
      } : { status: 'in_progress' })
    };
    await _supabase.from('baseline_assessments').update(updatePayload).eq('id', blState.assessment.id);
    blState.assessment = { ...blState.assessment, ...updatePayload };
    blState._pendingChoice = null;

    if (isLast) {
      // Bonus XP
      const bonusSource = 'baseline-complete';
      const { data: existingBonus } = await _supabase.from('xp_events').select('id').eq('user_id', appState.user.supabaseId).eq('source_id', bonusSource).limit(1);
      if (!existingBonus || !existingBonus.length) {
        await _supabase.from('xp_events').insert({ user_id: appState.user.supabaseId, source_type: 'baseline_complete', source_id: bonusSource, xp_amount: 100 });
        addXP(100);
        spawnXPPop('+100 XP');
        showMilestoneBanner('🎉', 'Baseline complete! +100 XP bonus');
      }
      renderBaselineComplete();
    } else {
      blState.currentTaskIdx++;
      renderBaselineTask();
    }
  } catch(e) {
    console.error('Submit failed', e);
    showToast('error', '⚠', 'Save failed. Please try again.');
  }
}

function exitBaselineToDashboard() {
  clearInterval(blTimerInterval);
  showView('view-app');
  navTo('dashboard');
  showToast('success', '💾', 'Progress saved. You can resume anytime.');
}

function blNavTo(idx) {
  clearInterval(blTimerInterval);
  blState.currentTaskIdx = idx;
  blState._pendingChoice = null;
  renderBaselineTask();
}

function renderBaselineComplete() {
  clearInterval(blTimerInterval);
  const body = document.getElementById('baseline-body');
  document.getElementById('bl-task-label').textContent = 'Complete!';
  document.getElementById('bl-progress-fill').style.width = '100%';
  document.getElementById('bl-task-pct').textContent = '100%';

  body.innerHTML = `
    <div class="bl-complete">
      <div class="bl-complete-icon">🎉</div>
      <h3>You're all set.</h3>
      <p>Your baseline has been recorded.<br><br>
      You can now review your responses to see what strong evaluation looks like and what to start watching for.<br><br>
      <strong style="color:var(--text);">Your course unlock code will be emailed to you shortly.</strong></p>
      <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-outline" onclick="viewBaselineReview()">Review My Responses →</button>
        <button class="btn btn-ghost" onclick="exitBaselineToHome()">Back to Dashboard</button>
      </div>
    </div>`;
}

async function viewBaselineReview() {
  // Mark review viewed
  if (blState.assessment?.id) {
    await _supabase.from('baseline_assessments').update({ review_viewed: true }).eq('id', blState.assessment.id);
  }
  // Make sure tasks + attempts are loaded
  if (!blState.tasks.length) await loadBaselineTasks();
  if (!Object.keys(blState.attempts).length) await loadBaselineAttempts();

  const body = document.getElementById('baseline-body');
  document.getElementById('bl-task-label').textContent = 'Review';
  document.getElementById('bl-progress-fill').style.width = '100%';

  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem;">
      <h2 style="font-size:1.2rem;font-weight:800;letter-spacing:-0.01em;">Response Review</h2>
      <button class="btn btn-ghost btn-sm" onclick="exitBaselineToHome()">← Back to Dashboard</button>
    </div>
    <div style="background:rgba(0,229,200,0.05);border:1px solid rgba(0,229,200,0.2);border-radius:8px;padding:0.9rem 1.1rem;margin-bottom:1.5rem;font-size:0.88rem;color:var(--text-muted);line-height:1.6;">
      Here's what strong evaluation looks like on each task. Use this to calibrate your thinking before you begin the training program.
    </div>
    ${blState.tasks.map((task, i) => {
      const attempt = blState.attempts[task.id];
      const chosen = attempt?.selected_choice;
      const correct = task.correct_choice;
      const isCorrect = chosen === correct;
      return `
        <div class="bl-review-task">
          <div class="bl-review-task-header">
            <span class="task-number-badge">Task ${i + 1}</span>
            ${chosen ? `<span class="bl-review-chosen ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? '✓ Strong choice' : '△ See explanation'}</span>` : ''}
          </div>
          <div class="bl-review-section">Prompt</div>
          <div class="bl-review-text">${task.prompt_text}</div>
          ${chosen ? `
            <div class="bl-review-section">Your Choice</div>
            <div class="bl-review-text">Response ${chosen}</div>
            <div class="bl-review-section">Your Reasoning</div>
            <div class="bl-review-text" style="font-style:italic;">"${attempt.justification}"</div>
          ` : '<div class="bl-review-text" style="color:var(--text-dim);">Not submitted</div>'}
          <div class="bl-review-section">Stronger Response</div>
          <div class="bl-review-text"><strong style="color:var(--cyan);">Response ${correct}</strong></div>
          <div class="bl-review-explanation"><strong>Why:</strong> ${task.explanation}</div>
        </div>`;
    }).join('')}
    <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
      <button class="btn btn-ghost btn-sm" onclick="exitBaselineToHome()">← Back to Dashboard</button>
    </div>`;
}

function exitBaselineToHome() {
  clearInterval(blTimerInterval);
  updateBaselineNavLabel();
  showView('view-app');
  renderApp();
  navTo('dashboard');
}

// ── Admin baseline panel ──────────────────────────────────────────────
let blAdminFilterReady = false;

function toggleBaselineFilter() {
  blAdminFilterReady = !blAdminFilterReady;
  const btn = document.getElementById('bl-filter-btn');
  if (btn) btn.textContent = blAdminFilterReady ? 'Filter: Ready to Unlock' : 'Filter: All';
  loadBaselineAdmin();
}

async function loadBaselineAdmin() {
  const loading = document.getElementById('bl-admin-loading');
  const list = document.getElementById('bl-admin-list');
  if (!loading || !list) return;
  loading.style.display = 'block'; list.style.display = 'none';

  try {
    let query = _supabase.from('baseline_assessments').select('*').order('completed_at', { ascending: false });
    if (blAdminFilterReady) query = query.eq('ready_for_unlock', true).is('unlock_code_sent_at', null);

    const { data: assessments } = await query;
    const { data: profiles } = await _supabase.from('profiles').select('id, full_name, email');
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    loading.style.display = 'none'; list.style.display = 'block';

    if (!assessments || !assessments.length) {
      list.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:0.88rem;">${blAdminFilterReady ? 'No assessments ready for unlock yet.' : 'No assessments found.'}</div>`;
      return;
    }

    list.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border-w);border-radius:10px;overflow:hidden;">
        <div class="bl-admin-row header">
          <div>Name</div><div>Email</div><div>Progress</div><div>Status</div><div>Completed</div><div>Ready</div><div>Code Sent</div><div>Actions</div>
        </div>
        ${assessments.map(a => {
          const p = profileMap[a.user_id] || {};
          const name = p.full_name || '—';
          const email = p.email || '—';
          const completed = a.completed_at ? new Date(a.completed_at).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—';
          return `
            <div class="bl-admin-row">
              <div style="font-weight:500;font-size:0.85rem;">${name}</div>
              <div style="color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${email}</div>
              <div style="color:var(--cyan);">${a.tasks_completed_count || 0}/8</div>
              <div><span class="bl-status-pill ${a.status}">${a.status.replace('_',' ')}</span></div>
              <div style="color:var(--text-dim);font-size:0.78rem;">${completed}</div>
              <div>${a.ready_for_unlock ? '<span style="color:var(--cyan);">✓ Yes</span>' : '<span style="color:var(--text-dim);">No</span>'}</div>
              <div>${a.unlock_code_sent_at ? '<span style="color:var(--cyan);font-size:0.78rem;">Sent</span>' : '<span style="color:var(--text-dim);font-size:0.78rem;">—</span>'}</div>
              <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
                <button class="btn btn-ghost btn-sm" style="font-size:0.7rem;padding:0.25rem 0.55rem;" onclick="viewBaselineResponses('${a.id}','${name}')">View</button>
                ${!a.unlock_code_sent_at ? `<button class="btn btn-sm" style="font-size:0.7rem;padding:0.25rem 0.55rem;background:rgba(0,229,200,0.12);color:var(--cyan);border:1px solid rgba(0,229,200,0.3);" onclick="markCodeSent('${a.id}')">Mark Sent</button>` : ''}
                ${!a.course_access_unlocked ? `<button class="btn btn-sm" style="font-size:0.7rem;padding:0.25rem 0.55rem;background:rgba(155,93,229,0.12);color:var(--violet);border:1px solid var(--border-v);" onclick="toggleCourseAccess('${a.id}', true)">Unlock</button>` : `<button class="btn btn-ghost btn-sm" style="font-size:0.7rem;padding:0.25rem 0.55rem;" onclick="toggleCourseAccess('${a.id}', false)">Revoke</button>`}
                <button class="btn btn-sm" style="font-size:0.7rem;padding:0.25rem 0.55rem;background:rgba(255,80,80,0.1);color:#ff6b6b;border:1px solid rgba(255,80,80,0.25);" onclick="confirmResetBaseline('${a.id}','${name}')">Reset</button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  } catch(e) {
    loading.textContent = 'Failed to load. Check Supabase connection.';
    loading.style.color = '#ff6b6b';
  }
}

async function openAdminViewTasks() {
  const modal = document.getElementById('bl-tasks-modal');
  const body = document.getElementById('bl-tasks-modal-body');
  if (!modal || !body) return;
  body.innerHTML = '<div style="color:var(--text-muted);padding:1rem 0;">Loading tasks...</div>';
  modal.classList.add('open');
  try {
    // Try active+phase first, then active only, then any
    let sets = null;
    const q1 = await _supabase.from('task_sets').select('id,name').eq('is_active', true).eq('phase', 'baseline').limit(1);
    if (q1.data && q1.data.length) { sets = q1.data; }
    else {
      const q2 = await _supabase.from('task_sets').select('id,name').eq('is_active', true).limit(1);
      if (q2.data && q2.data.length) { sets = q2.data; }
      else {
        const q3 = await _supabase.from('task_sets').select('id,name').order('created_at', { ascending: false }).limit(1);
        if (q3.data && q3.data.length) { sets = q3.data; }
      }
    }
    if (!sets || !sets.length) { body.innerHTML = '<div style="color:#ff6b6b;">No task sets found in Supabase. Make sure the baseline_schema.sql ran successfully.</div>'; return; }
    const { data: tasks } = await _supabase.from('tasks').select('*').eq('task_set_id', sets[0].id).order('order_index');
    if (!tasks || !tasks.length) { body.innerHTML = '<div style="color:#ff6b6b;">No tasks found.</div>'; return; }
    const esc = s => String(s||'—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    body.innerHTML = tasks.map((t, i) => `
      <div style="background:var(--bg3);border:1px solid var(--border-w);border-radius:10px;padding:1.5rem;margin-bottom:1.25rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <span class="task-number-badge" style="font-size:0.82rem;">Task ${i+1}</span>
          <span style="font-size:0.72rem;color:var(--text-dim);">id: ${t.id.slice(0,8)}…</span>
        </div>
        <div style="font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.35rem;">Prompt shown to student</div>
        <div style="background:var(--bg4);border:1px solid var(--border-w);border-radius:6px;padding:1rem;font-size:0.88rem;line-height:1.7;color:var(--text);margin-bottom:1rem;white-space:pre-wrap;">${esc(t.prompt_text)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
          <div>
            <div style="font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.35rem;">Response A ${t.correct_choice==='A'?'<span style="color:var(--cyan);">✓ CORRECT</span>':''}</div>
            <div style="background:var(--bg4);border:1px solid ${t.correct_choice==='A'?'rgba(0,229,200,0.25)':'var(--border-w)'};border-radius:6px;padding:0.85rem;font-size:0.82rem;line-height:1.65;color:var(--text-muted);white-space:pre-wrap;">${esc(t.response_a)}</div>
          </div>
          <div>
            <div style="font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.35rem;">Response B ${t.correct_choice==='B'?'<span style="color:var(--cyan);">✓ CORRECT</span>':''}</div>
            <div style="background:var(--bg4);border:1px solid ${t.correct_choice==='B'?'rgba(0,229,200,0.25)':'var(--border-w)'};border-radius:6px;padding:0.85rem;font-size:0.82rem;line-height:1.65;color:var(--text-muted);white-space:pre-wrap;">${esc(t.response_b)}</div>
          </div>
        </div>
        <div style="font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.35rem;">Explanation (shown to student after submission)</div>
        <div style="background:rgba(0,229,200,0.04);border:1px solid var(--border);border-radius:6px;padding:0.85rem;font-size:0.82rem;line-height:1.65;color:var(--text-muted);white-space:pre-wrap;">${esc(t.explanation)}</div>
      </div>`).join('');
  } catch(e) {
    body.innerHTML = '<div style="color:#ff6b6b;">Failed to load tasks.</div>';
  }
}

async function markCodeSent(assessmentId) {
  await _supabase.from('baseline_assessments').update({ unlock_code_sent_at: new Date().toISOString(), unlock_code_sent_by: appState.user.email }).eq('id', assessmentId);
  showToast('success', '✓', 'Marked as code sent.');
  loadBaselineAdmin();
}

async function toggleCourseAccess(assessmentId, val) {
  await _supabase.from('baseline_assessments').update({ course_access_unlocked: val }).eq('id', assessmentId);
  showToast('success', val ? '🔓' : '🔒', val ? 'Course access unlocked.' : 'Course access revoked.');
  loadBaselineAdmin();
}

function confirmResetBaseline(assessmentId, studentName) {
  const confirmed = confirm(`⚠️ Reset baseline for ${studentName}?\n\nThis will permanently delete all their task attempts and reset their assessment to Not Started. Their XP earned from baseline tasks will also be removed.\n\nThis cannot be undone.`);
  if (confirmed) resetBaselineAssessment(assessmentId);
}

async function resetBaselineAssessment(assessmentId) {
  try {
    // Delete all task attempts for this assessment
    await _supabase.from('task_attempts').delete().eq('assessment_id', assessmentId);
    // Delete the assessment row itself (student will get a fresh one on next entry)
    await _supabase.from('baseline_assessments').delete().eq('id', assessmentId);
    // Remove baseline XP events for this user — get user_id first
    // (We do a best-effort removal; XP events use source_id pattern 'baseline-task-*' and 'baseline-complete')
    showToast('success', '🔄', 'Baseline reset. Student can start fresh.');
    loadBaselineAdmin();
  } catch(e) {
    console.error('Reset failed', e);
    showToast('error', '⚠', 'Reset failed. Check console.');
  }
}

async function viewBaselineResponses(assessmentId, studentName) {
  const modal = document.getElementById('bl-response-modal');
  const body = document.getElementById('bl-response-modal-body');
  if (!modal || !body) return;
  body.innerHTML = '<div style="color:var(--text-muted);padding:1rem 0;">Loading...</div>';
  modal.classList.add('open');

  try {
    const { data: attempts } = await _supabase.from('task_attempts').select('*, tasks(*)').eq('assessment_id', assessmentId).order('started_at');
    if (!attempts || !attempts.length) { body.innerHTML = '<div style="color:var(--text-muted);">No responses found.</div>'; return; }

    body.innerHTML = `
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:1.25rem;">${studentName} · ${attempts.length} responses</div>
      ${attempts.map((a, i) => {
        const t = a.tasks || {};
        const isCorrect = a.selected_choice === t.correct_choice;
        return `
          <div style="background:var(--bg3);border:1px solid var(--border-w);border-radius:8px;padding:1.25rem;margin-bottom:1rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
              <span class="task-number-badge">Task ${i+1}</span>
              <span class="bl-review-chosen ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
            </div>
            <div class="bl-review-section">Prompt</div>
            <div class="bl-review-text">${t.prompt_text || '—'}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;">
              <div>
                <div class="bl-review-section">Response A</div>
                <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.6;">${t.response_a || '—'}</div>
              </div>
              <div>
                <div class="bl-review-section">Response B</div>
                <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.6;">${t.response_b || '—'}</div>
              </div>
            </div>
            <div class="bl-review-section">Student Chose</div>
            <div class="bl-review-text"><strong style="color:${isCorrect ? 'var(--cyan)' : '#ff6b6b'};">Response ${a.selected_choice}</strong> · Correct: Response ${t.correct_choice}</div>
            <div class="bl-review-section">Justification</div>
            <div class="bl-review-text" style="font-style:italic;">"${a.justification}"</div>
            <div class="bl-review-section" style="margin-top:0.75rem;">Explanation</div>
            <div class="bl-review-explanation">${t.explanation || '—'}</div>
            ${a.time_spent_seconds ? `<div style="font-size:0.72rem;color:var(--text-dim);margin-top:0.5rem;">⏱ ${Math.floor(a.time_spent_seconds/60)}m ${a.time_spent_seconds%60}s</div>` : ''}
          </div>`;
      }).join('')}`;
  } catch(e) {
    body.innerHTML = '<div style="color:#ff6b6b;">Failed to load responses.</div>';
  }
}

// ── Hook into loginUser / renderApp ──────────────────────────────────
// (called after initBaseline is wired into loginUser below)

// ════════════════════════════════
// ANNOUNCEMENTS
// ════════════════════════════════
async function loadAnnouncementRecipients() {
  try {
    const { data: profiles } = await _supabase
      .from('profiles')
      .select('email, role')
      .eq('role', 'student');
    const students = (profiles || []).filter(p => !ADMIN_EMAILS.includes(p.email.toLowerCase()));
    const countEl = document.getElementById('ann-recipient-count');
    if (countEl) countEl.textContent = `${students.length} student${students.length !== 1 ? 's' : ''} will receive this email`;
    return students.map(p => p.email);
  } catch(e) {
    console.warn('Could not load recipients', e);
    return [];
  }
}

function previewAnnouncement() {
  const subject = document.getElementById('ann-subject')?.value.trim();
  const body = document.getElementById('ann-body')?.value.trim();
  const fromName = document.getElementById('ann-from-name')?.value.trim() || 'Lauren McDonald';
  const preview = document.getElementById('ann-preview');
  if (!subject || !body) { showToast('error', '⚠', 'Add a subject and message before previewing.'); return; }
  document.getElementById('prev-from').textContent = `${fromName} <lauren@learningcraftai.com>`;
  document.getElementById('prev-subject').textContent = subject;
  document.getElementById('prev-body').textContent = body;
  if (preview) preview.style.display = 'block';
  preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function sendAnnouncement() {
  const subject = document.getElementById('ann-subject')?.value.trim();
  const body = document.getElementById('ann-body')?.value.trim();
  const fromName = document.getElementById('ann-from-name')?.value.trim() || 'Lauren McDonald';
  const btn = document.getElementById('ann-send-btn');

  if (!subject) { showToast('error', '⚠', 'Please add a subject line.'); return; }
  if (!body) { showToast('error', '⚠', 'Please write a message.'); return; }

  const emails = await loadAnnouncementRecipients();
  if (!emails.length) { showToast('error', '⚠', 'No students found to send to.'); return; }

  const confirmed = confirm(`Send to ${emails.length} student${emails.length !== 1 ? 's' : ''}?\n\nSubject: ${subject}`);
  if (!confirmed) return;

  btn.disabled = true;
  btn.textContent = 'Sending...';

  // Call Supabase Edge Function which has the Resend API key
  try {
    const { data, error } = await _supabase.functions.invoke('send-announcement', {
      body: {
        subject,
        body,
        fromName,
        recipients: emails
      }
    });

    if (error) throw error;

    showToast('success', '📣', `Announcement sent to ${emails.length} student${emails.length !== 1 ? 's' : ''}!`);
    document.getElementById('ann-subject').value = '';
    document.getElementById('ann-body').value = '';
    const preview = document.getElementById('ann-preview');
    if (preview) preview.style.display = 'none';
  } catch(e) {
    console.error('Send failed:', e);
    // Fallback: try direct Resend API (requires key in client — only for trusted admin use)
    showToast('error', '⚠', 'Send failed. Make sure the send-announcement Edge Function is deployed in Supabase.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Send to All Students <span class="arrow">→</span>';
  }
}

// ════════════════════════════════
// UTILS
// ════════════════════════════════
function showToast(type, icon, msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
  // Also push to notifications
  if (type === 'success' && appState.user) {
    addNotif(icon, msg);
    renderNotifs();
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? 'Show' : 'Hide';
  btn.style.color = showing ? 'var(--text-muted)' : 'var(--cyan)';
}

function initFadeIns() {
  const els = document.querySelectorAll('.fade-in:not(.visible)');
  const obs = new IntersectionObserver(entries => {
    entries.forEach((e,i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i*80);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.05 });
  els.forEach(el => obs.observe(el));
}

// ════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════
let notifications = [];

function addNotif(icon, title) {
  notifications.unshift({ icon, title, time: 'Just now', unread: true });
  document.getElementById('notif-dot').style.display = 'block';
}

function toggleNotif(e) {
  e.stopPropagation();
  const dd = document.getElementById('notif-dropdown');
  const isOpen = dd.style.display === 'block';
  closeAllDropdowns();
  if (!isOpen) {
    renderNotifs();
    dd.style.display = 'block';
    // Mark all as read
    notifications.forEach(n => n.unread = false);
    document.getElementById('notif-dot').style.display = 'none';
  }
}

function renderNotifs() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty">No notifications yet.<br>Complete a lesson to get started.</div>';
    return;
  }
  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}">
      <div class="notif-icon">${n.icon}</div>
      <div class="notif-text">
        <div class="notif-title">${n.title}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `).join('');
}

function clearNotifs() {
  notifications = [];
  renderNotifs();
  document.getElementById('notif-dot').style.display = 'none';
}

function closeAllDropdowns() {
  const dd = document.getElementById('notif-dropdown');
  if (dd) dd.style.display = 'none';
}

document.addEventListener('click', closeAllDropdowns);

// Notifications are handled inside showToast directly

// ════════════════════════════════
// PROFILE
// ════════════════════════════════
function openProfile() {
  const u = appState.user;
  if (!u) return;
  document.getElementById('profile-avatar-lg').textContent = u.name.slice(0,2).toUpperCase();
  document.getElementById('profile-name').textContent = u.name;
  document.getElementById('profile-email').textContent = u.email;
  document.getElementById('profile-level').textContent = 'Level ' + u.level;
  document.getElementById('profile-xp').textContent = u.xp;
  document.getElementById('profile-lessons').textContent = u.lessonsCompleted.length;
  document.getElementById('profile-streak').textContent = u.streak;
  // Badges
  const badgeContainer = document.getElementById('profile-badges');
  const earned = allBadges.filter(b => u.badges.includes(b.id));
  if (earned.length) {
    badgeContainer.innerHTML = earned.map(b => `
      <div class="badge earned" style="min-width:60px;padding:0.6rem 0.75rem;">
        <div class="badge-icon" style="font-size:1.2rem;">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
      </div>`).join('');
  } else {
    badgeContainer.innerHTML = '<div style="font-size:0.82rem;color:var(--text-muted);">No badges yet — complete lessons to earn them.</div>';
  }
  document.getElementById('profile-modal').classList.add('open');
}

// ════════════════════════════════
// PROFILE FUNCTIONS
// ════════════════════════════════
function switchProfileTab(tab) {
  document.querySelectorAll('.profile-tab').forEach((t,i) => {
    t.classList.toggle('active', (i===0&&tab==='stats')||(i===1&&tab==='edit')||(i===2&&tab==='password'));
  });
  document.querySelectorAll('.profile-section').forEach(s => s.classList.remove('active'));
  document.getElementById('profile-tab-'+tab)?.classList.add('active');
}

async function saveProfileName() {
  const newName = document.getElementById('edit-name').value.trim();
  if (!newName) { showProfileMsg('edit-name-msg', 'error', 'Please enter a name.'); return; }
  const u = appState.user;
  try {
    if (u.supabaseId) {
      await _supabase.from('profiles').update({ full_name: newName }).eq('id', u.supabaseId);
      await _supabase.auth.updateUser({ data: { name: newName } });
    }
    u.name = newName;
    document.getElementById('profile-name').textContent = newName;
    document.getElementById('profile-avatar-lg').textContent = newName.slice(0,2).toUpperCase();
    document.getElementById('sidebar-name').textContent = newName;
    document.getElementById('sidebar-avatar').textContent = newName.slice(0,2).toUpperCase();
    document.getElementById('topbar-avatar').textContent = newName.slice(0,2).toUpperCase();
    document.getElementById('welcome-name').textContent = newName.split(' ')[0];
    showProfileMsg('edit-name-msg', 'success', '✓ Name updated!');
  } catch(e) {
    showProfileMsg('edit-name-msg', 'error', 'Failed to save. Please try again.');
  }
}

async function savePassword() {
  const newPass = document.getElementById('new-password').value;
  const confirmPass = document.getElementById('confirm-password').value;
  if (!newPass || newPass.length < 6) { showProfileMsg('edit-password-msg', 'error', 'Password must be at least 6 characters.'); return; }
  if (newPass !== confirmPass) { showProfileMsg('edit-password-msg', 'error', "Passwords don't match."); return; }
  try {
    const { error } = await _supabase.auth.updateUser({ password: newPass });
    if (error) { showProfileMsg('edit-password-msg', 'error', error.message); return; }
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    showProfileMsg('edit-password-msg', 'success', '✓ Password updated!');
  } catch(e) {
    showProfileMsg('edit-password-msg', 'error', 'Failed to update. Please try again.');
  }
}

function showProfileMsg(id, type, text) {
  const el = document.getElementById(id); if (!el) return;
  el.textContent = text; el.className = 'profile-msg ' + type; el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ════════════════════════════════
// PRACTICE TASKS
// ════════════════════════════════
let taskState = {
  currentIdx: 0,
  ratings: {}, // taskId -> { helpfulness, accuracy, format, instruction_following, rationale }
  startTime: null
};

function renderPracticeLesson() {
  const container = document.getElementById('lesson-content');
  if (!container) return;
  taskState.startTime = Date.now();
  renderTaskUI(container);
}

function renderTaskUI(container) {
  const idx = taskState.currentIdx;
  const task = practiceTasks[idx];
  const total = practiceTasks.length;
  const saved = taskState.ratings[task.id] || {};
  const allDone = Object.keys(taskState.ratings).length >= total;

  if (allDone) {
    container.innerHTML = `
      <div class="task-complete-banner">
        <div style="font-size:2.5rem;margin-bottom:0.75rem;">🎉</div>
        <h3 style="font-size:1.2rem;font-weight:800;margin-bottom:0.5rem;">All tasks complete!</h3>
        <p style="color:var(--text-muted);font-size:0.92rem;margin-bottom:1.5rem;">Your evaluations have been saved. Thank you for contributing to real AI training data.</p>
        <button class="btn btn-primary" onclick="completeLesson(${appState.currentCourse.lessons.findIndex(l=>l.type==='practice')})">Finish Course <span class="arrow">→</span></button>
      </div>`;
    return;
  }

  const pips = practiceTasks.map((t, i) => {
    const done = taskState.ratings[t.id];
    const active = i === idx && !done;
    return `<div class="practice-pip ${done ? 'done' : active ? 'active' : ''}"></div>`;
  }).join('');

  const notesHtml = task.notes
    ? `<div style="background:rgba(155,93,229,0.06);border:1px solid var(--border-v);border-radius:6px;padding:0.75rem 1rem;margin-bottom:1.25rem;font-size:0.82rem;color:var(--text-muted);"><span style="color:var(--violet);font-weight:700;">Evaluator note: </span>${task.notes}</div>`
    : '';

  const navHtml = `
    <div id="task-error" style="font-size:0.8rem;color:#ff6b6b;margin-bottom:0.75rem;display:none;">Please complete all required fields before submitting.</div>
    <div class="task-nav">
      ${idx > 0 ? `<button class="btn btn-ghost btn-sm" onclick="taskNav(${idx-1})">← Previous</button>` : ''}
      <button class="btn btn-primary" onclick="submitTask('${task.id}')">
        ${idx < total - 1 ? 'Submit & Next →' : 'Submit Final Task →'}
      </button>
    </div>`;

  const headerHtml = `<div class="practice-wrap">
    <div class="practice-header">
      <span style="font-size:0.85rem;font-weight:700;color:var(--cyan);">${task.taskLabel || 'Practice Task'}</span>
      <span class="practice-counter">Task ${idx + 1} of ${total}</span>
    </div>
    <div class="practice-progress">${pips}</div>
    <div class="task-card">
      ${notesHtml}
      <div class="task-section-label">Prompt</div>
      <div class="task-prompt">${task.prompt}</div>`;

  // ── RATING TASK ──
  if (!task.type || task.type === 'rating') {
    const dims = [
      { key: 'helpfulness', label: 'Helpfulness' },
      { key: 'accuracy', label: 'Accuracy' },
      { key: 'format', label: 'Format / Structure' },
      { key: 'instruction_following', label: 'Instruction Following' }
    ];
    const rubricHtml = dims.map(d => `
      <div class="rubric-item">
        <div class="rubric-label">${d.label}</div>
        <div class="star-row" id="stars-${d.key}">
          ${[1,2,3,4,5].map(n => `<span class="star ${(saved[d.key]||0)>=n?'active':''}" onclick="setRating('${task.id}','${d.key}',${n})" data-val="${n}">&#9733;</span>`).join('')}
        </div>
      </div>`).join('');

    container.innerHTML = headerHtml + `
      <div class="task-section-label">AI Response</div>
      <div class="task-response">${task.response}</div>
      <div class="task-section-label" style="margin-bottom:0.75rem;">Rate this response (1 = Poor, 5 = Excellent)</div>
      <div class="rubric-grid">${rubricHtml}</div>
      <div class="rationale-wrap">
        <div class="task-section-label">Written Rationale <span style="color:#ff6b6b;">*</span></div>
        <textarea id="task-rationale" placeholder="Explain your ratings. Reference specific dimensions. What did the response do well? What failed and why?" style="margin-top:0.4rem;">${saved.rationale||''}</textarea>
      </div>
      ${navHtml}
    </div></div>`;
  }

  // ── COMPARISON TASK ──
  else if (task.type === 'comparison') {
    const prefA = saved.preference === 'A';
    const prefB = saved.preference === 'B';
    const prefTie = saved.preference === 'tie';
    container.innerHTML = headerHtml + `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem;">
        <div>
          <div class="task-section-label" style="color:var(--cyan);">Response A</div>
          <div class="task-response" style="min-height:100px;">${task.responseA}</div>
        </div>
        <div>
          <div class="task-section-label" style="color:var(--violet);">Response B</div>
          <div class="task-response" style="min-height:100px;border-left-color:rgba(155,93,229,0.3);">${task.responseB}</div>
        </div>
      </div>
      <div class="task-section-label" style="margin-bottom:0.75rem;">Which response is better for this prompt?</div>
      <div style="display:flex;gap:0.75rem;margin-bottom:1.25rem;" id="pref-buttons">
        <button class="btn ${prefA?'btn-primary':'btn-outline'}" onclick="setPreference('${task.id}','A')" style="flex:1;justify-content:center;">A is better</button>
        <button class="btn ${prefTie?'btn-primary':'btn-ghost'}" onclick="setPreference('${task.id}','tie')" style="flex:1;justify-content:center;">Equal</button>
        <button class="btn ${prefB?'btn-primary':'btn-ghost'}" onclick="setPreference('${task.id}','B')" style="flex:1;justify-content:center;${prefB?'':'color:var(--violet);border-color:var(--violet);'}">B is better</button>
      </div>
      <div class="rationale-wrap">
        <div class="task-section-label">Written Rationale <span style="color:#ff6b6b;">*</span></div>
        <textarea id="task-rationale" placeholder="Explain your preference. Compare the responses dimension by dimension. Why is one better suited to this specific prompt?" style="margin-top:0.4rem;">${saved.rationale||''}</textarea>
      </div>
      ${navHtml}
    </div></div>`;
  }

  // ── ERROR CLASSIFICATION TASK ──
  else if (task.type === 'error') {
    const errorTypes = task.errorTypes || ['Factual Error','Hallucination','Instruction Non-Compliance','Format Error','Incomplete Response','No Error'];
    const savedErrors = saved.errors || [];
    const errorHtml = errorTypes.map(e => `
      <label style="display:flex;align-items:center;gap:0.6rem;padding:0.65rem 0.9rem;background:var(--bg3);border:1px solid ${savedErrors.includes(e)?'var(--cyan)':'var(--border-w)'};border-radius:6px;cursor:pointer;transition:all 0.18s;font-size:0.88rem;" id="err-label-${e.replace(/[^a-z]/gi,'_')}">
        <input type="checkbox" style="accent-color:var(--cyan);width:15px;height:15px;flex-shrink:0;" ${savedErrors.includes(e)?'checked':''} onchange="toggleError('${task.id}','${e}',this.checked)">
        ${e}
      </label>`).join('');

    container.innerHTML = headerHtml + `
      <div class="task-section-label">AI Response</div>
      <div class="task-response">${task.response}</div>
      <div class="task-section-label" style="margin-bottom:0.75rem;">Select all error types that apply</div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1.25rem;">${errorHtml}</div>
      <div class="rationale-wrap">
        <div class="task-section-label">Written Rationale <span style="color:#ff6b6b;">*</span></div>
        <textarea id="task-rationale" placeholder="Explain each error you identified. Quote the specific part of the response that demonstrates the error." style="margin-top:0.4rem;">${saved.rationale||''}</textarea>
      </div>
      ${navHtml}
    </div></div>`;
  }
}


function setRating(taskId, dimension, value) {
  if (!taskState.ratings[taskId]) taskState.ratings[taskId] = {};
  taskState.ratings[taskId][dimension] = value;
  // Update stars visually
  const row = document.getElementById('stars-' + dimension);
  if (!row) return;
  row.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= value);
  });
}

function setPreference(taskId, value) {
  if (!taskState.ratings[taskId]) taskState.ratings[taskId] = {};
  taskState.ratings[taskId].preference = value;
  // Update button styles
  const btns = document.querySelectorAll('#pref-buttons .btn');
  btns.forEach((btn, i) => {
    const vals = ['A','tie','B'];
    const isSelected = vals[i] === value;
    btn.className = 'btn ' + (isSelected ? 'btn-primary' : (i===2 ? 'btn-ghost' : (i===0 ? 'btn-outline' : 'btn-ghost')));
    if (i === 2 && !isSelected) btn.style.cssText = 'flex:1;justify-content:center;color:var(--violet);border-color:var(--violet);';
    else btn.style.cssText = 'flex:1;justify-content:center;';
  });
}

function toggleError(taskId, errorType, checked) {
  if (!taskState.ratings[taskId]) taskState.ratings[taskId] = {};
  if (!taskState.ratings[taskId].errors) taskState.ratings[taskId].errors = [];
  if (checked) {
    if (!taskState.ratings[taskId].errors.includes(errorType)) {
      taskState.ratings[taskId].errors.push(errorType);
    }
  } else {
    taskState.ratings[taskId].errors = taskState.ratings[taskId].errors.filter(e => e !== errorType);
  }
  // Update border color
  const safeId = errorType.replace(/[^a-z]/gi,'_');
  const label = document.getElementById('err-label-' + safeId);
  if (label) label.style.borderColor = checked ? 'var(--cyan)' : 'var(--border-w)';
}

function taskNav(idx) {
  taskState.currentIdx = idx;
  renderTaskUI(document.getElementById('lesson-content'));
}

async function submitTask(taskId) {
  const task = practiceTasks.find(t => t.id === taskId);
  const ratings = taskState.ratings[taskId] || {};
  const rationale = document.getElementById('task-rationale')?.value.trim();
  const errEl = document.getElementById('task-error');

  // Validate by task type
  let valid = true;
  if (!task.type || task.type === 'rating') {
    const dims = ['helpfulness', 'accuracy', 'format', 'instruction_following'];
    if (!dims.every(d => ratings[d]) || !rationale) valid = false;
  } else if (task.type === 'comparison') {
    if (!ratings.preference || !rationale) valid = false;
  } else if (task.type === 'error') {
    if (!ratings.errors || !ratings.errors.length || !rationale) valid = false;
  }

  if (!valid) { errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  taskState.ratings[taskId].rationale = rationale;

  // Save to Supabase
  const u = appState.user;
  if (u && u.supabaseId && !appState.isDemo && !appState.isImpersonating) {
    const timeSpent = Math.round((Date.now() - taskState.startTime) / 1000);
    try {
      const payload = {
        user_id: u.supabaseId,
        task_id: taskId,
        course_id: 'course-3',
        task_type: task.type || 'rating',
        rationale: rationale,
        time_spent_seconds: timeSpent,
        created_at: new Date().toISOString()
      };
      // Add type-specific fields
      if (!task.type || task.type === 'rating') {
        payload.helpfulness = ratings.helpfulness;
        payload.accuracy = ratings.accuracy;
        payload.format = ratings.format;
        payload.instruction_following = ratings.instruction_following;
      } else if (task.type === 'comparison') {
        payload.preference = ratings.preference;
      } else if (task.type === 'error') {
        payload.error_types = JSON.stringify(ratings.errors);
      }
      await _supabase.from('task_submissions').upsert(payload, { onConflict: 'user_id,task_id' });
    } catch(e) { console.warn('Task save failed', e); }
  }

  addXP(50);
  spawnXPPop('+50 XP');
  showToast('success', '✓', 'Task submitted! Great work.');

  const nextUndone = practiceTasks.findIndex((t, i) => i > taskState.currentIdx && !taskState.ratings[t.id]);
  taskState.currentIdx = nextUndone >= 0 ? nextUndone : taskState.currentIdx + 1;
  if (taskState.currentIdx >= practiceTasks.length) taskState.currentIdx = practiceTasks.length - 1;

  taskState.startTime = Date.now();
  renderTaskUI(document.getElementById('lesson-content'));
}

// ════════════════════════════════
// PRACTICE TASKS DATA
// ════════════════════════════════

// ════════════════════════════════
// PILOT GATE
// ════════════════════════════════
function isPilotUnlocked() {
  return appState.isAdmin || appState.isDemo || localStorage.getItem('lcai_pilot_unlocked') === '1';
}

function handleCourseClick(courseId) {
  if (!isPilotUnlocked()) { checkPilotAccess(); return; }
  // Block if baseline not completed
  const a = blState.assessment;
  if (!appState.isAdmin && !appState.isImpersonating && !appState.isDemo) {
    if (!a || a.status !== 'completed') {
      showLockedModal(
        'Complete Your Baseline First',
        'Complete your baseline assessment to receive your course unlock code. Once you have the code, you can access the courses.'
      );
      return;
    }
  }
  const course = courses.find(c => c.id === courseId);
  if (course && course.locked && !appState.isAdmin && !appState.isImpersonating) {
    showLockedModal(
      `${course.title} — Coming Soon`,
      "This course is actively being built. You'll receive a notification as soon as it's available. In the meantime, keep going with Course 1."
    );
    return;
  }
  openCourse(courseId);
}

function checkPilotAccess() {
  if (isPilotUnlocked()) return;
  document.getElementById('pilot-gate-modal').classList.add('open');
}

function submitPilotCode() {
  const code = document.getElementById('pilot-code-input').value.trim().toUpperCase();
  const errEl = document.getElementById('pilot-code-error');
  if (code === PILOT_CODE) {
    localStorage.setItem('lcai_pilot_unlocked', '1');
    document.getElementById('pilot-gate-modal').classList.remove('open');
    errEl.style.display = 'none';
    showToast('success', '🎉', 'Pilot access unlocked! Welcome to Learning Craft AI.');
  } else {
    errEl.style.display = 'block';
  }
}

async function submitPilotWaitlist() {
  const name = document.getElementById('pw-name').value.trim();
  const email = document.getElementById('pw-email').value.trim();
  if (!name || !email) return;
  const btn = document.querySelector('#pilot-waitlist-form .btn-outline-v');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  try {
    const res = await fetch(WAITLIST_FORM, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, source: 'Course Platform Waitlist' })
    });
    if (res.ok) {
      document.getElementById('pilot-waitlist-success').style.display = 'block';
      document.getElementById('pw-name').style.display = 'none';
      document.getElementById('pw-email').style.display = 'none';
      btn.style.display = 'none';
    } else {
      btn.disabled = false;
      btn.textContent = 'Error — try again';
    }
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Error — try again';
  }
}

window.addEventListener('load', async () => {
  // Hide all views while we check session
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');

  const sessionType = localStorage.getItem('lcai_session_type');
  const lastPage = localStorage.getItem('lcai_last_page') || 'dashboard';

  try {
    // Restore admin session
    if (sessionType === 'admin') {
      const email = localStorage.getItem('lcai_session_email') || ADMIN_EMAIL;
      handleAdminLogin(email);
      initFadeIns();
      return;
    }

    // Restore demo session
    if (sessionType === 'demo') {
      handleDemoLogin();
      initFadeIns();
      return;
    }

    // Restore student session via Supabase
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && session.user) {
      const u = session.user;
      const name = capitalize((u.user_metadata?.name || u.email.split('@')[0]).replace(/[^a-zA-Z]/g,' ').trim() || 'Learner');
      const userData = await loadSupabaseProfile(u.id, name, u.email);
      // loginUser handles showView + renderApp, then restore last page
      appState.user = userData;
      appState.isAdmin = false;
      await loadLeaderboard();
      showView('view-app');
      renderApp();
      navTo(lastPage);
    } else {
      const auth = document.getElementById('view-auth');
      auth.style.display = 'flex';
    }
  } catch(e) {
    console.warn('Session restore failed', e);
    const auth = document.getElementById('view-auth');
    auth.style.display = 'flex';
  }

  initFadeIns();
});
