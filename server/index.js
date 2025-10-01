import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import session from 'express-session';

import authRoutes from './routes/auth.js';


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


// Example route
app.get('/', (req, res) => {
  res.json({ message: 'This is an example route' });
});


app.use('/auth', authRoutes);



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true,})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));






const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});