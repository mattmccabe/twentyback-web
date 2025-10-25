// TwentyBack Account Verification Handler

// Configuration
const API_ENDPOINTS = {
    VERIFY: 'https://api.twentyback.com/api/auth/verify',
    RESEND: 'https://api.twentyback.com/api/resend',
    CHANGE_METHOD: 'https://api.twentyback.com/api/auth/change-verification-method'
};

const CONFIG = {
    CODE_LENGTH: 6,
    RESEND_COOLDOWN: 60, // seconds
    CODE_EXPIRY: 600, // 10 minutes in seconds
    MAX_ATTEMPTS: 5,
    AUTO_SUBMIT_DELAY: 500 // ms after last digit entry
};

// State management
let verificationState = {
    method: 'email', // 'email' or 'phone'
    contact: '', // user's email or phone
    token: null, // verification token for email links
    code: '', // current entered code
    attempts: 0,
    resendCooldown: 0,
    isSubmitting: false,
    autoSubmitTimer: null
};

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeVerificationPage();
});

/**
 * Initialize verification page
 */
function initializeVerificationPage() {
    // Parse URL parameters
    parseUrlParameters();
    
    // Setup page content based on verification method
    setupPageContent();
    
    // Initialize form handlers
    initializeFormHandlers();
    
    // Initialize code input behavior
    initializeCodeInput();
    
    // Start resend cooldown if applicable
    startResendCooldown();
    
    // Handle direct token verification (email links)
    if (verificationState.token) {
        handleDirectTokenVerification();
    }
    
    // Setup accessibility features
    setupAccessibility();
}

/**
 * Parse URL parameters to determine verification method and context
 */
function parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Get verification method
    verificationState.method = urlParams.get('method') || 'email';
    
    // Get contact info (fallback)
    verificationState.contact = urlParams.get('contact') || getUserContactFromStorage();
    
    // Get verification token (for direct email verification)
    verificationState.token = urlParams.get('token');
    
    // Validate parameters
    if (!['email', 'phone'].includes(verificationState.method)) {
        verificationState.method = 'email';
    }
}

/**
 * Get user contact info from localStorage or sessionStorage
 */
function getUserContactFromStorage() {
    try {
        if (verificationState.method === 'email') {
            return localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || '';
        } else {
            return localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone') || '';
        }
    } catch (e) {
        return '';
    }
}

/**
 * Setup page content based on verification method
 */
function setupPageContent() {
    const content = getContentForMethod(verificationState.method);
    
    // Update page elements
    document.getElementById('verification-title').textContent = content.title;
    document.getElementById('verification-subtitle').textContent = 
        content.subtitle + (verificationState.contact ? ` (${maskContact(verificationState.contact)})` : '');
    document.getElementById('code-hint').textContent = content.hint;
    document.getElementById('resend-text').textContent = content.resendText;
    document.getElementById('change-method-button').textContent = content.changeMethodText;
    
    // Update icon
    const iconElement = document.getElementById('verification-method-icon');
    iconElement.innerHTML = content.icon;
    
    // Update page title
    document.title = `${content.title} - TwentyBack`;
}

/**
 * Get content configuration for verification method
 */
function getContentForMethod(method) {
    const content = {
        email: {
            title: "Check Your Email",
            subtitle: "We've sent a 6-digit verification code to your email address",
            hint: "Check your spam folder if you don't see the email",
            resendText: "Resend Email",
            changeMethodText: "Use Phone Instead",
            icon: `<svg width="32" height="32" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.83333 9.16667V6.66667C5.83333 4.36548 7.69881 2.5 10 2.5C12.3012 2.5 14.1667 4.36548 14.1667 6.66667V9.16667M10 11.6667V13.3333M6.66667 17.5H13.3333C14.2538 17.5 15 16.7538 15 15.8333V10.8333C15 9.91286 14.2538 9.16667 13.3333 9.16667H6.66667C5.74619 9.16667 5 9.91286 5 10.8333V15.8333C5 16.7538 5.74619 17.5 6.66667 17.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`
        },
        phone: {
            title: "Check Your Phone",
            subtitle: "We've sent a 6-digit verification code via SMS",
            hint: "The code expires in 10 minutes",
            resendText: "Resend SMS",
            changeMethodText: "Use Email Instead", 
            icon: `<svg width="32" height="32" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.83333 9.16667V6.66667C5.83333 4.36548 7.69881 2.5 10 2.5C12.3012 2.5 14.1667 4.36548 14.1667 6.66667V9.16667M10 11.6667V13.3333M6.66667 17.5H13.3333C14.2538 17.5 15 16.7538 15 15.8333V10.8333C15 9.91286 14.2538 9.16667 13.3333 9.16667H6.66667C5.74619 9.16667 5 9.91286 5 10.8333V15.8333C5 16.7538 5.74619 17.5 6.66667 17.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`
        }
    };
    
    return content[method] || content.email;
}

/**
 * Mask contact information for privacy
 */
function maskContact(contact) {
    if (!contact) return '';
    
    if (verificationState.method === 'email') {
        const [username, domain] = contact.split('@');
        if (username && domain) {
            const maskedUsername = username.length > 2 
                ? username.substring(0, 2) + '*'.repeat(username.length - 2)
                : username;
            return `${maskedUsername}@${domain}`;
        }
    } else {
        // Phone number masking
        const digits = contact.replace(/\D/g, '');
        if (digits.length >= 10) {
            return `***-***-${digits.slice(-4)}`;
        }
    }
    
    return contact;
}

/**
 * Initialize code input behavior
 */
function initializeCodeInput() {
    const codeInputs = document.querySelectorAll('.code-digit');
    
    codeInputs.forEach((input, index) => {
        // Input event handler
        input.addEventListener('input', (e) => handleCodeInput(e, index));
        
        // Keydown event handler for navigation
        input.addEventListener('keydown', (e) => handleCodeKeydown(e, index));
        
        // Focus event handler
        input.addEventListener('focus', (e) => handleCodeFocus(e, index));
        
        // Paste event handler
        input.addEventListener('paste', (e) => handleCodePaste(e, index));
    });
}

/**
 * Handle code input
 */
function handleCodeInput(event, index) {
    const input = event.target;
    const value = input.value;
    
    // Only allow digits
    if (!/^\d$/.test(value)) {
        input.value = '';
        return;
    }
    
    // Update visual state
    input.classList.add('filled');
    input.classList.remove('error');
    
    // Move to next input
    if (value && index < CONFIG.CODE_LENGTH - 1) {
        const nextInput = document.querySelectorAll('.code-digit')[index + 1];
        nextInput.focus();
    }
    
    // Update code state
    updateCodeState();
    
    // Auto-submit if all digits filled
    if (getEnteredCode().length === CONFIG.CODE_LENGTH) {
        // Clear any existing timer
        if (verificationState.autoSubmitTimer) {
            clearTimeout(verificationState.autoSubmitTimer);
        }
        
        // Set timer for auto-submission
        verificationState.autoSubmitTimer = setTimeout(() => {
            const verifyButton = document.getElementById('verify-button');
            if (!verifyButton.disabled) {
                handleFormSubmit();
            }
        }, CONFIG.AUTO_SUBMIT_DELAY);
    }
}

/**
 * Handle keydown events for code input navigation
 */
function handleCodeKeydown(event, index) {
    const key = event.key;
    
    // Handle backspace
    if (key === 'Backspace') {
        const input = event.target;
        
        if (!input.value && index > 0) {
            // Move to previous input if current is empty
            event.preventDefault();
            const prevInput = document.querySelectorAll('.code-digit')[index - 1];
            prevInput.focus();
            prevInput.value = '';
            prevInput.classList.remove('filled', 'error');
        } else if (input.value) {
            // Clear current input
            input.value = '';
            input.classList.remove('filled', 'error');
        }
        
        updateCodeState();
    }
    
    // Handle arrow key navigation
    if (key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        document.querySelectorAll('.code-digit')[index - 1].focus();
    }
    
    if (key === 'ArrowRight' && index < CONFIG.CODE_LENGTH - 1) {
        event.preventDefault();
        document.querySelectorAll('.code-digit')[index + 1].focus();
    }
    
    // Handle Enter key
    if (key === 'Enter') {
        event.preventDefault();
        const verifyButton = document.getElementById('verify-button');
        if (!verifyButton.disabled) {
            handleFormSubmit();
        }
    }
}

/**
 * Handle focus events for code inputs
 */
function handleCodeFocus(event, index) {
    // Select all text on focus for easy replacement
    event.target.select();
}

/**
 * Handle paste events for code inputs
 */
function handleCodePaste(event, index) {
    event.preventDefault();
    const pasteData = event.clipboardData.getData('text');
    const digits = pasteData.replace(/\D/g, '').substring(0, CONFIG.CODE_LENGTH);
    
    if (digits.length > 0) {
        // Clear all inputs first
        clearCodeInputs();
        
        // Fill inputs with pasted digits
        const codeInputs = document.querySelectorAll('.code-digit');
        for (let i = 0; i < digits.length && i < CONFIG.CODE_LENGTH; i++) {
            codeInputs[i].value = digits[i];
            codeInputs[i].classList.add('filled');
            codeInputs[i].classList.remove('error');
        }
        
        // Focus the next empty input or the last filled input
        const nextIndex = Math.min(digits.length, CONFIG.CODE_LENGTH - 1);
        codeInputs[nextIndex].focus();
        
        updateCodeState();
        
        // Auto-submit if complete code pasted
        if (digits.length === CONFIG.CODE_LENGTH) {
            verificationState.autoSubmitTimer = setTimeout(() => {
                const verifyButton = document.getElementById('verify-button');
                if (!verifyButton.disabled) {
                    handleFormSubmit();
                }
            }, CONFIG.AUTO_SUBMIT_DELAY);
        }
    }
}

/**
 * Update code state and UI
 */
function updateCodeState() {
    const code = getEnteredCode();
    verificationState.code = code;
    
    // Update submit button state
    const verifyButton = document.getElementById('verify-button');
    if (code.length === CONFIG.CODE_LENGTH) {
        verifyButton.disabled = false;
        verifyButton.classList.remove('disabled');
    } else {
        verifyButton.disabled = true;
        verifyButton.classList.add('disabled');
    }
    
    // Clear any existing error state when user types
    if (code.length > 0) {
        clearCodeError();
    }
}

/**
 * Get currently entered code
 */
function getEnteredCode() {
    const codeInputs = document.querySelectorAll('.code-digit');
    return Array.from(codeInputs).map(input => input.value).join('');
}

/**
 * Clear all code inputs
 */
function clearCodeInputs() {
    const codeInputs = document.querySelectorAll('.code-digit');
    codeInputs.forEach(input => {
        input.value = '';
        input.classList.remove('filled', 'error');
    });
    updateCodeState();
}

/**
 * Show error state on code inputs
 */
function showCodeError(message) {
    const codeInputs = document.querySelectorAll('.code-digit');
    codeInputs.forEach(input => {
        input.classList.add('error');
    });
    
    const errorElement = document.getElementById('code-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

/**
 * Clear error state from code inputs
 */
function clearCodeError() {
    const codeInputs = document.querySelectorAll('.code-digit');
    codeInputs.forEach(input => {
        input.classList.remove('error');
    });
    
    const errorElement = document.getElementById('code-error');
    errorElement.textContent = '';
    errorElement.style.display = 'none';
}

/**
 * Initialize form handlers
 */
function initializeFormHandlers() {
    const form = document.getElementById('verification-form');
    const resendButton = document.getElementById('resend-button');
    const changeMethodButton = document.getElementById('change-method-button');
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Resend code
    resendButton.addEventListener('click', handleResendCode);
    
    // Change verification method
    changeMethodButton.addEventListener('click', handleChangeMethod);
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    if (event) {
        event.preventDefault();
    }
    
    // Prevent double submission
    if (verificationState.isSubmitting) {
        return;
    }
    
    const code = getEnteredCode();
    
    // Validate code length
    if (code.length !== CONFIG.CODE_LENGTH) {
        showCodeError('Please enter a complete 6-digit code');
        return;
    }
    
    // Check attempt limits
    if (verificationState.attempts >= CONFIG.MAX_ATTEMPTS) {
        showCodeError('Too many attempts. Please request a new code.');
        return;
    }
    
    await submitVerificationCode(code);
}

/**
 * Submit verification code to API
 */
async function submitVerificationCode(code) {
    const verifyButton = document.getElementById('verify-button');
    const buttonText = verifyButton.querySelector('.button-text');
    const buttonSpinner = verifyButton.querySelector('.button-spinner');
    
    try {
        // Set loading state
        verificationState.isSubmitting = true;
        verifyButton.disabled = true;
        buttonText.style.display = 'none';
        buttonSpinner.style.display = 'inline-block';
        clearCodeError();
        
        // Prepare request data
        const requestData = {
            method: verificationState.method,
            code: code,
            contact: verificationState.contact
        };
        
        // Add token for direct email verification
        if (verificationState.token) {
            requestData.token = verificationState.token;
        }
        
        // Make API call
        const response = await fetch(API_ENDPOINTS.VERIFY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        // Handle response
        await handleVerificationResponse(response);
        
    } catch (error) {
        console.error('Verification error:', error);
        verificationState.attempts++;
        showCodeError('Verification failed. Please try again.');
    } finally {
        // Reset loading state
        verificationState.isSubmitting = false;
        verifyButton.disabled = getEnteredCode().length !== CONFIG.CODE_LENGTH;
        buttonText.style.display = 'inline';
        buttonSpinner.style.display = 'none';
    }
}

/**
 * Handle verification API response
 */
async function handleVerificationResponse(response) {
    if (response.ok) {
        // Success - account verified
        const data = await response.json();
        
        // Clear stored temporary data
        clearStoredVerificationData();
        
        // Show success state briefly
        showVerificationSuccess();
        
        // Redirect to next step
        setTimeout(() => {
            redirectToNextStep(data);
        }, 1500);
        
    } else {
        // Handle different error types
        verificationState.attempts++;
        let errorMessage = 'Invalid verification code. Please try again.';
        
        try {
            const errorData = await response.json();
            if (errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            // Use default error message
        }
        
        if (response.status === 400) {
            errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (response.status === 410) {
            errorMessage = 'Verification code has expired. Please request a new one.';
            enableResendButton();
        } else if (response.status === 429) {
            errorMessage = 'Too many attempts. Please wait before trying again.';
        } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
        }
        
        showCodeError(errorMessage);
        
        // Focus first input for retry
        document.querySelectorAll('.code-digit')[0].focus();
    }
}

/**
 * Show verification success state
 */
function showVerificationSuccess() {
    // Update UI to show success
    const verifyButton = document.getElementById('verify-button');
    const buttonText = verifyButton.querySelector('.button-text');
    const buttonSpinner = verifyButton.querySelector('.button-spinner');
    
    verifyButton.classList.add('success');
    buttonText.textContent = 'Verified!';
    buttonSpinner.style.display = 'none';
    buttonText.style.display = 'inline';
    
    // Add success styling to code inputs
    const codeInputs = document.querySelectorAll('.code-digit');
    codeInputs.forEach(input => {
        input.classList.add('success');
        input.classList.remove('error');
    });
}

/**
 * Redirect to next step after verification
 */
function redirectToNextStep(data) {
    // Determine next step based on user state and API response
    const nextUrl = data.redirectUrl || data.nextStep || '/dashboard';
    
    // Store any necessary data for the next step
    if (data.userToken) {
        try {
            localStorage.setItem('userToken', data.userToken);
        } catch (e) {
            // Handle localStorage errors
        }
    }
    
    // Redirect
    window.location.href = nextUrl;
}

/**
 * Clear stored verification data
 */
function clearStoredVerificationData() {
    try {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userPhone');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('userPhone');
    } catch (e) {
        // Handle storage errors
    }
}

/**
 * Handle resend code
 */
async function handleResendCode(event) {
    event.preventDefault();
    
    // Check if cooldown is active
    if (verificationState.resendCooldown > 0) {
        return;
    }
    
    const resendButton = document.getElementById('resend-button');
    const resendText = document.getElementById('resend-text');
    const originalText = resendText.textContent;
    
    try {
        // Set loading state
        resendButton.disabled = true;
        resendText.textContent = 'Sending...';
        
        // Prepare request data
        const requestData = {
            method: verificationState.method,
            contact: verificationState.contact
        };
        
        // Make API call
        const response = await fetch(API_ENDPOINTS.RESEND, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            // Success
            resendText.textContent = 'Code Sent!';
            
            // Start cooldown
            verificationState.resendCooldown = CONFIG.RESEND_COOLDOWN;
            startResendCooldown();
            
            // Clear code inputs and reset attempts
            clearCodeInputs();
            verificationState.attempts = 0;
            
            setTimeout(() => {
                resendText.textContent = originalText;
            }, 2000);
        } else {
            // Error
            let errorMessage = 'Failed to resend code. Please try again.';
            
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // Use default error message
            }
            
            showCodeError(errorMessage);
            resendButton.disabled = false;
            resendText.textContent = originalText;
        }
        
    } catch (error) {
        console.error('Resend error:', error);
        showCodeError('Failed to resend code. Please try again.');
        resendButton.disabled = false;
        resendText.textContent = originalText;
    }
}

/**
 * Start resend cooldown timer
 */
function startResendCooldown() {
    const resendButton = document.getElementById('resend-button');
    const resendTimer = document.getElementById('resend-timer');
    
    // Enable resend after initial page load cooldown
    if (verificationState.resendCooldown === 0) {
        verificationState.resendCooldown = 30; // Initial 30 second cooldown
    }
    
    const interval = setInterval(() => {
        if (verificationState.resendCooldown > 0) {
            resendButton.disabled = true;
            resendTimer.textContent = `(${verificationState.resendCooldown}s)`;
            verificationState.resendCooldown--;
        } else {
            resendButton.disabled = false;
            resendTimer.textContent = '';
            clearInterval(interval);
        }
    }, 1000);
}

/**
 * Enable resend button immediately (used when code expires)
 */
function enableResendButton() {
    verificationState.resendCooldown = 0;
    const resendButton = document.getElementById('resend-button');
    const resendTimer = document.getElementById('resend-timer');
    resendButton.disabled = false;
    resendTimer.textContent = '';
}

/**
 * Handle change verification method
 */
async function handleChangeMethod(event) {
    event.preventDefault();
    
    const newMethod = verificationState.method === 'email' ? 'phone' : 'email';
    
    if (!confirm(`Switch to ${newMethod} verification?`)) {
        return;
    }
    
    try {
        // Prepare request data
        const requestData = {
            currentMethod: verificationState.method,
            newMethod: newMethod,
            contact: verificationState.contact
        };
        
        // Make API call
        const response = await fetch(API_ENDPOINTS.CHANGE_METHOD, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            // Success - redirect to verification page with new method
            window.location.href = `verify.html?method=${newMethod}`;
        } else {
            // Error
            let errorMessage = 'Failed to change verification method. Please try again.';
            
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // Use default error message
            }
            
            showCodeError(errorMessage);
        }
        
    } catch (error) {
        console.error('Change method error:', error);
        showCodeError('Failed to change verification method. Please try again.');
    }
}

/**
 * Handle direct token verification from email links
 */
async function handleDirectTokenVerification() {
    // Show loading state
    const verifyButton = document.getElementById('verify-button');
    const buttonText = verifyButton.querySelector('.button-text');
    const buttonSpinner = verifyButton.querySelector('.button-spinner');
    
    verifyButton.disabled = true;
    buttonText.style.display = 'none';
    buttonSpinner.style.display = 'inline-block';
    
    try {
        // Make API call with token
        const response = await fetch(API_ENDPOINTS.VERIFY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: verificationState.token,
                method: verificationState.method
            })
        });
        
        await handleVerificationResponse(response);
        
    } catch (error) {
        console.error('Token verification error:', error);
        showCodeError('Verification link is invalid or expired. Please enter the code manually.');
        
        // Reset button state
        verifyButton.disabled = false;
        buttonText.style.display = 'inline';
        buttonSpinner.style.display = 'none';
    }
}

/**
 * Setup accessibility features
 */
function setupAccessibility() {
    // Add aria labels
    const codeInputs = document.querySelectorAll('.code-digit');
    codeInputs.forEach((input, index) => {
        input.setAttribute('aria-label', `Verification code digit ${index + 1}`);
    });
    
    // Focus first input on page load
    if (codeInputs.length > 0) {
        codeInputs[0].focus();
    }
}
