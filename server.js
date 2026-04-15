import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import mongoose from "mongoose";
import { createClient } from "redis";
import amqp from "amqplib";

const PORT = process.env.PORT || 4003;

/* MongoDB Connection */
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Failed:", err);
    process.exit(1);
  }
};

/* Redis Connection */
const connectRedis = async () => {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (err) => console.error("Redis Error:", err));
  await client.connect();
  console.log("Redis Connected");
};

/* RabbitMQ Connection with Retry Logic */
const connectRabbitMQ = async (retries = 10, delay = 5000) => {
  while (retries) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      const channel = await connection.createChannel();
      await channel.assertQueue("courseQueue");
      console.log("RabbitMQ Connected");
      return;
    } catch (err) {
      console.error(
        `RabbitMQ not ready. Retrying in ${delay / 1000}s... (${retries} retries left)`
      );
      retries -= 1;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  console.error("RabbitMQ Connection Failed after multiple retries.");
};

/* Start Server */
const startServer = async () => {
  try {
    await connectMongoDB();
    await connectRedis();
    await connectRabbitMQ();

    app.listen(PORT, () => {
      console.log(`Course Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
};

startServer();
