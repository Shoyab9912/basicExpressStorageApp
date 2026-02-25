import mongoose from 'mongoose'



async function connect() {
    try {
     const connectionDB = await mongoose.connect("mongodb://127.0.0.1:27017/StorageApp")
    console.log("connection successfull",connectionDB.connection.host)
    } catch(err) {
        console.error("connection failed____------",err.message)
        process.exit(1)
    }
}

process.on("SIGINT",()=> {
    console.log("connection closed")
    mongoose.disconnect()
    process.exit(0)
})

export default connect;