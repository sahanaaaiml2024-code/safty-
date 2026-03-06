/**
 * SafeCampus Disaster Preparedness System
 * Main UI Logic and Event Handling with Advanced Features
 */

// State Management
let currentDisaster = null;
let checklistState = {};
let appState = {
    offlineMode: !navigator.onLine,
    lastSync: new Date().toISOString(),
    disasterProgress: {}
};

// DOM Elements - Core
const disasterDropdown = document.getElementById('disasterDropdown');
const safetyActionsSection = document.getElementById('safetyActionsSection');
const safetyActionsDiv = document.getElementById('safetyActions');
const checklistSection = document.getElementById('checklistSection');
const checklistItemsDiv = document.getElementById('checklistItems');
const preparednessScoreSpan = document.getElementById('preparednessScore');
const statusMessage = document.getElementById('statusMessage');
const progressFill = document.getElementById('progressFill');
const emergencySection = document.getElementById('emergencySection');
const emergencyContactsDiv = document.getElementById('emergencyContacts');
const jsonSection = document.getElementById('jsonSection');
const jsonOutput = document.getElementById('jsonOutput');
const toggleJsonBtn = document.getElementById('toggleJsonBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');

// DOM Elements - SOS & Modal
const sosButton = document.getElementById('sosButton');
const sosModal = document.getElementById('sosModal');
const closeModalBtn = document.querySelector('.close-modal');
const confirmEmergencyBtn = document.getElementById('confirmEmergency');
const cancelEmergencyBtn = document.getElementById('cancelEmergency');
const emergencyInfo = document.getElementById('emergencyInfo');
const locationData = document.getElementById('locationData');
const servicesAlerted = document.getElementById('servicesAlerted');

// DOM Elements - Navigation & Tabs
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');

// DOM Elements - Map & Campus
const campusMap = document.getElementById('campusMap');
const mapDetails = document.getElementById('mapDetails');
const selectedLocation = document.getElementById('selectedLocation');
const locationDescription = document.getElementById('locationDescription');

// DOM Elements - Progress & Status
const offlineIndicator = document.getElementById('offlineIndicator');
const syncStatus = document.getElementById('syncStatus');
const progressStats = document.getElementById('progressStats');
const saveProgressBtn = document.getElementById('saveProgressBtn');
const clearProgressBtn = document.getElementById('clearProgressBtn');
const exportProgressBtn = document.getElementById('exportProgressBtn');

// Map location descriptions
const LOCATION_DESCRIPTIONS = {
    'Admin Block': 'Administrative center. Follow evacuation routes to Assembly Point A1.',
    'Science Lab': 'Science laboratory with specialized equipment. Be cautious of hazardous materials.',
    'Library': 'Large structure with multiple floors. Use designated stairwells only.',
    'Auditorium': 'Large assembly hall. Use multiple exits to prevent congestion.',
    'Cafeteria': 'Common gathering area. Meet at designated assembly points.',
    'Sports Complex': 'Athletic facilities. Exit through nearest available door.',
    'Assembly Point 1': 'Primary assembly point. All building occupants should proceed here.',
    'Assembly Point 2': 'Secondary assembly point. Use if primary is inaccessible.',
    'First Aid Station': 'Medical support available. Report injuries to staff.',
    'Fire Extinguisher': 'Fire suppression equipment. Use only if trained.'
};

/**
 * Initialize Event Listeners
 */
function initializeEventListeners() {
    // Disaster selection
    disasterDropdown.addEventListener('change', handleDisasterSelection);
    
    // JSON controls
    toggleJsonBtn.addEventListener('click', toggleJsonDisplay);
    downloadJsonBtn.addEventListener('click', downloadJson);
    
    // SOS Button
    sosButton.addEventListener('click', activateSOS);
    closeModalBtn.addEventListener('click', closeSOSModal);
    confirmEmergencyBtn.addEventListener('click', confirmRealEmergency);
    cancelEmergencyBtn.addEventListener('click', closeSOSModal);
    
    // Tab navigation
    navTabs.forEach(tab => {
        tab.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Campus map interaction
    const mapElements = campusMap.querySelectorAll('.map-building, .assembly-point, .map-landmark');
    mapElements.forEach(element => {
        element.addEventListener('click', handleMapClick);
        element.addEventListener('mouseenter', (e) => {
            e.target.style.opacity = '0.8';
        });
        element.addEventListener('mouseleave', (e) => {
            e.target.style.opacity = '1';
        });
    });
    
    // Progress tracking
    saveProgressBtn.addEventListener('click', saveProgress);
    clearProgressBtn.addEventListener('click', clearProgress);
    exportProgressBtn.addEventListener('click', exportData);
    
    // Offline detection
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

/**
 * Tab Navigation
 */
function switchTab(tabId) {
    // Hide all tabs
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Remove active state from all buttons
    navTabs.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Mark button as active
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

/**
 * SOS Button Activation
 */
function activateSOS() {
    sosModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Close SOS Modal
 */
function closeSOSModal() {
    sosModal.classList.add('hidden');
    emergencyInfo.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

/**
 * Confirm Real Emergency
 */
function confirmRealEmergency() {
    const timestamp = new Date().toLocaleString();
    const location = 'Campus Location (Building/Zone)';
    
    locationData.innerHTML = `
        <strong>Time:</strong> ${timestamp}<br>
        <strong>Location:</strong> ${location}<br>
        <strong>Status:</strong> Emergency reported and logged
    `;
    
    // Get emergency services for current disaster
    const contacts = currentDisaster ? getEmergencyContacts(currentDisaster) : [];
    servicesAlerted.innerHTML = contacts.map(contact => 
        `<div>✓ ${contact.name}: ${contact.number}</div>`
    ).join('');
    
    if (contacts.length === 0) {
        servicesAlerted.innerHTML = '<div>✓ General Emergency: 112</div>';
    }
    
    emergencyInfo.classList.remove('hidden');
    
    // Log to console
    console.log('EMERGENCY REPORTED', {
        timestamp,
        location,
        disaster: currentDisaster,
        services: contacts
    });
    
    // Save emergency log to localStorage
    saveEmergencyLog({
        timestamp,
        disaster: currentDisaster,
        location
    });
}

/**
 * Campus Map Click Handler
 */
function handleMapClick(e) {
    const location = e.target.dataset.name || e.target.dataset.point;
    if (location) {
        selectedLocation.textContent = location;
        locationDescription.textContent = LOCATION_DESCRIPTIONS[location] || 'Location not documented.';
        mapDetails.classList.remove('hidden');
    }
}

/**
 * Handle Disaster Selection
 */
function handleDisasterSelection(event) {
    const selectedDisaster = event.target.value;
    
    if (!selectedDisaster) {
        hideAllSections();
        currentDisaster = null;
        return;
    }

    currentDisaster = selectedDisaster;
    
    // Initialize checklist state for new disaster
    initializeChecklistState(selectedDisaster);
    
    // Load saved progress if exists
    loadDisasterProgress(selectedDisaster);
    
    // Display all relevant sections
    displaySafetyActions(selectedDisaster);
    displayChecklist(selectedDisaster);
    displayEmergencyContacts(selectedDisaster);
    displayJsonSchema(selectedDisaster);
    
    // Update progress stats
    updateProgressStats();
    
    console.log(`Selected Disaster: ${selectedDisaster}`);
    console.log(getResponseSchema(selectedDisaster));
}

/**
 * Initialize Checklist State
 */
function initializeChecklistState(disasterType) {
    const items = getChecklistItems(disasterType);
    checklistState = {};
    items.forEach((item, index) => {
        checklistState[index] = {
            item: item,
            completed: false
        };
    });
}

/**
 * Display Safety Actions with Animations
 */
function displaySafetyActions(disasterType) {
    const actions = getSafetyActions(disasterType);
    safetyActionsDiv.innerHTML = '';
    
    actions.forEach((action, index) => {
        const actionElement = document.createElement('div');
        actionElement.className = 'action-item fade-in';
        actionElement.style.animationDelay = `${index * 0.1}s`;
        actionElement.innerHTML = `
            <strong>Step ${action.step}: ${action.title}</strong>
            <p>${action.description}</p>
        `;
        safetyActionsDiv.appendChild(actionElement);
    });
    
    safetyActionsSection.classList.remove('hidden');
}

/**
 * Display Checklist Items
 */
function displayChecklist(disasterType) {
    const items = getChecklistItems(disasterType);
    checklistItemsDiv.innerHTML = '';
    
    items.forEach((item, index) => {
        const checklistElement = document.createElement('div');
        checklistElement.className = 'checklist-item fade-in';
        checklistElement.style.animationDelay = `${index * 0.05}s`;
        const checkboxId = `checklist-${index}`;
        
        checklistElement.innerHTML = `
            <input 
                type="checkbox" 
                id="${checkboxId}" 
                data-index="${index}"
                ${checklistState[index]?.completed ? 'checked' : ''}
            >
            <label for="${checkboxId}">${item}</label>
        `;
        
        const checkbox = checklistElement.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => handleChecklistChange(e, index));
        
        checklistItemsDiv.appendChild(checklistElement);
    });
    
    checklistSection.classList.remove('hidden');
    updatePreparednessScore(disasterType);
}

/**
 * Handle Checklist Item Change
 */
function handleChecklistChange(event, index) {
    checklistState[index].completed = event.target.checked;
    updatePreparednessScore(currentDisaster);
    updateJsonSchema(currentDisaster);
    saveDisasterProgress(currentDisaster);
}

/**
 * Update Preparedness Score
 */
function updatePreparednessScore(disasterType) {
    const completed = Object.values(checklistState).filter(item => item.completed).length;
    const total = Object.keys(checklistState).length;
    
    const score = calculatePreparednessScore(completed, total);
    const status = getStatusMessage(score);
    
    preparednessScoreSpan.textContent = score;
    progressFill.style.width = score + '%';
    statusMessage.textContent = status;
    
    statusMessage.classList.remove('prepared');
    if (score >= 80) {
        statusMessage.classList.add('prepared');
    }
}

/**
 * Display Emergency Contacts
 */
function displayEmergencyContacts(disasterType) {
    const contacts = getEmergencyContacts(disasterType);
    emergencyContactsDiv.innerHTML = '';
    
    contacts.forEach(contact => {
        const contactElement = document.createElement('div');
        contactElement.className = 'contact-card fade-in';
        contactElement.innerHTML = `
            <h3>${contact.name}</h3>
            <p>📞 <strong>${contact.number}</strong></p>
            <p>Available 24/7 for emergencies</p>
        `;
        emergencyContactsDiv.appendChild(contactElement);
    });
    
    emergencySection.classList.remove('hidden');
}

/**
 * Get Response Schema
 */
function getResponseSchema(disasterType) {
    const checklist = Object.values(checklistState).map(item => ({
        item: item.item,
        completed: item.completed
    }));
    
    return buildResponseSchema(disasterType, checklist);
}

/**
 * Display JSON Schema
 */
function displayJsonSchema(disasterType) {
    jsonSection.classList.remove('hidden');
    updateJsonSchema(disasterType);
}

/**
 * Update JSON Schema Output
 */
function updateJsonSchema(disasterType) {
    const schema = getResponseSchema(disasterType);
    jsonOutput.textContent = JSON.stringify(schema, null, 2);
}

/**
 * Toggle JSON Display
 */
function toggleJsonDisplay() {
    jsonOutput.classList.toggle('hidden');
    
    if (jsonOutput.classList.contains('hidden')) {
        toggleJsonBtn.textContent = 'Show JSON';
    } else {
        toggleJsonBtn.textContent = 'Hide JSON';
        if (currentDisaster) {
            updateJsonSchema(currentDisaster);
        }
    }
}

/**
 * Download JSON
 */
function downloadJson() {
    if (!currentDisaster) {
        alert('Please select a disaster type first');
        return;
    }
    
    const schema = getResponseSchema(currentDisaster);
    const dataStr = JSON.stringify(schema, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SafeCampus_${currentDisaster}_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Hide All Sections
 */
function hideAllSections() {
    safetyActionsSection.classList.add('hidden');
    checklistSection.classList.add('hidden');
    emergencySection.classList.add('hidden');
    jsonSection.classList.add('hidden');
    mapDetails.classList.add('hidden');
}

/**
 * Update Progress Statistics
 */
function updateProgressStats() {
    const stats = calculateOverallStats();
    progressStats.innerHTML = `
        <div class="stat-card">
            <h4>Disasters Studied</h4>
            <div class="stat-value">${stats.disastersStudied}</div>
            <div class="stat-label">Out of 4</div>
        </div>
        <div class="stat-card">
            <h4>Overall Preparedness</h4>
            <div class="stat-value">${stats.overallScore}%</div>
            <div class="stat-label">${stats.overallStatus}</div>
        </div>
        <div class="stat-card">
            <h4>Checklists Completed</h4>
            <div class="stat-value">${stats.completedChecklists}</div>
            <div class="stat-label">Total Items</div>
        </div>
    `;
}

/**
 * Calculate Overall Statistics
 */
function calculateOverallStats() {
    const disastersStudied = Object.keys(appState.disasterProgress).length;
    let totalScore = 0;
    let totalItems = 0;
    let completedItems = 0;
    
    Object.values(appState.disasterProgress).forEach(progress => {
        const items = progress.checklist || [];
        const completed = items.filter(i => i.completed).length;
        completedItems += completed;
        totalItems += items.length;
    });
    
    const overallScore = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const overallStatus = overallScore >= 80 ? 'Prepared' : overallScore >= 50 ? 'Partially Prepared' : 'Needs Improvement';
    
    return {
        disastersStudied,
        overallScore,
        overallStatus,
        completedChecklists: completedItems
    };
}

/**
 * Save Disaster Progress to Local Storage
 */
function saveDisasterProgress(disasterType) {
    appState.disasterProgress[disasterType] = {
        checklist: Object.values(checklistState),
        lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem('SafeCampus_Progress', JSON.stringify(appState.disasterProgress));
    updateSyncStatus();
}

/**
 * Load Disaster Progress from Local Storage
 */
function loadDisasterProgress(disasterType) {
    const saved = appState.disasterProgress[disasterType];
    if (saved && saved.checklist) {
        saved.checklist.forEach((item, index) => {
            if (checklistState[index]) {
                checklistState[index].completed = item.completed;
            }
        });
    }
}

/**
 * Save Progress (Manual)
 */
function saveProgress() {
    if (currentDisaster) {
        saveDisasterProgress(currentDisaster);
        alert('✓ Progress saved successfully!');
    } else {
        alert('Please select a disaster first');
    }
}

/**
 * Clear Progress
 */
function clearProgress() {
    if (confirm('Are you sure you want to clear all saved progress? This cannot be undone.')) {
        localStorage.removeItem('SafeCampus_Progress');
        appState.disasterProgress = {};
        location.reload();
    }
}

/**
 * Export Data
 */
function exportData() {
    const data = {
        appState,
        timestamp: new Date().toISOString(),
        stats: calculateOverallStats()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SafeCampus_Export_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Save Emergency Log
 */
function saveEmergencyLog(log) {
    const logs = JSON.parse(localStorage.getItem('SafeCampus_EmergencyLogs') || '[]');
    logs.push(log);
    localStorage.setItem('SafeCampus_EmergencyLogs', JSON.stringify(logs));
}

/**
 * Update Sync Status
 */
function updateSyncStatus() {
    syncStatus.textContent = '✓ Synced';
    syncStatus.style.background = 'rgba(81, 207, 102, 0.2)';
    
    setTimeout(() => {
        syncStatus.textContent = '✓ Synced';
    }, 2000);
}

/**
 * Handle Online
 */
function handleOnline() {
    appState.offlineMode = false;
    offlineIndicator.classList.add('hidden');
    updateSyncStatus();
    console.log('Application is online');
}

/**
 * Handle Offline
 */
function handleOffline() {
    appState.offlineMode = true;
    offlineIndicator.classList.remove('hidden');
    console.log('Application is offline - using cached data');
}

/**
 * Initialize Application
 */
function initializeApp() {
    // Load saved progress
    const saved = localStorage.getItem('SafeCampus_Progress');
    if (saved) {
        appState.disasterProgress = JSON.parse(saved);
    }
    
    // Check online status
    if (!navigator.onLine) {
        handleOffline();
    }
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Log initialization
    console.log('SafeCampus Application Initialized');
    console.log('Available Disasters:', Object.keys(DISASTERS_DATA));
    console.log('Offline Mode:', appState.offlineMode);
}

// Start Application
document.addEventListener('DOMContentLoaded', initializeApp);
