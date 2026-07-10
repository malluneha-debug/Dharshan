const Temple = require('../models/Temple');
const { handleImageDownload } = require('../utils/imageHandler');

// @desc    Get all temples
// @route   GET /api/temples
// @access  Public
const getTemples = async (req, res) => {
  try {
    const temples = await Temple.find({});
    res.json(temples);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get temple by ID
// @route   GET /api/temples/:id
// @access  Public
const getTempleById = async (req, res) => {
  try {
    const temple = await Temple.findById(req.params.id);
    if (temple) {
      res.json(temple);
    } else {
      res.status(404).json({ message: 'Temple not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a temple
// @route   POST /api/temples
// @access  Private/Admin
const createTemple = async (req, res) => {
  const { templeName, location, darshanStartTime, darshanEndTime, description, image, latitude, longitude } = req.body;

  try {
    const localImage = await handleImageDownload(templeName, image);
    const temple = new Temple({
      templeName,
      location,
      darshanStartTime,
      darshanEndTime,
      description,
      image: localImage,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
    });

    const createdTemple = await temple.save();
    res.status(201).json(createdTemple);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a temple
// @route   PUT /api/temples/:id
// @access  Private/Admin
const updateTemple = async (req, res) => {
  const { templeName, location, darshanStartTime, darshanEndTime, description, image, latitude, longitude } = req.body;

  try {
    const temple = await Temple.findById(req.params.id);

    if (temple) {
      const localImage = image ? await handleImageDownload(templeName || temple.templeName, image) : undefined;

      temple.templeName = templeName || temple.templeName;
      temple.location = location || temple.location;
      temple.darshanStartTime = darshanStartTime || temple.darshanStartTime;
      temple.darshanEndTime = darshanEndTime || temple.darshanEndTime;
      temple.description = description || temple.description;
      if (latitude !== undefined) temple.latitude = Number(latitude);
      if (longitude !== undefined) temple.longitude = Number(longitude);
      if (localImage !== undefined) {
        temple.image = localImage;
      }

      const updatedTemple = await temple.save();
      res.json(updatedTemple);
    } else {
      res.status(404).json({ message: 'Temple not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a temple
// @route   DELETE /api/temples/:id
// @access  Private/Admin
const deleteTemple = async (req, res) => {
  try {
    const temple = await Temple.findById(req.params.id);

    if (temple) {
      await temple.deleteOne();
      res.json({ message: 'Temple removed' });
    } else {
      res.status(404).json({ message: 'Temple not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTemples,
  getTempleById,
  createTemple,
  updateTemple,
  deleteTemple,
};
