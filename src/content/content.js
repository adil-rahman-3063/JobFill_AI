/**
 * Content Script for JobFill AI
 * Handles sidebar injection and field detection.
 */

window.injectSidebar = function() {
  if (document.getElementById('jobfill-sidebar-container')) return;

  const container = document.createElement('div');
  container.id = 'jobfill-sidebar-container';
  
  // Styles for the container
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.right = '0';
  container.style.width = '350px';
  container.style.height = '100vh';
  container.style.zIndex = '2147483647'; // Max z-index
  container.style.border = 'none';
  container.style.boxShadow = '-10px 0 30px rgba(0,0,0,0.3)';
  container.style.transition = 'transform 0.3s ease';
  
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('src/content/sidebar.html');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  
  // Add a toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.innerHTML = 'J';
  toggleBtn.style.position = 'fixed';
  toggleBtn.style.right = '360px'; // Just outside the sidebar
  toggleBtn.style.top = '20px';
  toggleBtn.style.width = '40px';
  toggleBtn.style.height = '40px';
  toggleBtn.style.borderRadius = '20px';
  toggleBtn.style.background = 'linear-gradient(135deg, #7000ff, #00f2ff)';
  toggleBtn.style.color = 'white';
  toggleBtn.style.border = 'none';
  toggleBtn.style.cursor = 'pointer';
  toggleBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
  toggleBtn.style.zIndex = '2147483647';
  toggleBtn.style.fontWeight = 'bold';
  
  let isVisible = true;
  
  // Push page content
  const originalMargin = document.documentElement.style.marginRight;
  document.documentElement.style.transition = 'margin-right 0.3s ease';
  document.documentElement.style.marginRight = '350px';

  toggleBtn.onclick = () => {
    isVisible = !isVisible;
    container.style.transform = isVisible ? 'translateX(0)' : 'translateX(350px)';
    toggleBtn.style.right = isVisible ? '360px' : '10px';
    document.documentElement.style.marginRight = isVisible ? '350px' : originalMargin;
  };

  container.appendChild(iframe);
  document.body.appendChild(container);
  document.body.appendChild(toggleBtn);

  // Adjust body padding to not overlap with sidebar (optional)
  // document.body.style.paddingRight = '350px';
}

// Initial Check (No longer auto-injects)
chrome.storage.local.get(['userProfile'], (result) => {
  if (!result.userProfile || !result.userProfile.apiKey) {
    console.log('JobFill AI: Profile not configured.');
  }
});

function analyzeJobPage() {
  // Extract visible text to send to Gemini
  const pageText = document.body.innerText.substring(0, 5000); // Send first 5k chars
  
  chrome.runtime.sendMessage({
    type: 'ANALYZE_JOB',
    text: pageText,
    url: window.location.href
  });
}

// Listen for messages from background/sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JOB_ANALYSIS_RESULTS') {
    // Forward to the iframe
    const container = document.getElementById('jobfill-sidebar-container');
    if (container) {
        const iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            // We use chrome.runtime.sendMessage inside the iframe to listen, 
            // but we can also use postMessage or just let the background script broadcast.
            // Actually, if we use chrome.runtime.sendMessage in background, it reaches all parts.
            // But to target the specific tab's sidebar, forwarding is better.
            iframe.contentWindow.postMessage({
                type: 'JOB_ANALYSIS_RESULTS',
                data: message.data
            }, '*');
        }
    }
  }
  
  if (message.type === 'DO_AUTOFILL') {
    performAutofill(message.data);
  }

  if (message.type === 'RESCAN_PAGE') {
    analyzeJobPage();
  }
});

function performAutofill(data) {
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    const label = findLabelForInput(input).toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    
    const context = `${label} ${placeholder} ${name} ${id}`;
    
    // 1. Personal & Professional
    if (context.includes('name') && !context.includes('company')) {
        fillValue(input, data.fullName);
    } else if (context.includes('email')) {
        fillValue(input, data.email);
    } else if (context.includes('phone') || context.includes('mobile')) {
        fillValue(input, data.phone);
    } else if (context.includes('linkedin')) {
        fillValue(input, data.linkedin);
    } else if (context.includes('github')) {
        fillValue(input, data.github);
    } else if (context.includes('portfolio') || context.includes('website')) {
        fillValue(input, data.portfolio);
    } else if (context.includes('location') || context.includes('city') || context.includes('address')) {
        fillValue(input, data.location);
    } 
    
    // 2. Work Authorization & Eligibility
    else if (context.includes('authorized') || context.includes('permission to work')) {
        handleCategoricalInput(input, data.workAuth);
    } else if (context.includes('sponsorship') || context.includes('visa')) {
        handleCategoricalInput(input, data.visaSupport);
    }
    
    // 3. Veteran & Disability
    else if (context.includes('veteran')) {
        handleCategoricalInput(input, data.veteran);
    } else if (context.includes('disability')) {
        handleCategoricalInput(input, data.disability);
    }
    
    // 4. Diversity & Preferences
    else if (context.includes('gender') || context.includes('sex')) {
        handleCategoricalInput(input, data.gender);
    } else if (context.includes('salary') || context.includes('compensation')) {
        fillValue(input, data.salary);
    } else if (context.includes('relocate')) {
        handleCategoricalInput(input, data.relocation);
    }

    // 5. Resume Text
    else if (context.includes('resume') || context.includes('summary')) {
        if (input.tagName === 'TEXTAREA') {
            fillValue(input, data.resumeText);
        }
    }
  });
}

function handleCategoricalInput(input, value) {
    if (!value) return;

    if (input.tagName === 'SELECT') {
        const options = Array.from(input.options);
        const bestMatch = options.find(opt => 
            opt.value.toLowerCase() === value.toLowerCase() || 
            opt.text.toLowerCase().includes(value.toLowerCase())
        );
        if (bestMatch) {
            input.value = bestMatch.value;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    } else if (input.type === 'radio' || input.type === 'checkbox') {
        const parent = input.closest('div, label, fieldset');
        if (parent) {
            const labelText = parent.innerText.toLowerCase();
            if (labelText.includes(value.toLowerCase())) {
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    } else {
        fillValue(input, value);
    }
}

function findLabelForInput(input) {
  // Try to find label element
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.innerText;
  }
  
  // Try to find parent label
  const parentLabel = input.closest('label');
  if (parentLabel) return parentLabel.innerText;
  
  // Try to find preceding text
  const prevSibling = input.previousElementSibling;
  if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.tagName === 'SPAN')) {
      return prevSibling.innerText;
  }
  
  return '';
}

function fillValue(input, value) {
  if (!value) return;
  input.value = value;
  // Trigger events so the site's JS knows it changed
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Watch for DOM changes (Multi-page forms / SPA)
let analysisTimeout;
const observer = new MutationObserver((mutations) => {
    let shouldReanalyze = false;
    
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            // Check if any added nodes contain inputs or significant text
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    if (node.querySelector('input, textarea, select')) {
                        shouldReanalyze = true;
                    }
                }
            });
        }
    }

    if (shouldReanalyze) {
        clearTimeout(analysisTimeout);
        analysisTimeout = setTimeout(() => {
            console.log('JobFill AI: Detecting changes, re-scanning...');
            analyzeJobPage();
        }, 2000); // Wait 2s after changes stop
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
