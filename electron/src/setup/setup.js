// Setup Wizard Frontend Logic

let currentStep = 1;
const totalSteps = 3;
let config = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Load current config from main process
  try {
    config = await window.setupAPI.getConfig();
    populateForm(config);
  } catch (error) {
    console.error('Failed to load config:', error);
  }
});

// Populate form with config values
function populateForm(cfg) {
  // Database
  if (cfg.database) {
    document.getElementById('dbHost').value = cfg.database.host || 'localhost';
    document.getElementById('dbPort').value = cfg.database.port || 3306;
    document.getElementById('dbName').value = cfg.database.name || 'tms_db';
    document.getElementById('dbUser').value = cfg.database.user || 'root';
    document.getElementById('dbPassword').value = cfg.database.password || '';
  }

  // Server
  if (cfg.server) {
    document.getElementById('backendPort').value = cfg.server.backendPort || 3000;
    document.getElementById('frontendPort').value = cfg.server.frontendPort || 8081;
  }

  // Google OAuth
  if (cfg.google) {
    document.getElementById('googleClientId').value = cfg.google.clientId || '';
    document.getElementById('googleClientSecret').value = cfg.google.clientSecret || '';
  }

  // App preferences
  if (cfg.app) {
    document.getElementById('minimizeToTray').checked = cfg.app.minimizeToTray !== false;
    document.getElementById('checkUpdates').checked = cfg.app.checkUpdates !== false;
  }
}

// Collect form data
function collectFormData() {
  return {
    database: {
      host: document.getElementById('dbHost').value,
      port: parseInt(document.getElementById('dbPort').value, 10),
      name: document.getElementById('dbName').value,
      user: document.getElementById('dbUser').value,
      password: document.getElementById('dbPassword').value,
    },
    server: {
      backendPort: parseInt(document.getElementById('backendPort').value, 10),
      frontendPort: parseInt(document.getElementById('frontendPort').value, 10),
    },
    google: {
      clientId: document.getElementById('googleClientId').value,
      clientSecret: document.getElementById('googleClientSecret').value,
      redirectUri: `http://localhost:${document.getElementById('backendPort').value}/api/gmail/callback`,
    },
    app: {
      minimizeToTray: document.getElementById('minimizeToTray').checked,
      checkUpdates: document.getElementById('checkUpdates').checked,
      autoStart: false,
    },
  };
}

// Navigate to next step
async function nextStep() {
  if (currentStep === 1) {
    // Validate database connection before proceeding
    const dbValid = await validateDatabaseStep();
    if (!dbValid) return;
  }

  if (currentStep < totalSteps) {
    // Update step indicators
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('completed');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');

    // Update step lines
    const stepLines = document.querySelectorAll('.step-line');
    if (stepLines[currentStep - 1]) {
      stepLines[currentStep - 1].classList.add('completed');
    }

    // Hide current step content
    document.getElementById(`step${currentStep}`).classList.remove('active');

    // Move to next step
    currentStep++;

    // Show new step content
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');

    // Update buttons
    updateButtons();

    // If final step, update summary and save config
    if (currentStep === totalSteps) {
      await saveAndShowSummary();
    }
  } else {
    // Final step - finish setup
    await finishSetup();
  }
}

// Navigate to previous step
function prevStep() {
  if (currentStep > 1) {
    // Update step indicators
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');

    // Hide current step content
    document.getElementById(`step${currentStep}`).classList.remove('active');

    // Move to previous step
    currentStep--;

    // Show previous step content
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('completed');

    // Update step lines
    const stepLines = document.querySelectorAll('.step-line');
    if (stepLines[currentStep - 1]) {
      stepLines[currentStep - 1].classList.remove('completed');
    }

    // Update buttons
    updateButtons();
  }
}

// Update button visibility
function updateButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const resetBtn = document.getElementById('resetBtn');

  prevBtn.style.visibility = currentStep > 1 ? 'visible' : 'hidden';
  resetBtn.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';

  if (currentStep === totalSteps) {
    nextBtn.textContent = 'Launch TMS';
  } else {
    nextBtn.textContent = 'Next →';
  }
}

// Validate database step
async function validateDatabaseStep() {
  const statusEl = document.getElementById('dbStatus');
  statusEl.textContent = '';
  statusEl.className = 'status-message';

  // Basic validation
  const host = document.getElementById('dbHost').value.trim();
  const name = document.getElementById('dbName').value.trim();
  const user = document.getElementById('dbUser').value.trim();

  if (!host || !name || !user) {
    statusEl.textContent = 'Please fill in all required fields';
    statusEl.className = 'status-message error';
    return false;
  }

  // Test connection
  const result = await testDatabaseConnection();
  return result;
}

// Test database connection
async function testDatabaseConnection() {
  const btn = document.getElementById('testDbBtn');
  const statusEl = document.getElementById('dbStatus');

  btn.classList.add('loading');
  btn.disabled = true;
  statusEl.textContent = 'Testing connection...';
  statusEl.className = 'status-message loading';

  const dbConfig = {
    host: document.getElementById('dbHost').value,
    port: parseInt(document.getElementById('dbPort').value, 10),
    name: document.getElementById('dbName').value,
    user: document.getElementById('dbUser').value,
    password: document.getElementById('dbPassword').value,
  };

  try {
    const result = await window.setupAPI.testConnection(dbConfig);

    btn.classList.remove('loading');
    btn.disabled = false;

    if (result.success) {
      statusEl.innerHTML = '✓ Connection successful';
      statusEl.className = 'status-message success';
      return true;
    } else {
      statusEl.textContent = '✗ ' + (result.error || 'Connection failed');
      statusEl.className = 'status-message error';
      return false;
    }
  } catch (error) {
    btn.classList.remove('loading');
    btn.disabled = false;
    statusEl.textContent = '✗ ' + error.message;
    statusEl.className = 'status-message error';
    return false;
  }
}

// Save config and show summary
async function saveAndShowSummary() {
  const formData = collectFormData();

  try {
    await window.setupAPI.saveConfig(formData);

    // Update summary
    document.getElementById('summaryDb').textContent =
      `${formData.database.user}@${formData.database.host}:${formData.database.port}/${formData.database.name}`;
    document.getElementById('summaryBackend').textContent = formData.server.backendPort;
    document.getElementById('summaryFrontend').textContent = formData.server.frontendPort;
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// Finish setup and launch app
async function finishSetup() {
  try {
    await window.setupAPI.finishSetup();
  } catch (error) {
    console.error('Failed to finish setup:', error);
    alert('Failed to complete setup: ' + error.message);
  }
}

// Reset to defaults
async function resetToDefaults() {
  try {
    config = await window.setupAPI.resetToDefaults();
    populateForm(config);

    // Clear status messages
    document.getElementById('dbStatus').textContent = '';
    document.getElementById('dbStatus').className = 'status-message';
  } catch (error) {
    console.error('Failed to reset config:', error);
  }
}

// Toggle password visibility
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// Toggle collapsible section
function toggleSection(header) {
  const section = header.closest('.collapsible');
  section.classList.toggle('open');
}
