// Validation utilities to be reused across the app

// Regex patterns
export const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
export const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[.@#$%^&+=])(?=\S+$).{8,20}$/;
export const TEST_SET_NAME_REGEX = /^[a-zA-Z0-9 ()]+$/;
export const TEST_NAME_REGEX = /^[a-zA-Z0-9 ()]+$/; // same as backend Constant.TEST_NAME_PATTERN
export const FULLNAME_REGEX = /^[\p{L} ]+$/u; // Matches backend PROFILE_FULLNAME_PATTERN = "^[\\p{L} ]+$"
export const TAG_NAME_REGEX = /^[\p{L}0-9 ().,\[\]':-]{1,100}$/u;
// Avatar validation constants
export const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB - Matches backend AVATAR_MAX_SIZE
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

// Question Group validation constants - Matches backend
export const QUESTION_GROUP_AUDIO_MAX_SIZE = 10 * 1024 * 1024; // 10MB
export const QUESTION_GROUP_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const QUESTION_GROUP_AUDIO_URL_REGEX = /^(https?:\/\/.*\.(mp3|wav|ogg|m4a|aac))$/i;
export const QUESTION_GROUP_IMAGE_URL_REGEX = /^(https?:\/\/.*\.(jpg|jpeg|png|gif|bmp))$/i;

// Primitive validators (boolean results only)
export const isValidEmail = (email) => EMAIL_REGEX.test(String(email || ''));
export const isStrongPassword = (password) => PASSWORD_REGEX.test(String(password || ''));
export const isValidTestSetName = (name) => TEST_SET_NAME_REGEX.test(String(name || ''));
export const isValidTestName = (name) => TEST_NAME_REGEX.test(String(name || ''));
export const isValidFullName = (name) => FULLNAME_REGEX.test(String(name || ''));
export const isValidTagName = (name) => TAG_NAME_REGEX.test(String(name || ''));

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

// Question Group validators
export const isValidQuestionGroupAudioSize = (fileSize) => {
    return fileSize > 0 && fileSize <= QUESTION_GROUP_AUDIO_MAX_SIZE;
};

export const isValidQuestionGroupImageSize = (fileSize) => {
    return fileSize > 0 && fileSize <= QUESTION_GROUP_IMAGE_MAX_SIZE;
};

export const isValidQuestionGroupAudioUrl = (url) => {
    if (!url) return false;
    return QUESTION_GROUP_AUDIO_URL_REGEX.test(url);
};

export const isValidQuestionGroupImageUrl = (url) => {
    if (!url) return false;
    return QUESTION_GROUP_IMAGE_URL_REGEX.test(url);
};

export const validateQuestionGroupAudio = (file) => {
    if (!file) return { valid: true };
    
    const errors = [];
    
    if (!file.type.startsWith("audio/")) {
        errors.push('Chỉ chấp nhận file audio');
    }
    
    if (!isValidQuestionGroupAudioSize(file.size)) {
        errors.push('File audio không được vượt quá 10MB');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

export const validateQuestionGroupImage = (file) => {
    if (!file) return { valid: true };
    
    const errors = [];
    
    if (!file.type.startsWith("image/")) {
        errors.push('Chỉ chấp nhận file hình ảnh');
    }
    
    if (!isValidQuestionGroupImageSize(file.size)) {
        errors.push('File hình ảnh không được vượt quá 5MB');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};
