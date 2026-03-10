import mongoose from 'mongoose'



async function connect() {
    try {
     const connectionDB = await mongoose.connect(process.env.MONGO_URI)
    console.log("connection successfull",connectionDB.connection.host)
    } catch(err) {
        console.error("connection failed____------",err.message)
        process.exit(1)
    }
}

process.on("SIGINT",async ()=> {
    console.log("connection closed")
    await mongoose.disconnect()
    process.exit(0)
})

export default connect;