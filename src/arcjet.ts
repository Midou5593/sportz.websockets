import "dotenv/config";

import arcjet,{shield,detectBot,slidingWindow} from "@arcjet/node";
import {Request,Response,NextFunction} from "express";

// this file centralize the security logic

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';


if (!arcjetKey) throw new Error("Invalid arcjetKey or environment variable not set");

export const httpArcjet =  arcjetKey ?
     arcjet({

     key:arcjetKey,
         rules:[
             shield({ mode: arcjetMode}),
             detectBot({mode:arcjetMode, allow:['CATEGORY:SEARCH_ENGINE','CATEGORY:PREVIEW'],}),
             slidingWindow({
                 mode:arcjetMode,
                 interval:'10s',
                 max:50
             })
         ]
     }) :null;


export const wsArcjet =  arcjetKey ?
    arcjet({

        key:arcjetKey,
        rules:[
            shield({ mode: arcjetMode}),
            detectBot({
                mode:arcjetMode,
                allow:['CATEGORY:SEARCH_ENGINE','CATEGORY:PREVIEW'],
            }),
            slidingWindow({
                mode:arcjetMode,
                interval:'2s',
                max:5
            })
        ]

    }) :null;

// security middeleware
export function securityMiddleware(){
    return async (req:Request, res:Response,next:NextFunction) => {
    if (!httpArcjet) return next(new Error());

    try {
        const decision = await httpArcjet.protect(req);

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()){
                return res.status(429).json({
                    error:'Rate limit reached',
                });
            }
            return res.status(403).json({
               error:'Forbidden',
            })
        }
        //next();
    }catch (e) {
        console.error(`Arcjet middleware error: ${e}`);
        return  res.status(503).json({
            error: 'Service Unavailable',
        })
    }
     next();
    }
}