import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  crearCategoria,
  crearUnidad,
  listarCategorias,
  listarUnidades,
} from '../controllers/catalogos.controller.js';

const router = Router();

router.get('/categorias', asyncHandler(listarCategorias));
router.post('/categorias', asyncHandler(crearCategoria));
router.get('/unidades', asyncHandler(listarUnidades));
router.post('/unidades', asyncHandler(crearUnidad));

export default router;
