import mongoose from 'mongoose';
import Image from '../models/Image.js';

// @route   POST /api/examiner/images   (examiner only)
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No image received');
    }

    const image = await Image.create({
      data: req.file.buffer,
      contentType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.id,
    });

    res.status(201).json({ imageId: image._id });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/images/:id   (public, the id cannot be guessed)
export const getImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404);
      throw new Error('Image not found');
    }

    const image = await Image.findById(id);
    if (!image) {
      res.status(404);
      throw new Error('Image not found');
    }

    res.set('Content-Type', image.contentType);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(image.data);
  } catch (error) {
    next(error);
  }
};