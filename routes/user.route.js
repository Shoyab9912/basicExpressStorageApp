import express from "express";

import { writeFile } from "node:fs/promises";

import crypto from 'node:crypto'

import directoryData from "../directoriesDB.json" with {type: "json"}

import userData from "../userDB.json" with {type: "json"}


const router = express.Router();

router.post('/register', async (req, res, next) => {
    
    const { email, password, name } = req.body;

    
    const user = userData.find(u => u.email === email)
 
    if (user) {
        return res.status(409).json({
            message: "user already exists"
        })
    }

    const userId = crypto.randomUUID()
    const dirId = crypto.randomUUID()

    directoryData.push({
        id: dirId,
        parentDirId: null,
        name: `root-${email}`,
        userId,
        files: [],
        directories: []

    })

    userData.push({
        id: userId,
        rootDirId: dirId,
        name,
        email,
        password
    })

    try {

        await writeFile("./userDB.json", JSON.stringify(userData))
        await writeFile('./directoriesDB.json', JSON.stringify(directoryData))
    } catch (error) {
    
        next(error)

    }

})

router.post("/login",(req,res,next) => {
    const {email,password} = req.body;

    if(!email || !password) {
        return res.status(404).json({message:"fill fields"})
    }

    const user = userData.find(u => u.email === email);

    if(!user || user.password !== password) {
        return res.status(404).json({message:"invalid credientials"})
    }

    res.cookie("uid",user.id,{
        httpOnly:true,
        maxAge:60 * 1000 * 60 * 24 * 7
    })

    return res.status(201).json({
        message:'logged in'
    })
})


export default router;
