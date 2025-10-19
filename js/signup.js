// TwentyBack Signup Form Handler

// Configuration
const API_ENDPOINT = 'https://api.twentyback.com/api/auth/signup';
// IMPORTANT: Replace with your actual CloudFlare Turnstile site key before deployment
// See SIGNUP_CONFIGURATION.md for setup instructions
const TURNSTILE_SITE_KEY = 'YOUR_SITE_KEY_HERE';

// State management
let turnstileToken = null;
let isSubmitting = false;

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
        email: formData.get('email').trim(),
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName')?.trim() || undefined,
        company: formData.get('company')?.trim() || undefined,
        captcha: turnstileToken
    };
    
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
        showMessage('Thank you for signing up! Check your email for next steps.', 'success');
        resetForm();
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
            errorMessage = 'This email is already registered.';
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
