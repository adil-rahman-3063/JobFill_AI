let currentStep = 1;
const totalSteps = 6;

const form = document.getElementById('onboarding-form');
const steps = document.querySelectorAll('.step');
const navItems = document.querySelectorAll('.nav-item');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const saveBtn = document.getElementById('saveBtn');
const dropZone = document.getElementById('drop-zone');
const resumeFile = document.getElementById('resumeFile');
const filePreview = document.getElementById('file-preview');
const fileNameDisplay = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');
const resumeText = document.getElementById('resumeText');

let resumeData = null;
let resumeName = '';

// Load existing data
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['userProfile'], (result) => {
    if (result.userProfile) {
      const profile = result.userProfile;
      Object.keys(profile).forEach(key => {
        const input = document.getElementById(key);
        if (input && key !== 'resumeText') input.value = profile[key];
      });

      if (profile.resumeText) {
          resumeText.value = profile.resumeText;
          resumeName = profile.resumeName || 'resume.pdf';
          showFilePreview(resumeName);
      }
    }
  });
});

// File Upload Logic
dropZone.addEventListener('click', () => resumeFile.click());

resumeFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

function handleFile(file) {
    if (file.size > 2 * 1024 * 1024) {
        alert('File is too large. Max 2MB.');
        return;
    }

    resumeName = file.name;
    const reader = new FileReader();
    
    reader.onload = (e) => {
        resumeData = e.target.result;
        resumeText.value = resumeData; // Store base64 or text
        showFilePreview(resumeName);
    };

    if (file.type === 'text/plain') {
        reader.readAsText(file);
    } else {
        reader.readAsDataURL(file);
    }
}

function showFilePreview(name) {
    dropZone.style.display = 'none';
    filePreview.style.display = 'flex';
    fileNameDisplay.innerText = name;
}

removeFileBtn.addEventListener('click', () => {
    resumeData = null;
    resumeName = '';
    resumeText.value = '';
    filePreview.style.display = 'none';
    dropZone.style.display = 'flex';
    resumeFile.value = '';
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

function validateStep(step) {
  if (step === 1) {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    if (!fullName || !email) {
      alert('Please fill in your name and email to continue.');
      return false;
    }
  }
  return true;
}

nextBtn.addEventListener('click', () => {
  if (validateStep(currentStep) && currentStep < totalSteps) {
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
  
  if (!validateStep(1)) {
    currentStep = 1;
    updateStep();
    return;
  }
  
  const profileData = {
    fullName: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    location: document.getElementById('location').value,
    postalCode: document.getElementById('postalCode').value,
    linkedin: document.getElementById('linkedin').value,
    github: document.getElementById('github').value,
    portfolio: document.getElementById('portfolio').value,
    workAuth: document.getElementById('workAuth').value,
    visaSupport: document.getElementById('visaSupport').value,
    veteran: document.getElementById('veteran').value,
    gender: document.getElementById('gender').value,
    disability: document.getElementById('disability').value,
    salary: document.getElementById('salary').value,
    relocation: document.getElementById('relocation').value,
    resumeText: document.getElementById('resumeText').value,
    resumeName: resumeName,
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
