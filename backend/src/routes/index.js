import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { resumen } from '../controllers/productos.controller.js';
import { salud } from '../controllers/salud.controller.js';
import productosRoutes from './productos.routes.js';
import catalogosRoutes from './catalogos.routes.js';
import respaldosRoutes from './respaldos.routes.js';

const router = Router();

router.get('/salud', salud);
router.get('/resumen', asyncHandler(resumen));
router.use('/productos', productosRoutes);
router.use('/', catalogosRoutes);
router.use('/respaldos', respaldosRoutes);

export default router;
