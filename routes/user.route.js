import express from "express";

import checkAuth from "../middlewares/auth.js"

const router = express.Router();

router.post('/register', async (req, res, next) => {

    const { email, password, name } = req.body;

    if ([email, password, name].some(f => f.trim() === "")) {
        return res.status(404).json({
            succcess: false,
            message: 'add all fields'
        })
    }



    let db = req.db;
    try {
        let dirCollection = db.collection("directories")
        let userCollection = db.collection("users")
        const user = await userCollection.findOne({ email })

        if (user) {
            return res.status(409).json({
                message: "user already exists"
            })
        }

        const directoryData = await dirCollection.insertOne({
            parentDirId: null,
            name: `root-${email}`
        })

        const userData = await userCollection.insertOne({
            name,
            email,
            password,
            rootDirId: directoryData.insertedId
        })

        await dirCollection.updateOne({
            _id: directoryData.insertedId
        }, {
            $set: {
                userId: userData.insertedId
            }
        })
        return res.status(201).json({
            sucess: true,
            message: "succesfully created"
        })
    } catch (err) {
        err.message = "registeration failed"
        next(err)
    }
})

router.post("/login", async (req, res, next) => {
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

})

router.get('/', checkAuth, (req, res) => {
    return res.status(200).json({
        name: req.user.name,
        email: req.user.email
    })
})

router.post("/logout", (req, res) => {
    return res.status(204).clearCookie('uid')
})

export default router;
