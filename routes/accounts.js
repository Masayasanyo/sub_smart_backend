import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import authenticateToken from '../middlewares/authMiddleware.js';
import { pool } from "../index.js";

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Check session
router.get('/session', authenticateToken, async (req, res) => {
	return res.status(200).json({ message: "User logged in", isLoggedIn: true });
});


// User data
router.get('/', authenticateToken, async (req, res) => {
	return res.status(200).json({ message: "User data retrieved successfully.", data: req.user });
});


// Sign up
router.post('/signup', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: "All fields are required." });
	}

	try {
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);
		const result = await pool.query(
			`INSERT INTO 
			accounts (email, password) 
			VALUES 
			($1, $2) 
			RETURNING 
			id, email, created_at`,
			[email, hashedPassword]
		);
		return res.status(201).json({ message: "Registration successful.", data: result.rows[0] });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Internal server error." });
	}
});


// Log in
router.post('/login', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: "All fields are required." });
	}

	try {
		const result = await pool.query(
			`SELECT 
			* 
			FROM 
			accounts 
			WHERE 
			email = $1`, 
			[email]
		);
		if (result.rows.length === 0) {
			return res.status(401).json({ error: "Email or password are wrong." });
		}
		const user = result.rows[0];
		const passwordMatch = await bcrypt.compare(password, user.password);
		if (!passwordMatch) {
			return res.status(401).json({ error: "Email or password are wrong." });
		}

		const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
			expiresIn: '1h',
		});

		return res.status(200).json({ message: "Login successful", token: token });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Internal server error." });
	}
});


// update account data
router.post('/update', authenticateToken, async (req, res) => {
	const { email, password } = req.body;
	const accountId = req.user.id;

	if (!email) {
		return res.status(400).json({ error: "All fields are required." });
	}

	if (password !== '') {
		try {
			const saltRounds = 10;
			const hashedPassword = await bcrypt.hash(password, saltRounds);
			await pool.query(
			`UPDATE  
				accounts 
			SET 
				email = $1,
				password = $2 
			WHERE 
				id = $3 
			`,
			[email, hashedPassword, accountId]
			);
			return res.status(201).json({ message: "Account updated successfully." });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: "Internal server error." });
		}
	} else if (password === '') {
		try {
			await pool.query(
			`UPDATE  
				accounts 
			SET 
				email = $1 
			WHERE 
				id = $2 
			`,
			[email, accountId]
			);
			return res.status(201).json({ message: "Account updated successfully." });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: "Internal server error." });
		}
	}
});


// Delete accounts
router.delete('/', authenticateToken, async (req, res) => {
	const accountId = req.user.id;

	try {
		await pool.query(
			`DELETE FROM accounts WHERE id = $1;`,
			[accountId]
		);
		return res.status(201).json({ message: "Account deleted successful." });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Internal server error." });
	}
});

export default router;