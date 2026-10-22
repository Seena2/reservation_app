import express from "express";

//Create route instance
const router= express.Router();

// invoke http methods on the router object that use "/users" as base URL
router.route('/').get().post().patch().put().delete();


export default router