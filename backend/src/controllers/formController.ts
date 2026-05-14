import { Request, Response, RequestHandler } from 'express';
import { RedisService } from 'ondc-automation-cache-lib';
import logger from '@ondc/automation-logger';

/**
 * Check if form callback has been received
 * Polled by the frontend after user submits form in popup
 * GET /form/check-completion?transaction_id=X
 */
export const checkFormCompletion: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.query;

    logger.info('Form completion check', { transaction_id });

    if (!transaction_id) {
      res.status(400).json({
        error: 'transaction_id is required',
        completed: false
      });
      return;
    }

    const completionKey = `form_completed:${transaction_id}`;
    const completionData = await RedisService.getKey(completionKey);

    if (completionData) {
      const data = JSON.parse(completionData);
      logger.info('Form completion check: COMPLETED', {
        transaction_id,
        timestamp: data.timestamp
      });

      res.json({
        completed: true,
        success: data.success,
        message: data.message,
        timestamp: data.timestamp
      });
      return;
    }

    logger.debug('Form completion check: PENDING', { transaction_id });
    res.json({ completed: false });

  } catch (error: any) {
    logger.error('Error checking form completion', error);
    res.status(500).json({
      error: 'Failed to check completion',
      message: error.message,
      completed: false
    });
  }
};
