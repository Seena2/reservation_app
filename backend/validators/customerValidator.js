import { validateDOB } from './dateValidator.js';
// import { body, validationResult } from "express-validator";

/*
 * Validates the complete profile of an customer
 * @param {Object} data - The employee data object from req.body
 * @returns {Object} { isValid: boolean, errors: Object|null }
 */
export const validateCustomerData = (data) => {
  const errors = {};
  const {
    userId,
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    phone,
    address,
    status,
  } = data || {};

  // Required string fields + Min-length 3 for names
  const fields = {
    userId,
    firstName,
    middleName,
    lastName,
    address,
    status,
    
  };
  for (const [key, value] of Object.entries(fields)) {
    const cleanVal = String(value ?? "").trim();
    const label = key.replace(/([A-Z])/g, " $1").toLowerCase();
    if (!cleanVal) {
      errors[key] =
        `${label.charAt(0).toUpperCase() + label.slice(1)} is required.`;
    } else if (
      ["firstName", "middleName", "lastName"].includes(key) &&
      cleanVal.length < 3
    ) {
      errors[key] =
        `${label.charAt(0).toUpperCase() + label.slice(1)} must be at least 3 characters long.`;
    }
  }

  // Compose and reuse our custom Date of Birth validation utility function
  const dobCheck = validateDOB(dateOfBirth, 18); // Setting minimum age for employees to 18
  if (!dobCheck.isValid) {
    errors.dateOfBirth = dobCheck.error;
  }
 

  // 4. Phone Validation (Basic international / local structure check)
  const phoneRegex = /^\+?[1-9]\d{1,14}$|^[0-9]{10,12}$/;
  if (!phone || !Array.isArray(phone) || !phone.length) {
    errors.phone = "At least one phone number is required.";
  } else {
    const invalidPhones = phone.filter(
      (p) => !phoneRegex.test(String(p ?? "").replace(/[\s-]/g, "")),
    );
    if (invalidPhones.length > 0) {
      errors.phone = "One or more phone numbers have an invalid format.";
    }
  }


  //   return the captured error as an object
  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : null,
  };
};

 
    