function createValidator(schema, options = {}) {
  const allowUnknown = options.allowUnknown !== undefined ? options.allowUnknown : false;

  return function validate(req, res, next) {
    const locations = ['query', 'body', 'params', 'headers'];
    const errors = [];

    locations.forEach((location) => {
      if (schema[location]) {
        const { error, value } = schema[location].validate(req[location], {
          allowUnknown,
          abortEarly: false,
        });

        if (error) {
          error.details.forEach((detail) => {
            errors.push({
              field: detail.path,
              location,
              messages: [detail.message],
              types: [detail.type],
            });
          });
        } else if (value !== undefined) {
          req[location] = value;
        }
      }
    });

    if (errors.length > 0) {
      const err = new Error('Validation Failed');
      err.status = 400;
      err.statusText = 'Bad Request';
      err.errors = errors;
      return next(err);
    }

    return next();
  };
}

module.exports = createValidator;
