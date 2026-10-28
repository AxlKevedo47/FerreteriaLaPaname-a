import { existsSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { RAIZ_PROYECTO, config } from './config/env.js';
import { ErrorAplicacion, errorNoEncontrado } from './errors/ErrorAplicacion.js';
import { manejadorErrores } from './middleware/errorHandler.js';
import rutasApi from './routes/index.js';

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.origenesPermitidos.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(
          new ErrorAplicacion('El origen de la solicitud no está permitido.', {
            estado: 403,
            codigo: 'ORIGEN_NO_PERMITIDO',
          }),
        );
      },
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }),
  );

  app.use(express.json({ limit: config.cuerpoMaximo }));

  if (config.entorno === 'development') {
    app.use((req, res, next) => {
      const inicio = Date.now();
      res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - inicio} ms)`);
      });
      next();
    });
  }

  app.use('/api', rutasApi);

  app.use('/api', (req, res, next) => {
    next(errorNoEncontrado('La ruta de la API no existe.'));
  });

  // En producción el mismo servidor entrega la aplicación compilada. En
  // desarrollo se usa Vite en el puerto 5173 con proxy hacia /api.
  const directorioFrontend = path.join(RAIZ_PROYECTO, 'frontend', 'dist');
  const indexFrontend = path.join(directorioFrontend, 'index.html');

  if (existsSync(indexFrontend)) {
    app.use(express.static(directorioFrontend, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || path.extname(req.path) !== '') return next();
      res.sendFile(indexFrontend);
    });
  }

  app.use((req, res) => {
    res.status(404).json({
      error: {
        codigo: 'NO_ENCONTRADO',
        mensaje: 'La ruta solicitada no existe.',
      },
    });
  });

  app.use(manejadorErrores);

  return app;
}
