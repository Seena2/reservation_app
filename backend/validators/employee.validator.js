import BaseJoi from 'joi';
import { JoiDate } from '@joi/date'; 

// import { validateDOB } from './dateValidator.js';
// import { body, validationResult } from "express-validator";

// Extend Joi with the date plugin
const Joi = BaseJoi.extend(JoiDate); 

const minAgeDate = new Date(new Date().setFullYear(new Date().getFullYear() - 18));
const maxAgeDate = new Date(new Date().setFullYear(new Date().getFullYear() - 120));

/*
 * Validates the complete profile of an employee
 * @param {Object} data - The employee data object from req.body
 * @returns {Object} { isValid: boolean, errors: Object|null }
 */
// custom validator, later replaced with joi
/*
export const validateEmployeeData = (data) => {
  const errors = {};
  const {
    userId,
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    phone,
    address,
    department,
    position,
    salary,
    dateOfHired,
    status,
    manager,
  } = data || {};

  // Required string fields + Min-length 3 for names
  const fields = {
    userId,
    firstName,
    middleName,
    lastName,
    address,
    department,
    position,
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

  // 5. Salary Validation (Must be a positive number)
  const salaryNum = Number(salary);
  if (salary === undefined || salary === null || salary === "") {
    errors.salary = "Salary is required.";
  } else if (isNaN(salaryNum) || salaryNum <= 0) {
    errors.salary = "Salary must be a positive number.";
  }

  // 6. Date of Hire Validation
  if (!dateOfHired) {
    errors.dateOfHired = "Date of hire is required.";
  } else {
    const hireDate = new Date(dateOfHired);
    if (isNaN(hireDate.getTime())) {
      errors.dateOfHired = "Invalid date of hire.";
    } else if (dobCheck.isValid && dateOfBirth) {
      // Logic check: Cannot be hired before they were born
      const dobDate = new Date(dateOfBirth);
      if (hireDate <= dobDate) {
        errors.dateOfHired =
          "Date of hire cannot be before or equal to date of birth.";
      }
    }
  }

  //   return the captured error as an object
  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : null,
  };
};
*/
 ///
 
 
 
 // Custom validation rule for MongoDB Object ID structure
 const objectIdMessage = 'Invalid database ID format';
 export const mongoIdSchema = Joi.object({
   id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
     'string.pattern.base': objectIdMessage
   })
 });
 

 // Reusable schema definitions
const employeeFields = {
  userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({ 'string.pattern.base': 'Invalid ObjectId format for userId' }),
  firstName: Joi.string().min(3).max(50).trim().lowercase(),
  middleName: Joi.string().max(50).trim().lowercase().allow('', null),
  lastName: Joi.string().min(3).max(50).trim().lowercase(),
  dateOfBirth: Joi.date().format('YYYY-MM-DD')
  .utc()                // Keeps timezone evaluation consistent
  .min(maxAgeDate) // Cannot be born more than 120 years ago
  .max(minAgeDate) // Must be born at least 18 years ago
  .less('now')
    .messages({
      'date.max': '"dateOfBirth" must be at least 18 years old',
      'date.min': '"dateOfBirth" must be less than 120 years old',
      'date.format': '"dateOfBirth" must be in YYYY-MM-DD format'
    }),
  
  email: Joi.string().email(),
  phone: Joi.string().regex(/^\+?[1-9]\d{1,14}$/).messages({ 'string.pattern.base': 'Invalid E.164 phone format' }),
  address: Joi.object({
    street: Joi.string().trim().min(3).max(100) .required(),
    city: Joi.string().trim().min(2).max(50) .required(),
    state: Joi.string().trim().min(2).max(50),
    zipCode: Joi.string() .trim().pattern(/^\d{5}(-\d{4})?$/) // Validates 12345 or 12345-6789
    .messages({  'string.pattern.base': 'Zip code must be a valid 5-digit or 9-digit US format.' }),
    country: Joi.string().trim() //.default('US') // Automatically applies a default if missing
  }),
  department: Joi.string().min(2).max(100).trim(),
  position: Joi.string().min(2).max(100).trim(),
  salary: Joi.number().min(0),
  dateHired: Joi.date().iso().less('now').messages({ 'any.required': 'dateHired is required.'}),
  status: Joi.string().valid('active', 'inactive', 'on Leave','suspended', 'terminated').default('active'),
  manager: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).messages({ 'string.pattern.base': 'Invalid ObjectId format for manager' }),
};
 
// Create (POST) Validation - All fields required except optional ones
export const createEmployeeSchema = Joi.object({
  ...employeeFields,
  userId: employeeFields.userId.required(),
  firstName: employeeFields.firstName.required(),
  lastName: employeeFields.lastName.required(),
  dateOfBirth: employeeFields.dateOfBirth.required(),
  phone: employeeFields.phone.required(),
  address: employeeFields.address.required(),
  department: employeeFields.department.required(),
  position: employeeFields.position.required(),
  salary: employeeFields.salary.required(),
});

// Full/Partial Update (PUT/PATCH) Validation - All fields optional
export const updateEmployeeSchema = Joi.object(employeeFields).min(1);
 
 
    