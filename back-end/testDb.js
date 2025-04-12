const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Run the test
const runTest = async () => {
  console.log('Testing MongoDB connection...');
  console.log(`Attempting to connect to: ${process.env.MONGO_URI}`);
  
  try {
    const conn = await connectDB();
    console.log('Connection successful!');
    
    // List all collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(coll => {
      console.log(` - ${coll.name}`);
    });
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (err) {
    console.error('Test failed:', err);
  }
  
  process.exit(0);
};

runTest(); 