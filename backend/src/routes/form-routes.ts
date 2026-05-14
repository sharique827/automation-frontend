import { Router } from 'express';
import { checkFormCompletion } from '../controllers/formController';

const router = Router();

/**
 * Check form completion endpoint
 * Polled by frontend to check if form callback has been received from api-service
 * GET /form/check-completion?transaction_id=X
 */
router.get('/form/check-completion', checkFormCompletion);

export default router;
