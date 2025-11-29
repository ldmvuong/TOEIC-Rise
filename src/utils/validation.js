// Validation utilities to be reused across the app

// Regex patterns
export const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
export const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[.@#$%^&+=])(?=\S+$).{8,20}$/;
export const TEST_SET_NAME_REGEX = /^[a-zA-Z0-9 ()]+$/;
export const TEST_NAME_REGEX = /^[a-zA-Z0-9 ()]+$/; // same as backend Constant.TEST_NAME_PATTERN
export const FULLNAME_REGEX = /^[\p{L} ]+$/u; // Matches backend PROFILE_FULLNAME_PATTERN = "^[\\p{L} ]+$"

// Avatar validation constants
export const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB - Matches backend AVATAR_MAX_SIZE
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

// Primitive validators (boolean results only)
export const isValidEmail = (email) => EMAIL_REGEX.test(String(email || ''));
export const isStrongPassword = (password) => PASSWORD_REGEX.test(String(password || ''));
export const isValidTestSetName = (name) => TEST_SET_NAME_REGEX.test(String(name || ''));
export const isValidTestName = (name) => TEST_NAME_REGEX.test(String(name || ''));
export const isValidFullName = (name) => FULLNAME_REGEX.test(String(name || ''));

// Avatar validators
export const isValidImageExtension = (filename) => {
    if (!filename) return false;
    const lowerFilename = filename.toLowerCase();
    return ALLOWED_IMAGE_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
};

export const isValidImageSize = (fileSize) => {
    return fileSize > 0 && fileSize <= AVATAR_MAX_SIZE;
};

export const validateAvatar = (file) => {
    if (!file) return { valid: true };
    
    const errors = [];
    
    if (!isValidImageExtension(file.name)) {
        errors.push('File ảnh phải có định dạng: jpg, jpeg, png, gif, bmp, webp');
    }
    
    if (!isValidImageSize(file.size)) {
        errors.push('File ảnh không được vượt quá 2MB');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};
