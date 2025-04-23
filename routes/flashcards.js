import express from 'express';
import authenticateToken from '../middlewares/authMiddleware.js';
import { pool } from "../index.js";


const router = express.Router();


// Send all cards
router.get("/", authenticateToken, async (req, res) => {
	const accountId = req.user.id;
  
	try {
	  const result = await pool.query(
		"SELECT * FROM flashcards WHERE account_id = $1;",
		[accountId],
	  );
	  return res.status(200).json({ message: "Flashcards retrieved successfully.", data: result.rows });
	} catch (error) {
	  console.error(error);
	  return res.status(500).json({ error: "Internal server error." });
	}
});


// Send card data
router.post("/", authenticateToken, async (req, res) => {
	const accountId = req.user.id;
	const { card_id } = req.body;
  
	try {
		const flashcardResult = await pool.query(
			"SELECT * FROM flashcards WHERE account_id = $1 and id = $2;",
			[accountId, card_id],
		);

		const cardsResult = await pool.query(
			"SELECT * FROM words WHERE flashcards_id = $1;",
			[card_id],
		);

		return res.status(200).json({ 
			message: "Flashcard retrieved successfully.", 
			card_info: flashcardResult.rows, 
			cards: cardsResult.rows 
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Internal server error." });
	}
});


// Upload words to a flashcard
router.post('/add', authenticateToken, async (req, res) => {
	const { card_id, wordsList } = req.body;

	if (!card_id) {
		return res.status(400).json({ error: "Card id is required." });
	}
	if (!wordsList || wordsList.length < 1) {
		return res.status(400).json({ error: "A list of words is required." });
	}

	try {
		await Promise.all(wordsList.map(async (w) => {
			await pool.query(
				`INSERT INTO 
					words (flashcards_id, en, ja) 
				VALUES 
					($1, $2, $3)`,
				[card_id, w.en, w.ja]
			);
		}));
		return res.status(201).json({ message: "Words uploaded successfully." });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Internal server error." });
	}
});


// Create a new card
router.post('/create', authenticateToken, async (req, res) => {
	const accountId = req.user.id;
	const { title } = req.body;

	if (!title) {
		return res.status(400).json({ error: "Card title is required." });
	}

	try {
        const result = await pool.query(
            `INSERT INTO 
                flashcards (account_id, title) 
            VALUES 
                ($1, $2) 
            RETURNING
                *`,
            [accountId, title]
        );
        return res.status(201).json({ message: "Card created successfully.", data: result.rows});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error." });
    }
});


// Update the card
router.post('/update', authenticateToken, async (req, res) => {
	const accountId = req.user.id;
	const { title, card_id } = req.body;
	const words = req.body.wordsList || [];

	if (!title || !card_id) {
		return res.status(400).json({ error: "Card title and id are required." });
	}

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE 
                flashcards 
            SET 
                title = $1 
            WHERE 
                id = $2 and account_id = $3
            `,
            [title, card_id, accountId]
        );

        await client.query(
            `DELETE FROM 
                words 
            WHERE 
                flashcards_id = $1 
            `,
            [card_id]
        );
        for (const w of words) {
            await client.query(
                `INSERT INTO 
                    words (flashcards_id, en, ja) 
                VALUES 
                    ($1, $2, $3)`,
                [card_id, w.en, w.ja]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({ message: "Cards editted successfully."});
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ error: "Internal server error." });
    } finally {
        client.release();
    }
});


// Change flashcard progress
router.post('/result', authenticateToken, async (req, res) => {
	const again = req.body.again || [];
	const ok = req.body.ok || [];

	const client = await pool.connect();

    try {
        await client.query('BEGIN');

		for (const a of again) {
			await client.query(
				`UPDATE 
					words 
				SET 
					progress = false 
				WHERE 
					id = $1 
				`,
				[a.id]
			);
		}

        for (const o of ok) {
			await client.query(
				`UPDATE 
					words 
				SET 
					progress = true 
				WHERE 
					id = $1 
				`,
				[o.id]
			);
		}

        await client.query('COMMIT');

        return res.status(201).json({ message: "Cards changed successfully."});
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ error: "Internal server error." });
    } finally {
        client.release();
    }
});


export default router;