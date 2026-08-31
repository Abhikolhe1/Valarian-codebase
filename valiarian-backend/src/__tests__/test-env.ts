// Loaded by Mocha before test files or application instances are created.
// Tests must never start schedulers, call courier APIs, or send alert emails.
process.env.NODE_ENV = 'test';
process.env.BACKGROUND_JOBS_ENABLED = 'false';
process.env.SHIPPING_ALERTS_ENABLED = 'false';
