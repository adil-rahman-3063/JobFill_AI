document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('open-sidebar').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => {
        if (typeof injectSidebar === 'function') {
            injectSidebar();
            if (typeof analyzeJobPage === 'function') {
                analyzeJobPage();
            }
        } else {
            alert('Please refresh the page to enable JobFill AI.');
        }
      }
    });
  });
});

chrome.storage.local.get(['userProfile'], (result) => {
  const status = document.getElementById('status');
  if (result.userProfile && result.userProfile.apiKey) {
    status.innerText = 'Profile: Ready';
    status.style.color = '#00ff88';
  } else {
    status.innerText = 'Profile: Incomplete';
    status.style.color = '#ffcc00';
  }
});
