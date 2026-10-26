import BaseJoi from 'joi';
import { JoiDate } from '@joi/date'; 

// import { validateDOB } from './dateValidator.js';
// import { body, validationResult } from "express-validator";

// Extend Joi with the date plugin
const Joi = BaseJoi.extend(JoiDate); 

const minAgeDate = new Date(new Date().setFullYear(new Date().getFullYear() - 18));
const maxAgeDate = new Date(new Date().setFullYear(new Date().getFullYear() - 120));

 
// Custom validation rule for MongoDB Object ID structure
 const objectIdMessage = 'Invalid database ID format';
 export const mongoIdSchema = Joi.object({
   id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
     'string.pattern.base': objectIdMessage
   })
 });
 

 // Reusable schema definitions
const customerFields = {
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
  status: Joi.string().valid('active', 'inactive', 'suspended').default('active').messages({ 'any.only': 'status must be either active, inactive, or suspended'}),
};
 
// Create (POST) Validation - All fields required except optional ones
export const createCustomerSchema = Joi.object({
  ...customerFields,
  userId: customerFields.userId.required(),
  firstName: customerFields.firstName.required(),
  lastName: customerFields.lastName.required(),
  dateOfBirth: customerFields.dateOfBirth.required(),
  email: customerFields.phone.required(),
  phone: customerFields.phone.required(),
  address: customerFields.address.required(),
});

// Full/Partial Update (PUT/PATCH) Validation - All fields optional
export const updateCustomerSchema = Joi.object(customerFields).min(1);
 