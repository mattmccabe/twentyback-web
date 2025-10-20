// TwentyBack Success Page Handler

// Configuration
const API_ENDPOINT = 'https://api.twentyback.com/api/auth/resend-verification';

// State management
let isResending = false;

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

/**
 * Initialize success page functionality
 */
function initializePage() {
    // Get user email from URL parameters or localStorage
    const userEmail = getUserEmail();
    
    // Setup resend verification button
    const resendButton = document.getElementById('resend-button');
    if (resendButton) {
        resendButton.addEventListener('click', handleResendVerification);
    }
    
    // Add smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * Get user email from URL parameters or localStorage
 */
function getUserEmail() {
    // Try URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    let email = urlParams.get('email');
    
    // If not in URL, try localStorage
    if (!email) {
        email = localStorage.getItem('userEmail');
    }
    
    return email;
}

/**
 * Handle resend verification email
 */
async function handleResendVerification(event) {
    event.preventDefault();
    
    // Prevent multiple requests
    if (isResending) {
        return;
    }
    
    const button = event.target;
    const originalText = button.textContent;
    const userEmail = getUserEmail();
    
    if (!userEmail) {
        showToastMessage('Please check your email for the verification link.', 'info');
        return;
    }
    
    try {
        // Set loading state
        isResending = true;
        button.disabled = true;
        button.textContent = 'Sending...';
        
        // Make API call to resend verification
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: userEmail })
        });
        
        if (response.ok) {
            showToastMessage('Verification email sent! Check your inbox.', 'success');
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || 'Failed to resend email. Please try again.';
            showToastMessage(errorMessage, 'error');
        }
        
    } catch (error) {
        console.error('Resend error:', error);
        showToastMessage('An error occurred. Please try again later.', 'error');
    } finally {
        // Reset button state
        setTimeout(() => {
            isResending = false;
            button.disabled = false;
            button.textContent = originalText;
        }, 3000);
    }
}

/**
 * Show toast message
 */
function showToastMessage(message, type = 'info') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    
    // Add styles for toast
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
        max-width: 400px;
    `;
    
    // Add animation keyframes if not already added
    if (!document.querySelector('#toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to page
    document.body.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

/**
 * Check verification status periodically (optional enhancement)
 */
function checkVerificationStatus() {
    // This could periodically check if the user has verified their email
    // and update the UI accordingly
    // Implementation depends on backend API availability
}
