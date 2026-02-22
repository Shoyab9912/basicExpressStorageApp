import mongoose from "mongoose"
import { Buffer } from "buffer"
// import { client } from "../config/db.js";
import Directory from "../models/directory.model.js";
import User from "../models/user.model.js"
import crypto from "node:crypto"
const registerUser = async (req, res, next) => {

    const { email, password, name } = req.body;

    if ([email, password, name].some(f => f.trim() === "")) {
        return res.status(404).json({
            succcess: false,
            message: 'fill all fields'
        })
    }




    const session = await mongoose.startSession()
    session.startTransaction()


    try {
        const user = await User.findOne({ email })

        if (user) {
            return res.status(409).json({
                message: "user already exists"
            })
        }

        const userId = new mongoose.Types.ObjectId()
        const rootDirId = new mongoose.Types.ObjectId()

        await Directory.insertOne({
            _id: rootDirId,
            parentDirId: null,
            name: `root-${email}`,
            userId
        }, { session })

        await User.insertOne({
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
        if (err.code === 121) {
            return res.status(400).json({
                error: "invalid fields"
            })
        } else {
            next(err)
        }

    } finally {
        await session.endSession()
    }
}

const secretKey = ""

const login = async (req, res, next) => {
    const { email, password } = req.body;

    // console.log(req.body)
    if (!email || !password) {
        return res.status(404).json({ message: "fill all fields" })
    }

    try {

        const user = await User.findOne({ email, password })

        if (!user) {
            return res.status(404).json({ message: "invalid credientials" })
        }



        const cookieData = JSON.stringify({
            id: user._id.toString(),
            expiry: Math.round(Date.now() / 1000 + 50)
        })

        const signature =  crypto.createHash("sha256").update(secretKey).update(cookieData).digest("base64url")

         const signedCookie =`${Buffer.from(cookieData).toString("base64url")}.${signature}` 

        res.cookie("token", signedCookie, {
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


const getNameAndEmail = (req, res) => {
    return res.status(200).json({
        name: req.user.name,
        email: req.user.email
    })
}


const logout = (req, res) => {
    res.clearCookie("token", {
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