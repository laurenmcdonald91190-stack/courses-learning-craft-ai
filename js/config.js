// ════════════════════════════════
// SUPABASE CLIENT
// ════════════════════════════════
const SUPABASE_URL = 'https://eayhhviiyxyarjxnjndi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVheWhodmlpeXh5YXJqeG5qbmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTAwNjksImV4cCI6MjA4ODkyNjA2OX0._A0zPvurSrq6DB7OPz4FUPURlxBbwnWMFiMgkVmua3g';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'lcai-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// ════════════════════════════════
// STATE
// ════════════════════════════════
const ADMIN_EMAILS = [
  'admin@learningcraftai.com',
  'arpmcdonald86@gmail.com',
  'bloomjs@lafayette.edu',
  'lauren.mcdonald@learningcraftai.com',
  'lauren.mcdonald91190@gmail.com',
  'ricky.n.quiroz@gmail.com',
];
const ADMIN_EMAIL = ADMIN_EMAILS[0]; // kept for legacy refs
const ADMIN_PASS  = 'lcai2026@dmin';
const PILOT_CODE  = 'LCPILOT2026';
const WAITLIST_FORM = 'https://formspree.io/f/mnjoagzj';
const DEMO_EMAIL  = 'demo@learningcraftai.com';
const DEMO_PASS   = 'lcaidemo2026';

let appState = {
  user: null,
  isAdmin: false,
  isDemo: false,
  isImpersonating: false,
  prevAdminState: null,
  currentCourse: null,
  currentLessonIdx: 0,
  quizAnswered: {},
};
