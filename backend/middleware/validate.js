function validateReturnRecord(req, res, next) {
  const { booking_id, return_date, device_condition } = req.body;
  const errors = [];
  if (!booking_id)       errors.push('booking_id is required');
  if (!return_date)      errors.push('return_date is required');
  if (!device_condition) errors.push('device_condition is required');
  const valid = ['Good','Minor Scratches','Major Damage','Non-Functional'];
  if (device_condition && !valid.includes(device_condition))
    errors.push(`device_condition must be one of: ${valid.join(', ')}`);
  if (errors.length > 0)
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  next();
}
module.exports = { validateReturnRecord };