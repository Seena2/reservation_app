
//This middleware acts as a gatekeeper. If the incoming request data is invalid, it intercepts the request and
// sends back a 400 Bad Request before your controller function ever runs.
// @param Schema : the validation schema build using "joi"
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false, // Collect all errors, not just the first one
      stripUnknown: true // Automatically remove fields not defined in the schema (Security Best Practice)
    });

    if (error) {
      const errorDetails = error.details.map((detail) => detail.message);
      return res.status(400).json({ 
        success: false, 
        errors: errorDetails 
      });
    }

    // Overwrite req.body with the sanitized/cleaned value from Joi
    req.body = value;
    next();
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ success: false, errors: error.details.map(d => d.message) });
    }
    next();
  };
};