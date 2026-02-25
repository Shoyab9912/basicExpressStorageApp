import mongoose from "mongoose"
import Directory from "../models/directory.model.js";
import User from "../models/user.model.js"
import crypto from "node:crypto";




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

        const hashedPassword = crypto.createHash('sha256').update(password).digest("hex")
        console.log(hashedPassword)

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
            password: hashedPassword,
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
            console.log(err)
            next(err)
        }

    } finally {
        await session.endSession()
    }
}



const login = async (req, res, next) => {
    const { email, password } = req.body;

    // console.log(req.body)
    if (!email || !password) {
        return res.status(404).json({ message: "fill all fields" })
    }

    try {

        const user = await User.findOne({ email })

        if (!user) {
            return res.status(404).json({ message: "invalid credientials" })
        }


        const hashedPassword = crypto.createHash('sha256').update(password).digest("hex")
   
         if(user.password !== hashedPassword) {
            return res.status(404).json({
                errror:"invalid credientials"
            })
         }



        const cookieData = JSON.stringify({
            id: user._id.toString(),
            expiry: Math.round(Date.now() / 1000 * 60)
        })


        res.cookie("token", cookieData, {
            signed: true,
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