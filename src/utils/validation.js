// Validation utilities to be reused across the app

// Regex patterns
export const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
export const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[.@#$%^&+=])(?=\S+$).{8,20}$/;

// Primitive validators (boolean results only)
export const isValidEmail = (email) => EMAIL_REGEX.test(String(email || ''));
export const isStrongPassword = (password) => PASSWORD_REGEX.test(String(password || ''));


