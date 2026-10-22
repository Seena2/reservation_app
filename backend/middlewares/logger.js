import {format} from 'date-fns'
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';
import fs from 'fs/promises'; //manages file systems
import path from 'path';
const __dirname = import.meta.dirname;

/* 
// Generate a random UUID v4
const idV4 = uuidv4();
console.log(idV4);

// Generate a time-ordered UUID v7 (Excellent for database performance)
const idV7 = uuidv7();
console.log(idV7);
*/

// helper function that can be used as middleware
const logEvents= async( message, logFileName)=>{
    const dateTime= `${format(new Date(), 'yyyyMMdd \t HH:mm:ss')}`;
    const logItem= `${dateTime}\t ${uuidv7()}\t${message}\n}`;
    try {
        // check if "logs" folder exist in project root else create it
        if(!fs.access(path.join(__dirname,'..', 'logs'), )){
             await fs.mkdir(path.join(__dirname,'..', 'logs'), { recursive: true });
        }
        await fs.appendFile(path.join(__dirname,'..', 'logs', logFileName), logItem);
    } catch (error) {
        console.log(error);
    }
}
const logger= (req,res, next) =>{
    const msg= `${req.method}\t ${req.url} \t ${req.headers.origin}`
    const filename= 'reqlog.log'
    logEvents( msg, filename )
    console.log(`${req.method} ${req.path}`)
    next(); //moves to the next middleware function comes after this one or controller
}

export { logEvents,logger };

