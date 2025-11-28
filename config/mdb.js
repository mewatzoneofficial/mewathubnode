import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);

async function connectDB() {
  try {
    await client.connect();
    console.log("MongoDB Connected Successfully!");

    return client.db("mewatzoneofficial"); // change DB name if needed
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}

export default connectDB;
