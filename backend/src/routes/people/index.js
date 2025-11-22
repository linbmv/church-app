import express from "express";
import { peopleModel } from "../../schemas/people.schema.js";
import mongoose from "mongoose";
import cloudinary from "../../../utils/cloudinaryConfig.js";
import multer from "multer";

const router = express.Router();

// Multer configuration for handling file uploads
// We'll store the file in memory temporarily
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/", async (req, res) => {
  try {
    const people = await peopleModel.find({});
    res.status(200).json(people);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

router.post("/", async (req, res) => {
  try {
    const person = new peopleModel(req.body);
    await person.save();
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPerson = await peopleModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedPerson) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.status(200).json(updatedPerson);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to update person" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPerson = await peopleModel.findByIdAndDelete(id);
    if (!deletedPerson) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.status(200).json({ message: "Person deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to delete person" });
  }
});

router.post(
  "/:id/upload-profile-pic",
  upload.single("ProfilePic"),
  async (req, res) => {
    try {
      const personId = req.params.id;
      const file = req.file; // This is the file buffer from multer

      if (!file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      // Convert buffer to base64 string for Cloudinary upload
      const b64 = Buffer.from(file.buffer).toString("base64");
      let dataURI = "data:" + file.mimetype + ";base64," + b64;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "Profile-Picture", // Optional: creates a folder in Cloudinary
        public_id: `profile_pic_${personId}`, // Optional: set a public ID for easy retrieval/management
        overwrite: true, // Overwrite if a public_id already exists
        resource_type: "image", // Explicitly state resource type
      });

      const updatedPerson = await peopleModel.findByIdAndUpdate(
        personId,
        { ProfilePic: result.secure_url }, // Store the secure URL provided by Cloudinary
        { new: true, runValidators: true } // Return the updated document and run schema validators
      );

      if (!updatedPerson) {
        return res
          .status(404)
          .json({ message: "Person not found after upload." });
      }

      res.status(200).json({
        message: "Profile picture uploaded successfully.",
        profilePicUrl: result.secure_url, // Send back the URL to the frontend
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({
        message: "Server error during profile picture upload.",
        error: error.message,
      });
    }
  }
);

(async () => {
  try {
    const people = await peopleModel.find({});
    console.log("Connected to DB:", mongoose.connection.name);
  } catch (error) {
    console.error("Error fetching people:", error);
  }
})();

export default router;
