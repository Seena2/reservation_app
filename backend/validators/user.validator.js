import Joi from 'joi';


// Custom validation rule for MongoDB Object ID structure
const objectIdMessage = 'Invalid database ID format';
export const mongoIdSchema = Joi.object({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': objectIdMessage
  })
});

// Schema for creating a new user (POST)
export const createUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  
  // Validates an array containing one or more allowed roles
  roles: Joi.array()
    .items(Joi.string().valid('customer', 'admin', 'editor', 'moderator'))
    .min(1) // Ensures the user has at least one role
    .unique() // Prevents duplicate roles in the array (e.g., ['user', 'user'])
    .default('customer'),

  status: Joi.string()
    .valid('active', 'inactive', 'suspended', 'pending')
    .insensitive()
    .default('active') // Optional: sets a default if missing
});

// Schema for updating an existing user (PUT/PATCH)
export const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).lowercase().required(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(8).optional(),
  // Validates an array containing one or more allowed roles
  roles: Joi.array()
    .items(Joi.string().valid('customer','employee', 'admin'))
    .min(1) // Ensures the user has at least one role
    .unique() // Prevents duplicate roles in the array (e.g., ['user', 'user'])
    .default('customer'),

  status: Joi.string()
    .valid('active', 'inactive', 'suspended', 'pending')
    .insensitive()
    .default('active') // Optional: sets a default if missing
}).min(1); // Ensures the user passes AT LEAST one field to update


