/**
 * Sidebar UI Logic
 */

const companyEl = document.getElementById('company-name');
const roleEl = document.getElementById('job-role');
const skillsEl = document.getElementById('skills-list');
const autofillBtn = document.getElementById('autofill-btn');
const rescanBtn = document.getElementById('rescan-btn');
const settingsBtn = document.getElementById('settings-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const formStatusDot = document.querySelector('.status-indicator .dot');
const formStatusText = document.querySelector('.status-indicator span');
const learningSection = document.getElementById('learning-section');
const extraFieldsList = document.getElementById('extra-fields-list');
const saveExtraBtn = document.getElementById('save-extra-btn');

// Initial state
loadingOverlay.style.display = 'flex';

// Listen for analysis results (from background via content script)
window.addEventListener('message', (event) => {
  if (event.data.type === 'JOB_ANALYSIS_RESULTS') {
    updateJobDetails(event.data.data);
    loadingOverlay.style.display = 'none';
  }
  
  if (event.data.type === 'UNFILLED_FIELDS_DETECTED') {
      showLearningSection(event.data.fields);
  }
});

// Also keep runtime listener as fallback
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'JOB_ANALYSIS_RESULTS') {
    updateJobDetails(message.data);
    loadingOverlay.style.display = 'none';
  }
});

// Timeout for loading overlay
setTimeout(() => {
    if (loadingOverlay.style.display !== 'none') {
        loadingOverlay.style.display = 'none';
        if (companyEl.innerText === 'Analyzing...') {
            companyEl.innerText = 'Analysis Timed Out';
            roleEl.innerText = 'Please refresh';
        }
    }
}, 10000); // 10 seconds timeout

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

rescanBtn.addEventListener('click', () => {
    loadingOverlay.style.display = 'flex';
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: 'RESCAN_PAGE'
        });
    });
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

function showLearningSection(fields) {
    if (fields.length === 0) {
        learningSection.style.display = 'none';
        return;
    }

    learningSection.style.display = 'block';
    extraFieldsList.innerHTML = '';
    
    fields.forEach((field, index) => {
        const item = document.createElement('div');
        item.className = 'extra-field-item';
        item.innerHTML = `
            <div class="extra-field-info">
                <div class="extra-field-label">${field.label}</div>
                <div class="extra-field-value">New insight detected</div>
            </div>
            <label class="switch">
                <input type="checkbox" data-label="${field.label}" checked>
                <span class="slider"></span>
            </label>
        `;
        extraFieldsList.appendChild(item);
    });
}

saveExtraBtn.addEventListener('click', () => {
    const selectedFields = [];
    extraFieldsList.querySelectorAll('input:checked').forEach(input => {
        selectedFields.push(input.getAttribute('data-label'));
    });

    if (selectedFields.length > 0) {
        // In a real app, we'd send these to Gemini to summarize or store them
        // For now, let's just acknowledge them
        saveExtraBtn.innerText = 'Saved to memory!';
        saveExtraBtn.disabled = true;
        
        setTimeout(() => {
            learningSection.style.display = 'none';
            saveExtraBtn.innerText = 'Remember Selected';
            saveExtraBtn.disabled = false;
        }, 2000);
    }
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
