// utils/dateValidator.js

/*
 * Validates a date of birth string (YYYY-MM-DD)
 * @param {string} dobStr - The date string to validate
 * @param {number} minAge - Minimum age required (default: 13)
 * @returns {Object} { isValid: boolean, error: string|null, age: number|null }
 */
export const validateDOB = (dobStr, minAge = 13) => {
  const maxAge = 120;

  // Check if present
  if (!dobStr) {
    return { isValid: false, error: 'Date of birth is required.', age: null };
  }

  //Check format regex (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dobStr)) {
    return { isValid: false, error: 'Invalid format. Use YYYY-MM-DD.', age: null };
  }
  
  // Check if it's a valid calendar date
  const parsedDate = new Date(dobStr);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: 'Invalid date values.', age: null };
  }

    
  // Double-check real calendar dates (prevent rollover like Feb 31 -> March 3)
  const [year, month, day] = dobStr.split('-').map(Number);
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() + 1 !== month ||
    parsedDate.getUTCDate() !== day
  ) {
    return { isValid: false, error: 'Date does not exist on the calendar.', age: null };
  }

  //Age logic validation
  const today = new Date();
  
  // Calculate precise age
  let age = today.getFullYear() - parsedDate.getFullYear();
  const monthDiff = today.getMonth() - parsedDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsedDate.getDate())) {
    age--;
  }

  // Check bounds
  if (parsedDate > today) {
    return { isValid: false, error: 'Date of birth cannot be in the future.', age: null };
  }
  
  if (age < minAge) {
    return { isValid: false, error: `You must be at least ${minAge} years old.`, age: null };
  }

  if (age > maxAge) {
    return { isValid: false, error: 'Please enter a valid date of birth.', age: null };
  }

  // Success
  return { isValid: true, error: null, age };
};
