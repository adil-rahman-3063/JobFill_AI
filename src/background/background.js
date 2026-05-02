/**
 * Background Script for JobFill AI
 * Handles Gemini API communication.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default API key and profile structure if needed
    chrome.storage.local.set({
      userProfile: {
        apiKey: "",
        fullName: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        github: "",
        portfolio: "",
        workAuth: "",
        visaSupport: "",
        veteran: "",
        gender: "",
        disability: "",
        salary: "",
        relocation: "",
        resumeText: "",
        resumeName: ""
      }
    });
    chrome.runtime.openOptionsPage();
  }
});

let cachedModel = null;

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
      As an expert HR assistant, analyze the following job application page content. 
      
      ### 1. Extract Core Job Details
      Return a JSON object with:
      - companyName: The name of the hiring company.
      - jobRole: The specific job title.
      - skillsRequired: An array of the top 5 technical or soft skills mentioned.
      - applicationComplexity: High/Medium/Low (based on the number of legal/diversity questions).
      
      ### 2. Identify Special Requirements
      Look for questions related to:
      - Work Authorization & Visa Sponsorship
      - Veteran & Disability Status
      - Diversity (Gender/Ethnicity)
      - Salary Expectations
      
      Page content:
      ---
      ${text}
      ---
      
      Response MUST be strictly valid JSON in this format: 
      {"companyName": "...", "jobRole": "...", "skillsRequired": ["...", "..."], "applicationComplexity": "..."}
    `;

    const model = await getBestAvailableModel(userProfile.apiKey);
    const result = await callGemini(userProfile.apiKey, prompt, model);
    const parsed = JSON.parse(result);

    chrome.tabs.sendMessage(tabId, {
      type: 'JOB_ANALYSIS_RESULTS',
      data: parsed
    });
  } catch (error) {
    console.error('JobFill AI: Error analyzing job:', error);
  }
}

async function getBestAvailableModel(apiKey) {
  if (cachedModel) return cachedModel;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
      const modelNames = data.models.map(m => m.name);

      // Preference order based on available models
      const preferences = [
        'models/gemini-3.1-flash-lite-preview',
        'models/gemini-3-flash-preview',
        'models/gemini-2.5-flash',
        'models/gemini-2.0-flash',
        'models/gemini-flash-latest',
        'models/gemini-1.5-flash',
        'models/gemini-3-pro-preview',
        'models/gemini-2.5-pro',
        'models/gemini-pro-latest',
        'models/gemini-1.5-pro',
        'models/gemini-pro'
      ];

      for (const pref of preferences) {
        if (modelNames.includes(pref)) {
          cachedModel = pref.split('/')[1];
          console.log(`JobFill AI: Using best available model: ${cachedModel}`);
          return cachedModel;
        }
      }
    }
  } catch (error) {
    console.error('JobFill AI: Error listing models:', error);
  }

  return 'gemini-pro'; // Safer fallback
}

async function callGemini(apiKey, prompt, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
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

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json|```/g, '').trim();
    return text;
  } catch (error) {
    throw error;
  }
}
