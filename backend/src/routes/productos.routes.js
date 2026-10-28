import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  cambiarEstado,
  crear,
  editar,
  listar,
  obtener,
} from '../controllers/productos.controller.js';

const router = Router();

router.get('/', asyncHandler(listar));
router.post('/', asyncHandler(crear));
router.get('/:id', asyncHandler(obtener));
router.put('/:id', asyncHandler(editar));
router.patch('/:id/estado', asyncHandler(cambiarEstado));

export default router;
