
import { ObjectId } from "mongodb";
// import { client } from "../config/db.js";



const registerUser = async (req, res, next) => {

    const { email, password, name } = req.body;

    if ([email, password, name].some(f => f.trim() === "")) {
        return res.status(404).json({
            succcess: false,
            message: 'add all fields'
        })
    }



    let db = req.db;

    const session = client.startSession()
    session.startTransaction()
    try {
        let dirCollection = db.collection("directories")
        let userCollection = db.collection("users")
        const user = await userCollection.findOne({ email })

        if (user) {
            return res.status(409).json({
                message: "user already exists"
            })
        }

        const userId = new ObjectId()
        const rootDirId = new ObjectId()

        await dirCollection.insertOne({
            _id:rootDirId,
            parentDirId: null,
            name: `root-${email}`,
            userId
        }, { session })

        await userCollection.insertOne({
            _id: userId,
            name,
            email,
            password,
            rootDirId
        }, { session })

        await session.commitTransaction()

        return res.status(201).json({
            sucess: true,
            message: "succesfully created"
        })
    } catch (err) {
          await session.abortTransaction()
        console.log(err)
        if(err.code === 121) {
            return res.status(400).json({
                error:"invalid fields"
            })
        } else {
            next(err)
        }
    
    } finally {
        await session.endSession()
    }
}



const login =  async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(404).json({ message: "fill all fields" })
    }

    let db = req.db;

    let userCollection = db.collection("users")

    try {

        const user = await userCollection.findOne({ email, password })

        if (!user) {
            return res.status(404).json({ message: "invalid credientials" })
        }

        res.cookie("uid", user._id.toString(), {
            httpOnly: true,
            maxAge: 60 * 1000 * 60 * 24 * 7
        })

        return res.status(201).json({
            message: 'logged in'
        })
    } catch (err) {
        err.message = "login unsuucessfull"
        next(err)
    }

}


const getNameAndEmail =  (req, res) => {
    return res.status(200).json({
        name: req.user.name,
        email: req.user.email
    })
}


const logout = (req, res) => {
  res.clearCookie("uid", {
    httpOnly: true,
    maxAge: 60 * 1000 * 60 * 24 * 7, // match login options
    // add secure/sameSite if you used them in login
  });
  return res.sendStatus(204);
}



export {
    registerUser,
    login,
    getNameAndEmail,
    logout

}