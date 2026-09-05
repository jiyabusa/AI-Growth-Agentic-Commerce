/**
 * Vercel Serverless Function Entrypoint
 * Directs all /api/* traffic to the Express application instance.
 */
const app = require('../server/server');

module.exports = app;
