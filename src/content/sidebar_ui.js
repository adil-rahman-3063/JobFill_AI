/**
 * Sidebar UI Logic
 */

const companyEl = document.getElementById('company-name');
const roleEl = document.getElementById('job-role');
const skillsEl = document.getElementById('skills-list');
const autofillBtn = document.getElementById('autofill-btn');
const settingsBtn = document.getElementById('settings-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const formStatusDot = document.querySelector('.status-indicator .dot');
const formStatusText = document.querySelector('.status-indicator span');

// Initial state
loadingOverlay.style.display = 'flex';

// Listen for analysis results
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'JOB_ANALYSIS_RESULTS') {
    updateJobDetails(message.data);
    loadingOverlay.style.display = 'none';
  }
});

function updateJobDetails(data) {
  companyEl.innerText = data.companyName || 'Unknown';
  roleEl.innerText = data.jobRole || 'Unknown';
  
  skillsEl.innerHTML = '';
  if (data.skillsRequired && data.skillsRequired.length > 0) {
    data.skillsRequired.forEach(skill => {
      const span = document.createElement('span');
      span.className = 'skill-tag';
      span.innerText = skill;
      skillsEl.appendChild(span);
    });
  } else {
    skillsEl.innerHTML = '<span class="skill-tag">No skills detected</span>';
  }

  // Enable autofill button if we have data
  autofillBtn.disabled = false;
  formStatusDot.classList.add('ready');
  formStatusText.innerText = 'Ready to autofill';
}

autofillBtn.addEventListener('click', () => {
  chrome.storage.local.get(['userProfile'], (result) => {
    if (result.userProfile) {
        // Send message to content script (parent window)
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'DO_AUTOFILL',
                data: result.userProfile
            });
        });
        
        // Visual feedback
        autofillBtn.innerText = 'Done!';
        setTimeout(() => {
            autofillBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                Autofill with AI
            `;
        }, 2000);
    }
  });
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Check if profile exists on load
chrome.storage.local.get(['userProfile'], (result) => {
    if (!result.userProfile || !result.userProfile.apiKey) {
        companyEl.innerText = 'Action Required';
        roleEl.innerText = 'Setup Profile';
        skillsEl.innerHTML = '<span class="skill-tag">Missing API Key</span>';
        autofillBtn.innerText = 'Setup Extension';
        autofillBtn.disabled = false;
        loadingOverlay.style.display = 'none';
    }
});
