/**
 * @swagger
 * /api/v1/agent/logs:
 *   get:
 *     summary: Command execution log of the AI agent
 *     description: |
 *       One entry per command sent to the agent (chat, voice or WhatsApp): the command, the
 *       outcome (success, failed, clarification), latency, token usage and estimated cost.
 *       Admins see every command; other users see their own.
 *     tags: [Agent]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: pagination
 *         schema: { type: string, example: "true" }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, success, failed, clarification] }
 *       - in: query
 *         name: search
 *         description: Matches the command text
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated agent logs
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/agent/logs/summary:
 *   get:
 *     summary: Totals for the agent log (counts per outcome, average latency, tokens, cost)
 *     tags: [Agent]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, success, failed, clarification] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Summary
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/agent/logs/{requestId}/client-latency:
 *   patch:
 *     summary: Report the end-to-end latency measured in the browser
 *     description: Time from the browser sending the command to receiving the reply.
 *     tags: [Agent]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientLatencyMs]
 *             properties:
 *               clientLatencyMs: { type: integer, example: 2300 }
 *     responses:
 *       200:
 *         description: Saved
 *       404:
 *         description: No log with this requestId for the current user
 */
