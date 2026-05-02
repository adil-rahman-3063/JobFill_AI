let currentStep = 1;
const totalSteps = 4;

const form = document.getElementById('onboarding-form');
const steps = document.querySelectorAll('.step');
const navItems = document.querySelectorAll('.nav-item');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const saveBtn = document.getElementById('saveBtn');

// Load existing data
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['userProfile'], (result) => {
    if (result.userProfile) {
      const profile = result.userProfile;
      Object.keys(profile).forEach(key => {
        const input = document.getElementById(key);
        if (input) input.value = profile[key];
      });
    }
  });
});

function updateStep() {
  steps.forEach(step => step.classList.remove('active'));
  navItems.forEach(nav => nav.classList.remove('active'));
  
  document.getElementById(`step-${currentStep}`).classList.add('active');
  document.querySelector(`.nav-item[data-step="${currentStep}"]`).classList.add('active');
  
  // Update buttons
  prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
  
  if (currentStep === totalSteps) {
    nextBtn.style.display = 'none';
    saveBtn.style.display = 'block';
  } else {
    nextBtn.style.display = 'block';
    saveBtn.style.display = 'none';
  }
}

nextBtn.addEventListener('click', () => {
  if (currentStep < totalSteps) {
    currentStep++;
    updateStep();
  }
});

prevBtn.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep--;
    updateStep();
  }
});

navItems.forEach(item => {
  item.addEventListener('click', () => {
    currentStep = parseInt(item.getAttribute('data-step'));
    updateStep();
  });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const profileData = {
    fullName: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    location: document.getElementById('location').value,
    linkedin: document.getElementById('linkedin').value,
    github: document.getElementById('github').value,
    portfolio: document.getElementById('portfolio').value,
    resumeText: document.getElementById('resumeText').value,
    apiKey: document.getElementById('apiKey').value
  };
  
  chrome.storage.local.set({ userProfile: profileData }, () => {
    alert('Profile saved successfully! You can now start using JobFill AI.');
    // Close the options page if it was opened as a tab
    if (window.location.search.includes('onboarding=true')) {
        window.close();
    }
  });
});
