import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import accountsRoutes from "./routes/accounts.js";
import transcriptRoutes from "./routes/transcript.js";
import flashcardsRoutes from "./routes/flashcards.js";

dotenv.config();

const app = express();
app.use(express.json()); 
app.use(cors());
app.use("/accounts", accountsRoutes);
app.use("/transcript", transcriptRoutes);
app.use("/flashcards", flashcardsRoutes);

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
});

export { pool };

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})
