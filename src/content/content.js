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
  toggleBtn.onclick = () => {
    isVisible = !isVisible;
    container.style.transform = isVisible ? 'translateX(0)' : 'translateX(350px)';
    toggleBtn.style.right = isVisible ? '360px' : '10px';
  };

  container.appendChild(iframe);
  document.body.appendChild(container);
  document.body.appendChild(toggleBtn);

  // Adjust body padding to not overlap with sidebar (optional)
  // document.body.style.paddingRight = '350px';
}

// Initial Check
chrome.storage.local.get(['userProfile'], (result) => {
  if (!result.userProfile || !result.userProfile.apiKey) {
    // If not onboarded, we can show a small prompt or just wait for the user to click the extension icon
    console.log('JobFill AI: Profile not configured.');
  } else {
    injectSidebar();
    analyzeJobPage();
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
    // Pass to sidebar iframe via window messaging if needed, 
    // but sidebar.js can also listen to chrome.runtime
  }
  
  if (message.type === 'DO_AUTOFILL') {
    performAutofill(message.data);
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
    
    // Simple matching for now (AI can make this better later)
    if (context.includes('name') && !context.includes('company')) {
        fillValue(input, data.fullName);
    } else if (context.includes('email')) {
        fillValue(input, data.email);
    } else if (context.includes('phone') || context.includes('mobile') || context.includes('contact')) {
        fillValue(input, data.phone);
    } else if (context.includes('linkedin')) {
        fillValue(input, data.linkedin);
    } else if (context.includes('github')) {
        fillValue(input, data.github);
    } else if (context.includes('portfolio') || context.includes('website')) {
        fillValue(input, data.portfolio);
    } else if (context.includes('location') || context.includes('city') || context.includes('address')) {
        fillValue(input, data.location);
    } else if (context.includes('resume') || context.includes('summary')) {
        // Handle resume text area
        if (input.tagName === 'TEXTAREA') {
            fillValue(input, data.resumeText);
        }
    }
  });
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
