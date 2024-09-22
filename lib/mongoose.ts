import mongoose from 'mongoose'

let isConnected = false; // track the connection

export const connectToDB = async () => {
    mongoose.set('strictQuery',true)

    if(!process.env.MONGODB_URL) return console.log("MONGODB_URL NOT FOUND")
    if(isConnected) return console.log("MongoDB is already connected")

    try {
        await mongoose.connect(process.env.MONGODB_URL)
        isConnected = true
        console.log("MongoDB connected");
    } catch (error) {
        console.log(error);
    }
}