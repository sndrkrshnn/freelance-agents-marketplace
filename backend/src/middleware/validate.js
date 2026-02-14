const { ZodError } = require('zod');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate based on schema type (body, query, params)
      if (req.body && schema.body) {
        schema.body.parse(req.body);
      }
      if (req.query && schema.query) {
        schema.query.parse(req.query);
      }
      if (req.params && schema.params) {
        schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }
      next(error);
    }
  };
};

module.exports = validate;
