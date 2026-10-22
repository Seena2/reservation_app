import express from "express";
import path from 'path';

// Create route and invoke http method on the router
const router= express.Router();
const __dirname = import.meta.dirname;

router.get('/', (req,res)=>{
    res.sendFile(path.join(__dirname, '..','views', 'index.html'));
})
export default router