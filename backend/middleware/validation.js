const validator = require('validator');
const xss = require('xss');

const sanitizeInput = (req, res, next) => {
  for (let key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = xss(req.body[key]);
      req.body[key] = validator.escape(req.body[key]);
    }
  }
  next();
};