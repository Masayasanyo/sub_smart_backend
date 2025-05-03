import express from 'express';
import dotenv from 'dotenv';
import authenticateToken from '../middlewares/authMiddleware.js';
import { YoutubeTranscript } from 'youtube-transcript';
import pkg from 'he';
const { decode } = pkg;

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
		const cleanData = data.map(item => ({
			...item,
			text: decode(decode(item.text))
		}));

		return res.status(200).json({ message: "Trascript fetched successfully.", data: cleanData });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Internal server error." });
	}
});


// Translate words
router.post('/translate', authenticateToken, async (req, res) => {
	const { word } = req.body;
	const url = 'https://api-free.deepl.com/v2/translate';

	if (!word) {
		return res.status(400).json({ error: "A word id required." });
	}

	try {
		const params = new URLSearchParams();
		params.append('auth_key', process.env.DEEPL_API_KEY);
		params.append('text', word);
		params.append('source_lang', 'EN');
		params.append('target_lang', 'JA');

		const response = await fetch(url, {
			method: 'POST',
			headers: {
			  'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		const data = await response.json();
		const translatedText = data.translations[0].text;

		return res.status(200).json({ message: "Word translated successfully.", data: translatedText });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Internal server error." });
	}
});


export default router;