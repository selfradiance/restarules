/**
 * RestaRules compliance decision engine.
 *
 * This module re-exports the SDK evaluator to maintain a single
 * implementation of the evaluation logic. The reference agent and
 * SDK share the same evaluateCompliance function.
 */

const { evaluateCompliance } = require('../sdk/evaluator');

module.exports = { evaluateCompliance };
