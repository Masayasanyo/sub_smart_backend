import express from 'express';
import dotenv from 'dotenv';
import authenticateToken from '../middlewares/authMiddleware.js';
import { YoutubeTranscript } from 'youtube-transcript';

dotenv.config();

const router = express.Router();

// Fetch transcript
router.post('/', authenticateToken, async (req, res) => {
	const { videoId } = req.body;

	if (!videoId) {
		return res.status(400).json({ error: "Video id required." });
	}

	try {
		const data = await YoutubeTranscript.fetchTranscript(videoId);
		return res.status(200).json({ message: "Fetch trascript successful.", data: data });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Internal server error." });
	}
});


export default router;