// TwentyBack Signup Form Handler

// Configuration
const API_ENDPOINT = 'https://api.twentyback.com/api/auth/signup';
// IMPORTANT: Replace with your actual CloudFlare Turnstile site key before deployment
// See SIGNUP_CONFIGURATION.md for setup instructions
const TURNSTILE_SITE_KEY = '0x4AAAAAAB7dgfag8YlmtqST';

// State management
let turnstileToken = null;
let isSubmitting = false;
let signupMethod = 'email'; // 'email' or 'phone'
let fieldData = {
    email: '',
    phone: ''
};

// Initialize form when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
});

/**
 * Initialize form and event listeners
 */
function initializeForm() {
    const form = document.getElementById('signup-form');
    const submitButton = document.getElementById('submit-button');
    
    // Add form submit listener
    form.addEventListener('submit', handleFormSubmit);
    
    // Add input validation listeners
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
    
    // Initialize toggle functionality
    initializeToggle();
    
    // Initialize phone formatting
    initializePhoneFormatting();
    
    // Initialize Turnstile widget
    if (typeof turnstile !== 'undefined') {
        turnstile.render('#turnstile-widget', {
            sitekey: TURNSTILE_SITE_KEY,
            callback: onTurnstileSuccess,
            'error-callback': onTurnstileError,
            'expired-callback': onTurnstileExpired,
        });
    } else {
        // Turnstile script hasn't loaded yet, wait for it
        console.warn('Turnstile script not loaded yet, will retry...');
        setTimeout(() => {
            if (typeof turnstile !== 'undefined') {
                turnstile.render('#turnstile-widget', {
                    sitekey: TURNSTILE_SITE_KEY,
                    callback: onTurnstileSuccess,
                    'error-callback': onTurnstileError,
                    'expired-callback': onTurnstileExpired,
                });
            } else {
                console.error('Turnstile failed to load. Please check your internet connection and refresh the page.');
            }
        }, 2000);
    }
}

/**
 * Initialize toggle functionality
 */
function initializeToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-option');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', handleToggleChange);
    });
}

/**
 * Handle toggle change between email and phone
 */
function handleToggleChange(event) {
    const newMethod = event.currentTarget.dataset.method;
    
    if (newMethod === signupMethod) return;
    
    // Check if user has entered data in current field
    const currentField = document.getElementById(signupMethod);
    if (currentField && currentField.value.trim()) {
        if (!confirm('Switching will clear the current field. Continue?')) {
            return;
        }
    }
    
    // Store current data before switching
    if (currentField) {
        fieldData[signupMethod] = currentField.value;
    }
    
    // Update state
    signupMethod = newMethod;
    
    // Update UI
    updateToggleUI(newMethod);
    switchContactField(newMethod);
    
    // Focus new field
    const newField = document.getElementById(newMethod);
    if (newField) {
        newField.focus();
    }
}

/**
 * Update toggle button UI
 */
function updateToggleUI(method) {
    const toggleButtons = document.querySelectorAll('.toggle-option');
    toggleButtons.forEach(button => {
        if (button.dataset.method === method) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

/**
 * Switch between email and phone contact fields
 */
function switchContactField(method) {
    const emailField = document.getElementById('email-field');
    const phoneField = document.getElementById('phone-field');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    
    if (method === 'email') {
        emailField.classList.add('active');
        phoneField.classList.remove('active');
        emailInput.required = true;
        phoneInput.required = false;
        phoneInput.value = ''; // Clear phone field
        clearFieldError(phoneInput);
    } else {
        phoneField.classList.add('active');
        emailField.classList.remove('active');
        phoneInput.required = true;
        emailInput.required = false;
        emailInput.value = ''; // Clear email field
        clearFieldError(emailInput);
    }
}

/**
 * Handle Turnstile success callback
 */
function onTurnstileSuccess(token) {
    turnstileToken = token;
    const submitButton = document.getElementById('submit-button');
    submitButton.disabled = false;
    submitButton.classList.remove('disabled');
}

/**
 * Handle Turnstile error callback
 */
function onTurnstileError() {
    turnstileToken = null;
    const submitButton = document.getElementById('submit-button');
    submitButton.disabled = true;
    submitButton.classList.add('disabled');
    showMessage('Captcha verification failed. Please refresh the page and try again.', 'error');
}

/**
 * Handle Turnstile expired callback
 */
function onTurnstileExpired() {
    turnstileToken = null;
    const submitButton = document.getElementById('submit-button');
    submitButton.disabled = true;
    submitButton.classList.add('disabled');
    showMessage('Captcha expired. Please verify again.', 'error');
}

/**
 * Validate individual field
 */
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    
    // Required field check
    if (field.required && !value) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    
    // Email validation
    if (fieldName === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    }
    
    // Phone validation
    if (fieldName === 'phone' && value) {
        // Remove all non-digit characters for validation
        const phoneDigits = value.replace(/\D/g, '');
        
        // US/International phone validation (10-15 digits)
        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
        }
        
        // Additional format validation
        const phoneRegex = /^[\+]?[1-9][\d]{0,14}$/;
        if (!phoneRegex.test(phoneDigits)) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
        }
    }
    
    // Name validation (letters, spaces, hyphens, apostrophes, periods)
    if ((fieldName === 'firstName' || fieldName === 'lastName') && value) {
        const nameRegex = /^[a-zA-Z\s\-'.]+$/;
        if (!nameRegex.test(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid name';
        }
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    } else {
        clearFieldError(field);
    }
    
    return isValid;
}

/**
 * Show field error
 */
function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    const errorElement = formGroup.querySelector('.field-error');
    
    field.classList.add('error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

/**
 * Clear field error
 */
function clearFieldError(field) {
    const formGroup = field.closest('.form-group');
    const errorElement = formGroup.querySelector('.field-error');
    
    field.classList.remove('error');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

/**
 * Format phone number as user types
 */
function formatPhoneNumber(input) {
    // Remove all non-digit characters
    let value = input.value.replace(/\D/g, '');
    
    // Apply US phone format: (xxx) xxx-xxxx
    if (value.length >= 6) {
        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
    } else if (value.length >= 3) {
        value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    }
    
    input.value = value;
}

/**
 * Initialize phone formatting
 */
function initializePhoneFormatting() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', () => formatPhoneNumber(phoneInput));
    }
}

/**
 * Validate entire form
 */
function validateForm() {
    const form = document.getElementById('signup-form');
    const requiredInputs = form.querySelectorAll('input[required]');
    let isValid = true;
    
    requiredInputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    if (!turnstileToken) {
        showMessage('Please complete the captcha verification', 'error');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
        return;
    }
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Get form data
    const form = document.getElementById('signup-form');
    const formData = new FormData(form);
    
    const signupData = {
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName')?.trim() || undefined,
        company: formData.get('company')?.trim() || undefined,
        captcha: turnstileToken
    };
    
    // Add email or phone based on signup method
    if (signupMethod === 'email') {
        signupData.email = formData.get('email').trim();
    } else {
        signupData.phone = formData.get('phone').trim();
    }
    
    // Submit form
    await submitForm(signupData);
}

/**
 * Submit form to API
 */
async function submitForm(data) {
    const submitButton = document.getElementById('submit-button');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonSpinner = submitButton.querySelector('.button-spinner');
    
    try {
        // Set loading state
        isSubmitting = true;
        submitButton.disabled = true;
        buttonText.style.display = 'none';
        buttonSpinner.style.display = 'inline-block';
        hideMessage();
        
        // Make API call
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        // Handle response
        await handleApiResponse(response);
        
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('An error occurred. Please try again later.', 'error');
    } finally {
        // Reset loading state
        isSubmitting = false;
        submitButton.disabled = false;
        buttonText.style.display = 'inline';
        buttonSpinner.style.display = 'none';
    }
}

/**
 * Handle API response
 */
async function handleApiResponse(response) {
    if (response.ok) {
        // Success
        const data = await response.json();
        
        // Store user contact info for success page
        const form = document.getElementById('signup-form');
        const formData = new FormData(form);
        const contact = signupMethod === 'email' 
            ? formData.get('email').trim() 
            : formData.get('phone').trim();
        
        // Store in localStorage (preferred method)
        let useUrlParam = false;
        try {
            if (signupMethod === 'email') {
                localStorage.setItem('userEmail', contact);
            } else {
                localStorage.setItem('userPhone', contact);
            }
        } catch (e) {
            // LocalStorage not available, will use URL parameter as fallback
            useUrlParam = true;
        }
        
        // Redirect to success page
        // Only include contact in URL if localStorage is not available
        const paramName = signupMethod === 'email' ? 'email' : 'phone';
        window.location.href = useUrlParam ? `success.html?${paramName}=${encodeURIComponent(contact)}` : 'success.html';
    } else {
        // Error
        let errorMessage = 'An error occurred. Please try again.';
        
        try {
            const errorData = await response.json();
            if (errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            // Use default error message
        }
        
        if (response.status === 409) {
            errorMessage = signupMethod === 'email' 
                ? 'This email is already registered.' 
                : 'This phone number is already registered.';
        } else if (response.status === 400) {
            errorMessage = 'Please check your information and try again.';
        } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
        }
        
        showMessage(errorMessage, 'error');
        
        // Reset Turnstile
        if (typeof turnstile !== 'undefined') {
            turnstile.reset();
        }
        turnstileToken = null;
        document.getElementById('submit-button').disabled = true;
    }
}

/**
 * Show success or error message
 */
function showMessage(message, type) {
    const messageContainer = document.getElementById('form-message');
    messageContainer.textContent = message;
    messageContainer.className = `form-message ${type}`;
    messageContainer.style.display = 'block';
    
    // Scroll to message
    messageContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Hide message
 */
function hideMessage() {
    const messageContainer = document.getElementById('form-message');
    messageContainer.style.display = 'none';
}

/**
 * Reset form after successful submission
 */
function resetForm() {
    const form = document.getElementById('signup-form');
    form.reset();
    
    // Clear all field errors
    const fields = form.querySelectorAll('input');
    fields.forEach(field => clearFieldError(field));
    
    // Reset to email method
    signupMethod = 'email';
    fieldData = { email: '', phone: '' };
    updateToggleUI('email');
    switchContactField('email');
    
    // Reset Turnstile
    if (typeof turnstile !== 'undefined') {
        turnstile.reset();
    }
    turnstileToken = null;
    
    // Disable submit button
    const submitButton = document.getElementById('submit-button');
    submitButton.disabled = true;
    submitButton.classList.add('disabled');
}
