import express from 'express';
import { getImage } from '../controllers/imageController.js';

const router = express.Router();

router.get('/:id', getImage);

export default router;