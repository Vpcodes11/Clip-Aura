/**
 * Clipaura Elite — Frontend Logic
 * Refined UX with smooth transitions and cinematic states
 */

console.log("Clipaura script starting...");

// ============ CONFIG ============
const SUPABASE_URL = "https://tmvcemupolugzknwhszf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdmNlbXVwb2x1Z3prbndoc3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzgyMjksImV4cCI6MjA5NDM1NDIyOX0.OdJtdcMoJUAppZn6J1MBGi9IvsHNSU0BGXIHMPBT_CI";

let supabaseClient;
try {
    if (typeof supabase === 'undefined') {
        console.error("Supabase library not loaded!");
    } else {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (err) { console.error("Supabase init error:", err); }

// ============ DOM ============
const $ = id => document.getElementById(id);

// Navbar
const loginBtn = $('login-btn');
const userProfile = $('user-profile');
const userCredits = $('user-credits');
const userTier = $('user-tier');
const logoutBtn = $('logout-btn');

// Sections
const heroSection = $('hero-section');
const processingSection = $('processing-section');
const resultsSection = $('results-section');
const errorSection = $('error-section');

// Command Center
const startBtn = $('start-btn');
const dropZone = $('drop-zone');
const fileInput = $('file-input');
const fileInfo = $('file-info');
const dropZoneInner = $('drop-zone-inner');
const fileNameDisplay = $('file-name');
const fileSizeDisplay = $('file-size');
const removeFileBtn = $('remove-file-btn');
const urlInput = $('url-input');
const presetSelect = $('preset-select');
const captionSelect = $('caption-select');

// Tabs
const inputTabs = document.querySelectorAll('.input-tab');
const tabContents = document.querySelectorAll('.tab-content');

// Progress
const progressFill = $('progress-fill');
const progressPercent = $('progress-percent');
const progressMessage = $('progress-message');
const processingSource = $('processing-source');

// Modals
const authModal = $('auth-modal');
const authForm = $('auth-form');
const authSubmit = $('auth-submit');
const authToggle = $('auth-toggle');
const authToggleText = $('auth-toggle-text');
const authTitle = $('auth-title');
const closeAuth = $('close-auth');
const googleAuthBtn = $('google-auth-btn');
const pricingModal = $('pricing-modal');
const checkoutBtn = $('checkout-btn');

// State
let currentUser = null;
let currentFile = null;
let currentAuthMode = 'login';
let activeTab = 'upload';

// ============ AUTH UI ============

async function updateAuthUI(session) {
    if (session) {
        currentUser = session.user;
        loginBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        fetchUserData();
    } else {
        currentUser = null;
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
    }
    updateStartBtnState();
}

if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log("Auth Event:", event);
        updateAuthUI(session);
    });
}

async function fetchUserData() {
    try {
        const res = await authenticatedFetch('/api/me');
        if (res.ok) {
            const data = await res.json();
            userCredits.textContent = `${data.minutes_remaining}/${data.total_limit} min`;
            userTier.textContent = data.tier === 'pro' ? 'Pro' : 'Free';
            userTier.className = `tier-tag ${data.tier}`;
        }
    } catch (e) { console.error('Error fetching user stats:', e); }
}

async function authenticatedFetch(url, options = {}) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${session?.access_token}`
    };
    return fetch(url, { ...options, headers });
}

// ============ UX INTERACTIONS ============

// Tab Switching
inputTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        activeTab = target;
        
        inputTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        tabContents.forEach(c => {
            c.classList.toggle('active', c.id === `content-${target}`);
            c.classList.toggle('hidden', c.id !== `content-${target}`);
        });
        updateStartBtnState();
    });
});

// File Handling
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
    if (!file || !file.type.startsWith('video/')) return;
    currentFile = file;
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    
    dropZoneInner.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    updateStartBtnState();
}

removeFileBtn.addEventListener('click', e => {
    e.stopPropagation();
    currentFile = null;
    fileInput.value = '';
    dropZoneInner.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    updateStartBtnState();
});

urlInput.addEventListener('input', () => updateStartBtnState());

function updateStartBtnState() {
    const hasInput = (activeTab === 'upload' && currentFile) || (activeTab === 'url' && urlInput.value.trim());
    startBtn.disabled = !hasInput;
    
    if (!currentUser) {
        startBtn.textContent = 'Sign in to Start';
    } else {
        startBtn.textContent = 'Generate Viral Clips';
    }
}

// ============ PROCESSING LOGIC ============

startBtn.addEventListener('click', async () => {
    if (!currentUser) {
        authModal.classList.remove('hidden');
        return;
    }

    // Switch to processing view
    heroSection.classList.add('hidden');
    processingSection.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    progressMessage.textContent = 'Initializing engine...';
    processingSource.textContent = activeTab === 'upload' ? currentFile.name : 'Remote URL';

    try {
        const formData = new FormData();
        if (activeTab === 'upload') formData.append('file', currentFile);
        else formData.append('url', urlInput.value.trim());
        
        formData.append('preset', presetSelect.value);
        formData.append('caption_style', captionSelect.value);

        const res = await authenticatedFetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Upload failed');
        }

        const { job_id } = await res.json();
        connectWebSocket(job_id);
    } catch (err) {
        showError(err.message);
    }
});

function connectWebSocket(jobId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/${jobId}`);

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
            progressFill.style.width = `${data.progress}%`;
            progressPercent.textContent = `${data.progress}%`;
            progressMessage.textContent = data.message;
            updatePipelineSteps(data.message);
        } 
        else if (data.type === 'complete') {
            showResults(data.clips);
            ws.close();
        } 
        else if (data.type === 'error') {
            showError(data.message);
            ws.close();
        }
    };
}

function updatePipelineSteps(message) {
    const msg = message.toLowerCase();
    const steps = {
        'download': $('step-download'),
        'transcrib': $('step-transcribe'),
        'analyzing': $('step-analyze'),
        'rendering': $('step-render')
    };

    for (const [key, el] of Object.entries(steps)) {
        if (msg.includes(key)) {
            el.style.color = 'var(--primary)';
            el.style.fontWeight = '800';
        }
    }
}

function showResults(clips) {
    processingSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    
    const grid = $('clips-grid');
    grid.innerHTML = '';
    
    clips.forEach(clip => {
        const card = document.createElement('div');
        card.className = 'clip-card';
        card.innerHTML = `
            <div class="clip-preview">
                <video src="/api/preview/${clip.job_id}/${clip.filename}" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
                <div class="clip-overlay">
                    <div class="score-badge">SCORE: ${clip.score}/10</div>
                    <button class="btn-icon glass" style="padding: 8px; border-radius: 50%;" onclick="window.open('/api/download/${clip.job_id}/${clip.filename}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                </div>
            </div>
            <div class="clip-info">
                <h3 class="clip-title">${clip.title}</h3>
                <p class="clip-description">${clip.explanation}</p>
                <button class="btn btn-secondary btn-block" style="width: 100%; justify-content: center;" onclick="window.open('/api/download/${clip.job_id}/${clip.filename}')">
                    Download HD
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function showError(msg) {
    processingSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
    $('error-message').textContent = msg;
}

// ============ MODALS & AUTH ============

loginBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
closeAuth.addEventListener('click', () => authModal.classList.add('hidden'));

// Auth State Toggle (Event Delegation to handle dynamic links)
authToggleText.addEventListener('click', (e) => {
    if (e.target.id === 'auth-toggle') {
        e.preventDefault();
        currentAuthMode = currentAuthMode === 'login' ? 'signup' : 'login';
        authTitle.textContent = currentAuthMode === 'login' ? 'Welcome to Clipaura' : 'Create an Account';
        authSubmit.textContent = currentAuthMode === 'login' ? 'Continue' : 'Sign Up';
        authToggleText.innerHTML = currentAuthMode === 'login' ? 
            `Don't have an account? <a href="#" id="auth-toggle" style="color: var(--primary);">Sign Up</a>` : 
            `Already have an account? <a href="#" id="auth-toggle" style="color: var(--primary);">Sign In</a>`;
    }
});

googleAuthBtn.addEventListener('click', async () => {
    try {
        console.log("Initiating Google OAuth...");
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/'
            }
        });
        if (error) throw error;
    } catch (err) {
        alert("Google Login Error: " + err.message);
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('auth-email').value.trim();
    const password = $('auth-password').value.trim();
    
    authSubmit.disabled = true;
    authSubmit.textContent = 'Please wait...';

    try {
        let result;
        if (currentAuthMode === 'login') {
            result = await supabaseClient.auth.signInWithPassword({ email, password });
        } else {
            result = await supabaseClient.auth.signUp({ email, password });
        }

        if (result.error) throw result.error;
        authModal.classList.add('hidden');
    } catch (err) {
        alert(err.message);
    } finally {
        authSubmit.disabled = false;
        authSubmit.textContent = currentAuthMode === 'login' ? 'Continue' : 'Sign Up';
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    location.reload();
});

// Pricing
userTier.addEventListener('click', () => pricingModal.classList.remove('hidden'));
window.hidePricingModal = () => pricingModal.classList.add('hidden');

checkoutBtn.addEventListener('click', async () => {
    if (!currentUser) {
        pricingModal.classList.add('hidden');
        authModal.classList.remove('hidden');
        return;
    }
    
    try {
        const res = await authenticatedFetch('/api/billing/create-checkout-session', { method: 'POST' });
        const { url } = await res.json();
        window.location.href = url;
    } catch (e) { alert("Checkout error: " + e.message); }
});

// ============ INIT ============
updateStartBtnState();

// Stripe Success Check
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('session_id')) {
    setTimeout(() => {
        alert("Success! Your account has been upgraded to Pro. 🚀");
        window.history.replaceState({}, document.title, "/");
        fetchUserData();
    }, 500);
}
