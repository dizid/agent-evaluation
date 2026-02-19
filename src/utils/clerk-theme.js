// Shared Clerk appearance config for dark mode auth pages.
// Uses CSS-in-JS style objects (NOT Tailwind classes) so styles
// apply correctly inside Clerk's rendering scope.

export const clerkDarkAppearance = {
  variables: {
    colorPrimary: '#7c3aed',
    colorBackground: 'transparent',
    colorInputBackground: 'rgba(255, 255, 255, 0.06)',
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: 'rgba(255, 255, 255, 0.55)',
    colorDanger: '#ff4757',
    colorSuccess: '#00ff88',
    colorNeutral: 'rgba(255, 255, 255, 0.7)',
    colorTextOnPrimaryBackground: '#ffffff',
    borderRadius: '0.75rem',
    fontFamily: 'inherit',
  },
  elements: {
    // Outer wrapper
    rootBox: {
      width: '100%',
    },
    // Card — transparent to show our glass card behind it
    card: {
      backgroundColor: 'transparent',
      boxShadow: 'none',
      border: 'none',
      padding: '0',
    },
    // Header
    headerTitle: {
      color: '#ffffff',
      fontWeight: '600',
    },
    headerSubtitle: {
      color: 'rgba(255, 255, 255, 0.55)',
    },
    // Social / OAuth buttons
    socialButtonsBlockButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      color: 'rgba(255, 255, 255, 0.8)',
      transition: 'background-color 0.15s ease, border-color 0.15s ease',
    },
    socialButtonsBlockButtonText: {
      color: 'rgba(255, 255, 255, 0.8)',
    },
    // Divider between social and email
    dividerLine: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dividerText: {
      color: 'rgba(255, 255, 255, 0.35)',
    },
    // Form fields
    formFieldLabel: {
      color: 'rgba(255, 255, 255, 0.6)',
    },
    formFieldInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      color: '#ffffff',
      transition: 'border-color 0.15s ease',
    },
    formFieldInputShowPasswordButton: {
      color: 'rgba(255, 255, 255, 0.4)',
    },
    // Primary button
    formButtonPrimary: {
      backgroundColor: '#7c3aed',
      color: '#ffffff',
      fontWeight: '500',
      transition: 'background-color 0.15s ease',
    },
    // Footer links
    footerActionLink: {
      color: '#7c3aed',
    },
    footerActionText: {
      color: 'rgba(255, 255, 255, 0.45)',
    },
    // Powered by Clerk badge
    footer: {
      '& > *': {
        color: 'rgba(255, 255, 255, 0.25)',
      },
    },
    // Error/alert messages
    alert: {
      backgroundColor: 'rgba(255, 71, 87, 0.1)',
      borderColor: 'rgba(255, 71, 87, 0.25)',
      color: '#ff6b7a',
    },
    alertText: {
      color: '#ff6b7a',
    },
    // Identifier / user button shown during multi-step
    identityPreview: {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    identityPreviewText: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    identityPreviewEditButton: {
      color: '#7c3aed',
    },
    // OTP / verification code input
    otpCodeFieldInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      color: '#ffffff',
    },
    // Back button in multi-step flows
    formHeaderTitle: {
      color: '#ffffff',
    },
    formHeaderSubtitle: {
      color: 'rgba(255, 255, 255, 0.55)',
    },
    // Internal elements (Clerk branding)
    internal: {
      color: 'rgba(255, 255, 255, 0.2)',
    },
  },
}
