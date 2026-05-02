/**
 * Background Script for JobFill AI
 * Handles Gemini API communication.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_JOB') {
    handleJobAnalysis(message.text, sender.tab.id);
  }
  
  if (message.type === 'GET_AUTOFILL_DATA') {
    handleAutofillGeneration(message.formContext, sender.tab.id);
  }

  return true; // Keep message channel open for async response
});

async function handleJobAnalysis(text, tabId) {
  try {
    const { userProfile } = await chrome.storage.local.get(['userProfile']);
    if (!userProfile || !userProfile.apiKey) {
      console.error('JobFill AI: No API Key found');
      return;
    }

    const prompt = `
      Analyze this job application page content and extract the following details in JSON format:
      - companyName
      - jobRole
      - skillsRequired (limit to 5 most important as an array)
      
      Page content:
      ${text}
      
      Response format: {"companyName": "...", "jobRole": "...", "skillsRequired": ["...", "..."]}
    `;

    const result = await callGemini(userProfile.apiKey, prompt);
    const parsed = JSON.parse(result);

    chrome.tabs.sendMessage(tabId, {
      type: 'JOB_ANALYSIS_RESULTS',
      data: parsed
    });
  } catch (error) {
    console.error('JobFill AI: Error analyzing job:', error);
  }
}

async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  
  // Extract text from Gemini response and clean JSON markers
  let text = data.candidates[0].content.parts[0].text;
  text = text.replace(/```json|```/g, '').trim();
  return text;
}
