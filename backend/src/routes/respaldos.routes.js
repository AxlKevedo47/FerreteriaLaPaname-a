import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  crear,
  descargar,
  listar,
} from '../controllers/respaldos.controller.js';

const router = Router();

router.get('/', asyncHandler(listar));
router.post('/', asyncHandler(crear));
router.get('/:archivo/descargar', asyncHandler(descargar));

export default router;
