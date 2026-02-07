import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://127.0.0.1:27017/StoragApp")


async function connect() {
    try {
     await client.connect()
     const db = client.db();
     return db
    } catch(err) {
        console.error("connection failed____------")
    }
}

process.on("SIGINT",()=> {
    client.close();
    console.log("connection closed")
    process.exit(1)
})

export default connect;