import {logEvents}  from './logger.js';

const errorHandler = async(err, req,res, next)=>{
 const errorMessage = `${err.name}: ${err.message} \t ${req.method} \t ${req.url} \t ${req.header.origin}`;
 logEvents(errorMessage, 'error.log');
 console.log(err.stack);

 const status = res.statusCode ? res.statusCode : 500; //server error
 res.status(status); //set status code to the response
 res.json({message:err.message});
 next();
}

export{errorHandler}