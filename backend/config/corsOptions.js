import { allowedOrigins } from "./allowedOrigins.js";

const corsOptions ={
    origin: (origin, callback)=>{
        // check whether the request is from allowed list or desktop app & dev tools like postman
        if(allowedOrigins.indexOf(origin) !== -1 || !origin){
            callback(null, true)
        }else{
            callback(new Error("Not allowed by CORS"))
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}
export {corsOptions}